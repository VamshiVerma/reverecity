import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
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
const ROW = 56; // px per station on the vertical (phone) map

export type Station = { id: string; name: string; toBowdoin: number | null; toWonderland: number | null };
type Train = { id: string; dir: 0 | 1; pos: number; stopped: boolean; at: string };
type Dep = { at: number; scheduled: boolean };

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

function useNarrow() {
  const q = "(max-width: 767px)";
  const [n, setN] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const on = () => setN(m.matches); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  return n;
}

function useLive(stationId: string) {
  const [trains, setTrains] = useState<Train[] | null>(null);
  const [deps, setDeps] = useState<{ 0: Dep[]; 1: Dep[] } | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    setDeps(null);
    const load = async () => {
      try {
        const [v, p] = await Promise.all([
          fetch(`${MBTA}/vehicles?filter%5Broute%5D=Blue&include=stop`).then((r) => r.json()),
          fetch(`${MBTA}/predictions?filter%5Bstop%5D=${stationId}&filter%5Broute%5D=Blue&sort=departure_time&page%5Blimit%5D=12`).then((r) => r.json()),
        ]);
        const parent: Record<string, string> = {};
        for (const s of v.included || []) parent[s.id] = s.relationships?.parent_station?.data?.id || s.id;
        const out: Train[] = [];
        for (const t of v.data || []) {
          const sid = t.relationships?.stop?.data?.id;
          const i = sid != null ? IDX[parent[sid]] : undefined;
          if (i == null) continue;
          const dir = t.attributes.direction_id as 0 | 1, st = t.attributes.current_status as string;
          // Direction 0 runs from Wonderland toward Boston (increasing index).
          const back = st === "STOPPED_AT" ? 0 : st === "INCOMING_AT" ? 0.25 : 0.55;
          out.push({ id: t.id, dir, stopped: st === "STOPPED_AT", at: LINE[i].name, pos: Math.max(0, Math.min(N - 1, dir === 0 ? i - back : i + back)) });
        }
        const now = Date.now();
        const next: { 0: Dep[]; 1: Dep[] } = { 0: [], 1: [] };
        for (const q of p.data || []) {
          const t = q.attributes.departure_time || q.attributes.arrival_time;
          if (t && new Date(t).getTime() > now - 30_000) next[q.attributes.direction_id as 0 | 1].push({ at: new Date(t).getTime(), scheduled: false });
        }
        // The end of the line often has no live departure predictions yet: fall back to the timetable.
        for (const dir of [0, 1] as const) {
          if (next[dir].length) continue;
          const hhmm = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
          const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
          const s = await fetch(`${MBTA}/schedules?filter%5Bstop%5D=${stationId}&filter%5Broute%5D=Blue&filter%5Bdirection_id%5D=${dir}&filter%5Bdate%5D=${date}&filter%5Bmin_time%5D=${hhmm}&sort=departure_time&page%5Blimit%5D=3`).then((r) => r.json()).catch(() => ({ data: [] }));
          for (const q of s.data || []) { const t = q.attributes.departure_time; if (t && new Date(t).getTime() > now) next[dir].push({ at: new Date(t).getTime(), scheduled: true }); }
        }
        if (!alive) return;
        setTrains(out);
        next[0].sort((x, y) => x.at - y.at); next[1].sort((x, y) => x.at - y.at);
        setDeps({ 0: next[0].slice(0, 3), 1: next[1].slice(0, 3) });
        setAsOf(new Date());
      } catch { if (alive) { setTrains((t) => t ?? []); setDeps((d) => d ?? { 0: [], 1: [] }); } }
    };
    load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, [stationId]);
  return { trains, deps, asOf };
}

const minsTo = (at: number, now: number) => Math.round((at - now) / 60_000);

export default function LiveLine({ alert }: { stations?: Station[]; alert?: string }) {
  const [sel, setSel] = useState<string>(() => { try { return localStorage.getItem(STORE) || "place-rbmnl"; } catch { return "place-rbmnl"; } });
  useEffect(() => { try { localStorage.setItem(STORE, sel); } catch { /* ignore */ } }, [sel]);
  const { trains, deps, asOf } = useLive(sel);
  const now = useNow();
  const narrow = useNarrow();
  const reduce = useReducedMotion();
  const si = IDX[sel];
  const station = LINE[si];
  const atEnd = si === 0;
  const list = trains ?? [];
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 45, damping: 16 };

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

  const legend = (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-white/65">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-highlight-secondary" />Heading to Boston</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-white" />Heading to Revere</span>
    </div>
  );

  const trainChip = (t: Train) => cn("grid h-[22px] w-[22px] place-items-center rounded-[7px] text-[11px] font-bold",
    t.dir === 0 ? "bg-highlight-secondary text-[#2a0d04] shadow-[0_0_14px_rgba(252,115,77,0.6)]" : "bg-white text-[#04121c] shadow-[0_0_12px_rgba(255,255,255,0.5)]");

  /* ---------- desktop: the line laid out left to right, Wonderland first ---------- */
  const horizontal = (
    <div className="rounded-[22px] bg-black/25 px-6 pb-5 pt-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">{legend}<span className="text-[12px] text-white/50">Continues to Aquarium, State, Gov't Center, Bowdoin →</span></div>
      <div className="relative mx-8 mt-4 h-[118px]">
        {/* Revere stretch */}
        <div className="absolute top-0 h-[86px] rounded-2xl bg-white/[0.05]" style={{ left: "-20px", width: `calc(${(3 / (N - 1)) * 100}% + 40px)` }} aria-hidden />
        <span className="absolute -top-0.5 left-[-12px] text-[11.5px] text-white/50">Revere</span>
        {/* lanes */}
        <div className="absolute left-0 right-0 top-[28px] h-[3px] rounded-full bg-highlight-secondary/40" />
        <div className="absolute left-0 right-0 top-[58px] h-[3px] rounded-full bg-white/30" />
        {LINE.map((s, i) => {
          const mine = s.id === sel;
          return (
            <button key={s.id} onClick={() => s.revere && setSel(s.id)} disabled={!s.revere} className="absolute top-[18px] -translate-x-1/2 disabled:cursor-default" style={{ left: `${(i / (N - 1)) * 100}%` }} aria-label={s.name}>
              <span className={cn("mx-auto block h-[52px] w-[14px] rounded-full border-[3px] bg-[#04121c]", mine ? "border-highlight-secondary" : s.revere ? "border-white" : "border-white/40")} />
              <span className={cn("absolute left-1/2 top-[60px] w-[96px] -translate-x-1/2 text-center text-[12.5px] leading-tight", mine ? "font-semibold text-highlight-secondary" : s.revere ? "font-medium text-white" : "text-white/50")}>{s.name}</span>
            </button>
          );
        })}
        {list.map((t) => (
          <motion.span key={t.id} className={cn("absolute z-10 -translate-x-1/2", trainChip(t))} style={{ top: t.dir === 0 ? 18 : 48 }}
            initial={false} animate={{ left: `${(t.pos / (N - 1)) * 100}%` }} transition={spring} title={`${t.dir === 0 ? "To Boston" : "To Wonderland"}, ${t.stopped ? "at" : "near"} ${t.at}`}>
            {t.dir === 0 ? "→" : "←"}
          </motion.span>
        ))}
      </div>
    </div>
  );

  /* ---------- phone: the same line top to bottom ---------- */
  const vertical = (
    <div className="rounded-[22px] bg-black/25 p-4 ring-1 ring-white/10">
      {legend}
      <div className="relative mt-4" style={{ height: (N - 1) * ROW + 28 }}>
        <div className="absolute left-[20px] top-[14px] w-[3px] rounded-full bg-highlight-secondary/40" style={{ height: (N - 1) * ROW }} />
        <div className="absolute left-[48px] top-[14px] w-[3px] rounded-full bg-white/30" style={{ height: (N - 1) * ROW }} />
        {LINE.map((s, i) => {
          const mine = s.id === sel;
          return (
            <button key={s.id} onClick={() => s.revere && setSel(s.id)} disabled={!s.revere}
              className={cn("absolute inset-x-0 flex h-[28px] items-center rounded-full pl-[70px] pr-3 text-left disabled:cursor-default", mine && "bg-white/[0.10] ring-1 ring-highlight-secondary/60")}
              style={{ top: i * ROW }}>
              <span className={cn("absolute left-[12px] top-1/2 h-[14px] w-[40px] -translate-y-1/2 rounded-full border-[3px] bg-[#04121c]", mine ? "border-highlight-secondary" : s.revere ? "border-white" : "border-white/40")} />
              <span className={cn("truncate text-[14.5px]", mine ? "font-semibold text-highlight-secondary" : s.revere ? "font-medium text-white" : "text-white/50")}>{s.name}</span>
              {mine && <span className="ml-auto shrink-0 text-[12px] text-white/70">Your station</span>}
            </button>
          );
        })}
        {list.map((t) => (
          <motion.span key={t.id} className={cn("absolute z-10 -translate-x-1/2", trainChip(t))} style={{ left: t.dir === 0 ? 21.5 : 49.5 }}
            initial={false} animate={{ top: t.pos * ROW + 3 }} transition={spring}>
            {t.dir === 0 ? "↓" : "↑"}
          </motion.span>
        ))}
      </div>
      <p className="mt-1 text-[12px] text-white/50">Continues to Aquarium, State, Gov't Center, Bowdoin.</p>
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
