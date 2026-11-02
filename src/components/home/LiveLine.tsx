import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// The Blue Line from Wonderland (north end, in Revere) toward downtown Boston.
const LINE = [
  { id: "place-wondl", name: "Wonderland", revere: true },
  { id: "place-rbmnl", name: "Revere Beach", revere: true },
  { id: "place-bmmnl", name: "Beachmont", revere: true },
  { id: "place-sdmnl", name: "Suffolk Downs", revere: true },
  { id: "place-orhte", name: "Orient Heights" },
  { id: "place-wimnl", name: "Wood Island" },
  { id: "place-aport", name: "Airport" },
  { id: "place-mvbcl", name: "Maverick" },
];
const N = LINE.length;
const IDX = Object.fromEntries(LINE.map((s, i) => [s.id, i]));
const STORE = "revere.station";
const MBTA = "https://api-v3.mbta.com";
const HOP_SEC = 110; // typical seconds between neighbouring stations
const ROW = 56;      // px per station on the vertical (phone) map

export type Station = { id: string; name: string; toBowdoin: number | null; toWonderland: number | null };
type Vehicle = { id: string; trip: string; dir: 0 | 1; idx: number; stopped: boolean; eta: number | null };
type Dep = { at: number; scheduled: boolean; trip?: string };

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}
function useNarrow() {
  const q = "(max-width: 767px)";
  const [n, setN] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const on = () => setN(m.matches); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  return n;
}

function useLive(stationId: string) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [deps, setDeps] = useState<{ 0: Dep[]; 1: Dep[] } | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    setDeps(null);
    const load = async () => {
      try {
        const [v, p] = await Promise.all([
          fetch(`${MBTA}/vehicles?filter%5Broute%5D=Blue&include=stop`).then((r) => r.json()),
          fetch(`${MBTA}/predictions?filter%5Broute%5D=Blue&include=stop&page%5Blimit%5D=250`).then((r) => r.json()),
        ]);
        const parent: Record<string, string> = {};
        for (const s of [...(v.included || []), ...(p.included || [])]) parent[s.id] = s.relationships?.parent_station?.data?.id || s.id;
        // trip -> parent stop -> arrival time
        const eta: Record<string, Record<string, number>> = {};
        const here: { 0: Dep[]; 1: Dep[] } = { 0: [], 1: [] };
        const now = Date.now();
        for (const q of p.data || []) {
          const trip = q.relationships?.trip?.data?.id, stop = parent[q.relationships?.stop?.data?.id];
          const t = q.attributes.arrival_time || q.attributes.departure_time;
          if (!trip || !stop || !t) continue;
          const at = new Date(t).getTime();
          (eta[trip] ||= {})[stop] = at;
          if (stop === stationId && at > now - 30_000) {
            const dep = q.attributes.departure_time ? new Date(q.attributes.departure_time).getTime() : at;
            here[q.attributes.direction_id as 0 | 1].push({ at: dep, scheduled: false, trip });
          }
        }
        const out: Vehicle[] = [];
        for (const x of v.data || []) {
          const sid = x.relationships?.stop?.data?.id;
          const stop = sid ? parent[sid] : undefined;
          if (!stop || IDX[stop] == null) continue;
          const trip = x.relationships?.trip?.data?.id || "";
          out.push({ id: x.id, trip, dir: x.attributes.direction_id, idx: IDX[stop], stopped: x.attributes.current_status === "STOPPED_AT", eta: eta[trip]?.[stop] ?? null });
        }
        // End of the line often has no live departures yet: use the timetable, clearly labelled.
        for (const dir of [0, 1] as const) {
          if (here[dir].length) continue;
          const hhmm = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
          const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
          const s = await fetch(`${MBTA}/schedules?filter%5Bstop%5D=${stationId}&filter%5Broute%5D=Blue&filter%5Bdirection_id%5D=${dir}&filter%5Bdate%5D=${date}&filter%5Bmin_time%5D=${hhmm}&sort=departure_time&page%5Blimit%5D=3`).then((r) => r.json()).catch(() => ({ data: [] }));
          for (const q of s.data || []) { const t = q.attributes.departure_time; if (t && new Date(t).getTime() > now) here[dir].push({ at: new Date(t).getTime(), scheduled: true }); }
        }
        here[0].sort((a, b) => a.at - b.at); here[1].sort((a, b) => a.at - b.at);
        if (!alive) return;
        setVehicles(out);
        setDeps({ 0: here[0].slice(0, 3), 1: here[1].slice(0, 3) });
        setAsOf(new Date());
      } catch { if (alive) { setVehicles((t) => t ?? []); setDeps((d) => d ?? { 0: [], 1: [] }); } }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, [stationId]);
  return { vehicles, deps, asOf };
}

const minsTo = (at: number, now: number) => Math.round((at - now) / 60_000);

export default function LiveLine({ alert }: { stations?: Station[]; alert?: string }) {
  const [sel, setSel] = useState<string>(() => { try { return localStorage.getItem(STORE) || "place-rbmnl"; } catch { return "place-rbmnl"; } });
  useEffect(() => { try { localStorage.setItem(STORE, sel); } catch { /* ignore */ } }, [sel]);
  const { vehicles, deps, asOf } = useLive(sel);
  const now = useNow(1000);
  const narrow = useNarrow();
  const si = IDX[sel];
  const station = LINE[si];
  const atEnd = si === 0;

  // Where each train is right now, recomputed every second from its predicted arrival at the next station.
  const trains = useMemo(() => (vehicles || []).map((v) => {
    let pos = v.idx;
    if (!v.stopped) {
      const left = v.eta != null ? Math.max(0, (v.eta - now) / 1000) : HOP_SEC * 0.5;
      const frac = Math.min(1, left / HOP_SEC);
      pos = v.dir === 0 ? v.idx - frac : v.idx + frac;
    }
    return { ...v, pos: Math.max(-0.15, Math.min(N - 1 + 0.15, pos)) };
  }), [vehicles, now]);

  // Which train is the next one into my station, each way, and how long until it arrives.
  const nextTag = useMemo(() => {
    const tag: Record<string, string> = {};
    for (const dir of [0, 1] as const) {
      const d = deps?.[dir]?.find((x) => !x.scheduled && x.at > now - 20_000);
      if (!d?.trip) continue;
      const v = trains.find((t) => t.trip === d.trip);
      if (v) { const m = minsTo(d.at, now); tag[v.id] = m <= 0 ? "Boarding" : `${m} min`; }
    }
    return tag;
  }, [deps, trains, now]);

  const Card = ({ dir }: { dir: 0 | 1 }) => {
    const ds = (deps?.[dir] ?? []).filter((d) => d.at > now - 30_000);
    const first = ds[0];
    const m = first ? minsTo(first.at, now) : null;
    return (
      <div className="rounded-[20px] bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur-md md:p-5">
        <div className="flex items-center gap-2 text-[14px]">
          <span className={cn("h-2.5 w-2.5 rounded-full", dir === 0 ? "bg-highlight-secondary" : "bg-white")} />
          <span className="font-medium">{dir === 0 ? "To Boston" : atEnd ? "Arriving from Boston" : "To Wonderland"}</span>
          {first?.scheduled && <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] text-white/75">Timetable</span>}
        </div>
        <div className="mt-2 flex min-h-[56px] items-baseline gap-2">
          {deps == null ? <span className="figure text-[44px] leading-none text-white/50">…</span>
            : m == null ? <span className="self-center text-[17px] text-white/70">No more trains listed today</span>
            : m <= 0 ? <span className={cn("figure text-[44px] leading-none", dir === 0 ? "text-highlight-secondary" : "text-white")}>Boarding</span>
            : <><span className={cn("figure text-[56px] leading-none", dir === 0 ? "text-highlight-secondary" : "text-white")}>{m}</span><span className="text-[16px] text-white/70">min</span></>}
        </div>
        {ds.length > 1 && <p className="mt-1 text-[14px] text-white/75">Then {ds.slice(1).map((d) => Math.max(1, minsTo(d.at, now))).join(" and ")} min</p>}
        {first?.scheduled && <p className="mt-1 text-[12.5px] text-white/55">No live prediction yet, so this is the scheduled time.</p>}
      </div>
    );
  };

  const pill = (dir: 0 | 1) => cn("flex h-[20px] items-center gap-[3px] rounded-full px-[6px]",
    dir === 0 ? "bg-highlight-secondary shadow-[0_0_18px_rgba(252,115,77,0.55)]" : "bg-white shadow-[0_0_14px_rgba(255,255,255,0.45)]");
  const windows = (dir: 0 | 1) => [0, 1, 2].map((w) => <span key={w} className={cn("h-[7px] w-[7px] rounded-[2px]", dir === 0 ? "bg-[#2a0d04]/70" : "bg-[#04121c]/60")} />);
  const tagCls = (dir: 0 | 1) => cn("figure whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold tracking-[-0.01em]", dir === 0 ? "bg-highlight-secondary text-[#2a0d04]" : "bg-white text-[#04121c]");

  /* ---------- desktop: one line, left to right; Boston-bound above, Revere-bound below ---------- */
  const horizontal = (
    <div className="rounded-[22px] bg-black/25 px-6 pb-4 pt-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between text-[12.5px] text-white/60">
        <span className="flex items-center gap-2"><span className="h-2.5 w-4 rounded-full bg-highlight-secondary" />Above the line: heading to Boston →</span>
        <span className="flex items-center gap-2">← Below the line: heading to Revere<span className="h-2.5 w-4 rounded-full bg-white" /></span>
      </div>
      <div className="relative mx-10 mt-3 h-[178px]">
        {/* the line */}
        <div className="absolute left-[-24px] right-[-24px] top-[70px] h-[6px] rounded-full bg-[#0297DE]" />
        {/* Revere stretch */}
        <div className="absolute top-[60px] h-[26px] rounded-full bg-white/[0.06]" style={{ left: "-14px", width: `calc(${(3 / (N - 1)) * 100}% + 28px)` }} aria-hidden />
        {LINE.map((s, i) => {
          const mine = s.id === sel;
          return (
            <button key={s.id} onClick={() => s.revere && setSel(s.id)} disabled={!s.revere}
              className="absolute top-[62px] -translate-x-1/2 disabled:cursor-default" style={{ left: `${(i / (N - 1)) * 100}%` }} aria-label={s.name}>
              <span className={cn("mx-auto block rounded-full border-[4px] bg-[#04121c]", mine ? "h-[22px] w-[22px] border-highlight-secondary" : s.revere ? "h-[22px] w-[22px] border-white" : "h-[18px] w-[18px] border-white/45")} />
              <span className={cn("absolute left-1/2 top-[68px] w-[104px] -translate-x-1/2 text-center text-[13px] leading-tight", mine ? "font-semibold text-highlight-secondary" : s.revere ? "font-medium text-white" : "text-white/50")}>
                {s.name}{mine && <span className="mt-0.5 block text-[11.5px] font-normal text-white/60">Your station</span>}
              </span>
            </button>
          );
        })}
        {trains.map((t) => (
          <div key={t.id} className="absolute z-10 -translate-x-1/2 transition-[left] duration-1000 ease-linear motion-reduce:transition-none"
            style={{ left: `${(t.pos / (N - 1)) * 100}%`, top: t.dir === 0 ? 34 : 98 }}>
            <div className={cn(pill(t.dir), t.dir === 1 && "flex-row-reverse")}>
              {windows(t.dir)}<span className={cn("text-[10px] font-black", t.dir === 0 ? "text-[#2a0d04]" : "text-[#04121c]")}>{t.dir === 0 ? "›" : "‹"}</span>
            </div>
            {nextTag[t.id] && <div className={cn("absolute", t.dir === 0 ? "-top-[24px] left-1/2 -translate-x-1/2" : "left-full top-1/2 ml-1.5 -translate-y-1/2", tagCls(t.dir))}>{nextTag[t.id]}</div>}
          </div>
        ))}
      </div>
      <p className="text-right text-[12px] text-white/45">Continues to Aquarium, State, Government Center and Bowdoin</p>
    </div>
  );

  /* ---------- phone: the same line, top to bottom ---------- */
  const vertical = (
    <div className="rounded-[22px] bg-black/25 p-4 ring-1 ring-white/10">
      <div className="flex justify-between text-[12px] text-white/60">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-highlight-secondary" />↓ to Boston</span>
        <span className="flex items-center gap-1.5">to Revere ↑<span className="h-2.5 w-2.5 rounded-full bg-white" /></span>
      </div>
      <div className="relative mt-4" style={{ height: (N - 1) * ROW + 30 }}>
        <div className="absolute left-[44px] top-[8px] w-[6px] rounded-full bg-[#0297DE]" style={{ height: (N - 1) * ROW + 12 }} />
        {LINE.map((s, i) => {
          const mine = s.id === sel;
          return (
            <button key={s.id} onClick={() => s.revere && setSel(s.id)} disabled={!s.revere}
              className={cn("absolute inset-x-0 flex h-[28px] items-center rounded-full pl-[104px] pr-3 text-left disabled:cursor-default", mine && "bg-white/[0.10] ring-1 ring-highlight-secondary/60")}
              style={{ top: i * ROW }}>
              <span className={cn("absolute left-[47px] top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] bg-[#04121c]", mine ? "h-[20px] w-[20px] border-highlight-secondary" : s.revere ? "h-[20px] w-[20px] border-white" : "h-[16px] w-[16px] border-white/45")} />
              <span className={cn("truncate text-[14.5px]", mine ? "font-semibold text-highlight-secondary" : s.revere ? "font-medium text-white" : "text-white/50")}>{s.name}</span>
              {mine && <span className="ml-auto shrink-0 text-[12px] text-white/70">Your station</span>}
            </button>
          );
        })}
        {trains.map((t) => (
          <div key={t.id} className="absolute z-10 -translate-y-1/2 transition-[top] duration-1000 ease-linear motion-reduce:transition-none"
            style={{ top: t.pos * ROW + 14, left: t.dir === 0 ? 8 : 62 }}>
            <div className={cn(pill(t.dir), "h-[18px] w-[28px] justify-center")}>
              <span className={cn("text-[10px] font-black", t.dir === 0 ? "text-[#2a0d04]" : "text-[#04121c]")}>{t.dir === 0 ? "↓" : "↑"}</span>
            </div>
            
          </div>
        ))}
      </div>
      <p className="mt-1 text-[12px] text-white/45">Continues to Aquarium, State, Government Center and Bowdoin</p>
    </div>
  );

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#04121c] text-white" aria-label="Blue Line, live">
      <img src="/images/mbta-blue-line-train-at-wonderland-station.jpg" alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(4,18,28,0.6),rgba(4,18,28,0.88)_45%,rgba(4,18,28,0.97))]" />

      <div className="p-5 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[13px] text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#0297DE]" />
              Blue Line, live{asOf ? ` · updated ${asOf.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
            </p>
            <h2 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] md:text-[34px]">Next trains at <span className="text-highlight-secondary">{station.name}</span></h2>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose your station">
            {LINE.filter((s) => s.revere).map((s) => (
              <button key={s.id} role="tab" aria-selected={s.id === sel} onClick={() => setSel(s.id)}
                className={cn("relative h-10 rounded-full px-4 text-[14px] font-medium transition-colors", s.id === sel ? "text-[#04121c]" : "bg-white/10 text-white/85 ring-1 ring-white/15 hover:bg-white/20")}>
                {s.id === sel && <motion.span layoutId="station-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {alert && <p className="mt-4 rounded-2xl bg-[#e5a93b]/15 px-4 py-3 text-[14px] text-[#ffd79a] ring-1 ring-[#e5a93b]/30">⚠ {alert}</p>}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Card dir={0} />
          <Card dir={1} />
        </div>

        <div className="mt-3">{narrow ? vertical : horizontal}</div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-white/70">
          <span>Buses through Revere</span>
          {["110", "116", "117", "119", "411", "426", "450"].map((r) => <span key={r} className="tnum rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white">{r}</span>)}
          <Link to="/mbta" className="ml-auto font-medium text-white hover:underline">All stops & buses →</Link>
        </div>
      </div>
    </section>
  );
}
