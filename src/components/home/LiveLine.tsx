import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// The whole Blue Line, Wonderland (north end, in Revere) to Bowdoin (downtown Boston).
const LINE = [
  { id: "place-wondl", name: "Wonderland", short: "Wonderland", revere: true },
  { id: "place-rbmnl", name: "Revere Beach", short: "Revere Beach", revere: true },
  { id: "place-bmmnl", name: "Beachmont", short: "Beachmont", revere: true },
  { id: "place-sdmnl", name: "Suffolk Downs", short: "Suffolk Downs", revere: true },
  { id: "place-orhte", name: "Orient Heights", short: "Orient Hts" },
  { id: "place-wimnl", name: "Wood Island", short: "Wood Is." },
  { id: "place-aport", name: "Airport", short: "Airport" },
  { id: "place-mvbcl", name: "Maverick", short: "Maverick" },
  { id: "place-aqucl", name: "Aquarium", short: "Aquarium" },
  { id: "place-state", name: "State", short: "State" },
  { id: "place-gover", name: "Government Center", short: "Gov't Ctr" },
  { id: "place-bomnl", name: "Bowdoin", short: "Bowdoin" },
];
const IDX = Object.fromEntries(LINE.map((s, i) => [s.id, i]));
const STORE = "revere.station";
const MBTA = "https://api-v3.mbta.com";

type Train = { id: string; dir: 0 | 1; x: number; stopped: boolean; at: string };
export type Station = { id: string; name: string; toBowdoin: number | null; toWonderland: number | null };

function useLive(stationId: string) {
  const [trains, setTrains] = useState<Train[] | null>(null);
  const [deps, setDeps] = useState<{ 0: number[]; 1: number[] } | null>(null);
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
          const i = sid ? IDX[parent[sid]] : undefined;
          if (i == null) continue;
          const dir = t.attributes.direction_id as 0 | 1, st = t.attributes.current_status as string;
          const back = st === "STOPPED_AT" ? 0 : st === "INCOMING_AT" ? 0.25 : 0.55;
          out.push({ id: t.id, dir, stopped: st === "STOPPED_AT", at: LINE[i].name, x: Math.min(LINE.length - 1, Math.max(0, dir === 0 ? i - back : i + back)) });
        }
        const now = Date.now();
        const next = { 0: [] as number[], 1: [] as number[] };
        for (const q of p.data || []) {
          const t = q.attributes.departure_time || q.attributes.arrival_time;
          if (!t) continue;
          const m = Math.round((new Date(t).getTime() - now) / 60e3);
          if (m >= 0) next[q.attributes.direction_id as 0 | 1].push(m);
        }
        if (!alive) return;
        setTrains(out);
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

const stopsWord = (n: number) => (n <= 0 ? "at the platform" : n < 1 ? "pulling in" : `${Math.ceil(n)} stop${Math.ceil(n) === 1 ? "" : "s"} away`);

export default function LiveLine({ alert }: { stations?: Station[]; alert?: string }) {
  const [sel, setSel] = useState<string>(() => { try { return localStorage.getItem(STORE) || "place-rbmnl"; } catch { return "place-rbmnl"; } });
  useEffect(() => { try { localStorage.setItem(STORE, sel); } catch { /* ignore */ } }, [sel]);
  const { trains, deps, asOf } = useLive(sel);
  const reduce = useReducedMotion();
  const si = IDX[sel];
  const station = LINE[si];

  // Nearest train heading toward the chosen station, in each direction.
  const approaching = useMemo(() => {
    const t = trains || [];
    const toBoston = t.filter((x) => x.dir === 0 && x.x <= si).sort((a, b) => b.x - a.x)[0];
    const toRevere = t.filter((x) => x.dir === 1 && x.x >= si).sort((a, b) => a.x - b.x)[0];
    return { 0: toBoston ? { gap: si - toBoston.x, at: toBoston.at, stopped: toBoston.stopped } : null, 1: toRevere ? { gap: toRevere.x - si, at: toRevere.at, stopped: toRevere.stopped } : null };
  }, [trains, si]);

  const pct = (x: number) => `${(x / (LINE.length - 1)) * 100}%`;

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#04121c] text-white" aria-label="Blue Line departures">
      <img src="/images/mbta-blue-line-train-at-wonderland-station.jpg" alt="" aria-hidden loading="lazy"
        className="absolute inset-y-0 right-0 -z-10 h-full w-[60%] object-cover opacity-40 [mask-image:linear-gradient(90deg,transparent,#000_60%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_0%_100%,hsl(199_98%_44%/0.35),transparent_60%)]" />

      <div className="p-5 md:p-8">
        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[13px] text-white/70">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0297DE] opacity-70 motion-reduce:hidden" /><span className="relative h-2 w-2 rounded-full bg-[#0297DE]" /></span>
              Live MBTA departures{asOf ? ` · updated ${asOf.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
            </p>
            <h2 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] md:text-[34px]">Next train from <span className="text-highlight-secondary">{station.name}</span></h2>
          </div>
          <Link to="/mbta" className="text-[14px] font-medium text-white/85 hover:text-white">All stops & buses →</Link>
        </div>

        {/* Station picker */}
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Choose your station">
          {LINE.filter((s) => s.revere).map((s) => (
            <button key={s.id} role="tab" aria-selected={s.id === sel} onClick={() => setSel(s.id)}
              className={cn("relative h-10 rounded-full px-4 text-[14px] font-medium transition-colors", s.id === sel ? "text-[#04121c]" : "bg-white/10 text-white/85 ring-1 ring-white/15 hover:bg-white/20")}>
              {s.id === sel && <motion.span layoutId="station-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{s.name}</span>
            </button>
          ))}
        </div>

        {alert && <p className="mt-4 rounded-2xl bg-[#e5a93b]/15 px-4 py-3 text-[14px] text-[#ffd79a] ring-1 ring-[#e5a93b]/30">⚠ {alert}</p>}

        {/* The two answers */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {([0, 1] as const).map((dir) => {
            const list = deps?.[dir] ?? [];
            const first = list[0];
            const near = approaching[dir];
            const terminus = (dir === 1 && si === 0);
            return (
              <div key={dir} className={cn("rounded-[22px] p-5 ring-1 backdrop-blur-md", dir === 0 ? "bg-[#0297DE]/25 ring-[#0297DE]/40" : "bg-white/[0.07] ring-white/12")}>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-medium">{dir === 0 ? "To Boston" : terminus ? "Arriving from Boston" : "To Wonderland"}</span>
                  <span className="text-white/60">{dir === 0 ? "toward Bowdoin" : terminus ? "end of the line" : "northbound"}</span>
                </div>
                <div className="mt-3 flex min-h-[72px] items-end gap-3">
                  <AnimatePresence mode="popLayout">
                    <motion.div key={first ?? "none"} initial={reduce ? false : { y: 18, opacity: 0, filter: "blur(6px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} exit={{ y: -18, opacity: 0 }}
                      className={cn("figure flex items-baseline gap-2 leading-none", dir === 0 ? "text-highlight-secondary" : "text-white")}>
                      {deps == null ? <span className="text-[56px]">…</span>
                        : first == null ? <span className="text-[44px] text-white/60">No trains</span>
                        : first === 0 ? (
                          <span className="flex items-center gap-3 text-[46px] tracking-[-0.03em]">
                            <span className="relative flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" /><span className="relative h-4 w-4 rounded-full bg-current" /></span>
                            Boarding
                          </span>
                        ) : (<><span className="text-[76px]">{first}</span><span className="font-sans text-[18px] text-white/75">min</span></>)}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Approach timeline: the platform on the left, the next trains closing in */}
                <div className="relative mt-5 h-10" aria-label={list.length ? `Trains in ${list.join(", ")} minutes` : "No trains predicted"}>
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/15" />
                  <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-white" />
                  <span className="absolute -bottom-3 left-0 text-[11px] text-white/60">Platform</span>
                  {[5, 10, 15].map((m) => (
                    <span key={m} className="absolute -bottom-3 -translate-x-1/2 text-[11px] text-white/40" style={{ left: `${(m / 20) * 100}%` }}>{m}</span>
                  ))}
                  <span className="absolute -bottom-3 right-0 text-[11px] text-white/40">20 min</span>
                  {list.map((m, k) => (
                    <motion.span key={k} className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full", dir === 0 ? "bg-highlight-secondary shadow-[0_0_18px_rgba(252,115,77,0.9)]" : "bg-white shadow-[0_0_14px_rgba(255,255,255,0.8)]")}
                      style={{ width: k === 0 ? 18 : 12, height: k === 0 ? 18 : 12, opacity: k === 0 ? 1 : 0.7 }}
                      initial={reduce ? false : { left: "100%" }} animate={{ left: `${Math.min(20, m) / 20 * 100}%` }} transition={{ type: "spring", stiffness: 50, damping: 14, delay: k * 0.08 }}
                      title={m === 0 ? "Boarding" : `${m} min`} />
                  ))}
                </div>
                <p className="mt-6 text-[14px] text-white/80">
                  {list.length > 1 && <span className="text-white">Then {list.slice(1).join(" and ")} min. </span>}
                  {deps == null ? "Checking…" : near ? `The next train is ${stopsWord(near.gap)}${near.gap >= 1 ? `, ${near.stopped ? "at" : "near"} ${near.at}` : ""}.` : first == null ? "No trains predicted right now." : "Train on the way."}
                </p>
              </div>
            );
          })}
        </div>

        {/* One clean track: Boston-bound above, Revere-bound below */}
        <div className="mt-7 overflow-x-auto pb-1">
          <div className="relative mx-10 h-[128px] min-w-[960px]">
            <div className="absolute left-0 right-0 top-[46px] h-[6px] rounded-full bg-[#0297DE]" />
            <div className="absolute top-[38px] h-[22px] rounded-full bg-white/10" style={{ left: `calc(${pct(0)} - 10px)`, width: `calc(${pct(3)} + 20px)` }} aria-hidden />
            {LINE.map((s, i) => (
              <button key={s.id} onClick={() => s.revere && setSel(s.id)} disabled={!s.revere} className="absolute top-[38px] -translate-x-1/2 disabled:cursor-default" style={{ left: pct(i) }} aria-label={s.name}>
                <span className={cn("mx-auto block rounded-full border-[3px] bg-[#04121c] transition-all",
                  s.id === sel ? "h-[22px] w-[22px] border-highlight-secondary ring-4 ring-highlight-secondary/30" : s.revere ? "h-[22px] w-[22px] border-white" : "mt-[4px] h-[14px] w-[14px] border-white/50")} />
                <span className={cn("absolute left-1/2 top-[44px] w-[84px] -translate-x-1/2 text-center text-[12px] leading-tight", s.id === sel ? "font-semibold text-highlight-secondary" : s.revere ? "font-medium text-white" : "text-white/50")}>{s.short}</span>
              </button>
            ))}
            {(trains || []).map((t) => (
              <motion.span key={t.id} className={cn("absolute z-10 h-[12px] w-[12px] -translate-x-1/2 rounded-full", t.dir === 0 ? "top-[22px] bg-highlight-secondary shadow-[0_0_14px_rgba(252,115,77,0.9)]" : "top-[62px] bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]")}
                initial={false} animate={{ left: pct(t.x) }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 40, damping: 16 }}
                title={`${t.dir === 0 ? "To Boston" : "To Wonderland"}, ${t.stopped ? "at" : "near"} ${t.at}`} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-white/75">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-highlight-secondary" />Trains heading to Boston (above the line)</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-white" />Trains heading to Revere (below)</span>
          <span className="ml-auto text-white/55"><span className="md:hidden">Swipe the line · </span>Tap a Revere station to switch</span>
        </div>
      </div>
    </section>
  );
}
