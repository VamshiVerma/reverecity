import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// The Blue Line north to south. Revere's four stations come first.
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
const STORE = "revere.station";
const MBTA = "https://api-v3.mbta.com";
const SPAN_WIDE = 16; // minutes shown on each side of the platform
const SPAN_NARROW = 8;
const HOP = 2;   // typical minutes between neighbouring stations

export type Station = { id: string; name: string; toBowdoin: number | null; toWonderland: number | null };
type Arrival = { id: string; dir: 0 | 1; at: number };

function useArrivals(stationId: string) {
  const [arrivals, setArrivals] = useState<Arrival[] | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  useEffect(() => {
    let alive = true;
    setArrivals(null);
    const load = async () => {
      try {
        const p = await fetch(`${MBTA}/predictions?filter%5Bstop%5D=${stationId}&filter%5Broute%5D=Blue&sort=departure_time&page%5Blimit%5D=12`).then((r) => r.json());
        const out: Arrival[] = [];
        for (const q of p.data || []) {
          const t = q.attributes.arrival_time || q.attributes.departure_time;
          if (!t) continue;
          out.push({ id: q.relationships?.trip?.data?.id || q.id, dir: q.attributes.direction_id, at: new Date(t).getTime() });
        }
        if (alive) { setArrivals(out); setAsOf(new Date()); }
      } catch { if (alive) setArrivals((a) => a ?? []); }
    };
    load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, [stationId]);
  return { arrivals, asOf };
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

const label = (sec: number) => (sec <= 30 ? "Boarding" : sec < 90 ? "1 min" : `${Math.round(sec / 60)} min`);

export default function LiveLine({ alert }: { stations?: Station[]; alert?: string }) {
  const [sel, setSel] = useState<string>(() => { try { return localStorage.getItem(STORE) || "place-rbmnl"; } catch { return "place-rbmnl"; } });
  useEffect(() => { try { localStorage.setItem(STORE, sel); } catch { /* ignore */ } }, [sel]);
  const { arrivals, asOf } = useArrivals(sel);
  const now = useNow();
  const reduce = useReducedMotion();
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const SPAN = narrow ? SPAN_NARROW : SPAN_WIDE;
  const si = LINE.findIndex((s) => s.id === sel);
  const station = LINE[si];

  // Seconds until each train reaches this platform; trains that just left stay briefly so they visibly pull away.
  const trains = useMemo(() => (arrivals || [])
    .map((a) => ({ ...a, sec: (a.at - now) / 1000 }))
    .filter((a) => a.sec > -40 && a.sec < SPAN * 60)
    .sort((a, b) => a.sec - b.sec), [arrivals, now, SPAN]);
  const next = (dir: 0 | 1) => trains.filter((t) => t.dir === dir && t.sec > -20);

  // Boston-bound trains come from the north (left); Wonderland-bound from the south (right).
  const xFor = (dir: 0 | 1, sec: number) => {
    const m = Math.max(-1, Math.min(SPAN, sec / 60));
    return dir === 0 ? 50 - (m / SPAN) * 50 : 50 + (m / SPAN) * 50;
  };
  const ticks = LINE.map((s, i) => ({ ...s, off: (i - si) * HOP })).filter((s) => s.off !== 0 && Math.abs(s.off) <= SPAN - 1);

  const summary = (dir: 0 | 1) => {
    const l = next(dir);
    if (arrivals == null) return "Checking…";
    if (!l.length) return dir === 1 && si === 0 ? "End of the line" : "No trains predicted right now";
    const [a, ...rest] = l;
    return `${a.sec <= 30 ? "Boarding now" : `In ${label(a.sec)}`}${rest.length ? ` · then ${rest.slice(0, 2).map((r) => Math.max(1, Math.round(r.sec / 60))).join(", ")} min` : ""}`;
  };

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#04121c] text-white" aria-label="Blue Line, live">
      <img src="/images/mbta-blue-line-train-at-wonderland-station.jpg" alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(4,18,28,0.55),rgba(4,18,28,0.85)_55%,rgba(4,18,28,0.97))]" />

      <div className="p-5 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[13px] text-white/70">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0297DE] opacity-70 motion-reduce:hidden" /><span className="relative h-2 w-2 rounded-full bg-[#0297DE]" /></span>
              Blue Line, live{asOf ? ` · MBTA ${asOf.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
            </p>
            <h2 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] md:text-[34px]">Trains coming to <span className="text-highlight-secondary">{station.name}</span></h2>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose your station">
            {LINE.filter((s) => s.revere).map((s) => (
              <button key={s.id} role="tab" aria-selected={s.id === sel} onClick={() => setSel(s.id)}
                className={cn("relative h-9 rounded-full px-3.5 text-[13.5px] font-medium transition-colors", s.id === sel ? "text-[#04121c]" : "bg-white/10 text-white/85 ring-1 ring-white/15 hover:bg-white/20")}>
                {s.id === sel && <motion.span layoutId="station-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {alert && <p className="mt-4 rounded-2xl bg-[#e5a93b]/15 px-4 py-3 text-[14px] text-[#ffd79a] ring-1 ring-[#e5a93b]/30">⚠ {alert}</p>}

        {/* Approach view: your platform in the middle, trains gliding in second by second */}
        <div className="relative mt-8 h-[230px] select-none md:h-[250px]" role="img" aria-label={`To Boston: ${summary(0)}. To Wonderland: ${summary(1)}.`}>
          <div className="absolute left-0 top-0 text-[13px] text-white/70">From Wonderland <span className="text-highlight-secondary">→ to Boston</span></div>
          <div className="absolute bottom-0 right-0 text-right text-[13px] text-white/70"><span className="text-white">to Wonderland ←</span> from Boston</div>

          {[{ top: "38%", c: "bg-highlight-secondary" }, { top: "62%", c: "bg-white" }].map((t, k) => (
            <div key={k} className="absolute left-0 right-0 h-[3px] -translate-y-1/2 overflow-hidden rounded-full" style={{ top: t.top }}>
              <div className={cn("h-full w-full opacity-30", t.c)} />
              {!reduce && <div className={cn("absolute inset-0", k === 0 ? "track-flow-right" : "track-flow-left")} />}
            </div>
          ))}

          {ticks.map((s) => (
            <div key={s.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${50 + (s.off / SPAN) * 50}%` }}>
              <div className="mx-auto h-[58px] w-[2px] rounded-full bg-white/25" />
              <div className={cn("absolute left-1/2 top-[64px] w-[90px] -translate-x-1/2 text-center text-[11.5px] leading-tight", narrow ? "hidden" : "", s.revere ? "text-white/80" : "text-white/45")}>{s.name}</div>
            </div>
          ))}

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative h-[92px] w-[10px] rounded-full bg-white shadow-[0_0_30px_rgba(255,255,255,0.45)]">
              {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
            </div>
            <div className="absolute left-1/2 top-[100px] w-[150px] -translate-x-1/2 text-center text-[13px] font-semibold">You<span className="hidden md:inline"> · {station.name}</span></div>
          </div>

          {trains.map((t) => {
            const first = next(t.dir)[0]?.id === t.id;
            const docked = t.sec <= 30 && t.sec > -20;
            return (
              <motion.div key={t.id + t.dir} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ top: t.dir === 0 ? "38%" : "62%" }}
                initial={false} animate={{ left: `${xFor(t.dir, t.sec)}%`, opacity: t.sec < -20 ? 0 : 1 }} transition={{ duration: reduce ? 0 : 1, ease: "linear" }}>
                <div className={cn("relative flex h-[22px] items-center gap-[3px] rounded-full px-[7px]",
                  t.dir === 0 ? "bg-highlight-secondary shadow-[0_0_24px_rgba(252,115,77,0.85)]" : "flex-row-reverse bg-white shadow-[0_0_20px_rgba(255,255,255,0.7)]",
                  first ? "w-[64px]" : "w-[46px] opacity-75")}>
                  {Array.from({ length: first ? 4 : 3 }).map((_, w) => <span key={w} className={cn("h-[8px] flex-1 rounded-[3px]", t.dir === 0 ? "bg-[#2a0d04]/70" : "bg-[#04121c]/60")} />)}
                  {docked && !reduce && <span className={cn("absolute -inset-2 animate-ping rounded-full", t.dir === 0 ? "bg-highlight-secondary/30" : "bg-white/25")} />}
                </div>
                {first && (
                  <div className={cn("figure absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold tracking-[-0.01em]",
                    t.dir === 0 ? "-top-[38px] bg-highlight-secondary text-[#2a0d04]" : "top-[30px] bg-white text-[#04121c]")}>
                    {label(t.sec)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {narrow && (
          <p className="mt-3 flex justify-between text-[12px] text-white/60">
            <span>{si > 0 ? `← ${LINE[si - 1].name}` : "End of the line"}</span>
            <span>{si < LINE.length - 1 ? `${LINE[si + 1].name} →` : ""}</span>
          </p>
        )}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {([0, 1] as const).map((dir) => {
            const a = next(dir)[0];
            return (
              <div key={dir} className="flex items-center gap-4 rounded-[20px] bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur-md">
                <span className={cn("h-10 w-1.5 shrink-0 rounded-full", dir === 0 ? "bg-highlight-secondary" : "bg-white")} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-white/65">{dir === 0 ? "To Boston (Bowdoin)" : "To Wonderland"}</div>
                  <div className="text-[15px] font-medium leading-snug md:truncate md:text-[17px]">{summary(dir)}</div>
                </div>
                <div className={cn("figure shrink-0 text-[32px] leading-none md:text-[40px]", dir === 0 ? "text-highlight-secondary" : "text-white")}>
                  {a ? (a.sec <= 30 ? "Now" : Math.max(1, Math.round(a.sec / 60))) : "—"}
                  {a && a.sec > 30 && <span className="ml-1 font-sans text-[14px] tracking-normal text-white/60">min</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/70">
          <span>Buses through Revere</span>
          {["110", "116", "117", "119", "411", "426", "450"].map((r) => <span key={r} className="tnum rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white">{r}</span>)}
          <Link to="/mbta" className="ml-auto font-medium text-white hover:underline">All stops & buses →</Link>
        </div>
      </div>
    </section>
  );
}
