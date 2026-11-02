import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// The whole Blue Line, Wonderland (north, in Revere) to Bowdoin (downtown Boston).
const LINE = [
  { id: "place-wondl", name: "Wonderland", revere: true },
  { id: "place-rbmnl", name: "Revere Beach", revere: true },
  { id: "place-bmmnl", name: "Beachmont", revere: true },
  { id: "place-sdmnl", name: "Suffolk Downs", revere: true },
  { id: "place-orhte", name: "Orient Heights" },
  { id: "place-wimnl", name: "Wood Island" },
  { id: "place-aport", name: "Airport" },
  { id: "place-mvbcl", name: "Maverick" },
  { id: "place-aqucl", name: "Aquarium" },
  { id: "place-state", name: "State" },
  { id: "place-gover", name: "Gov't Center" },
  { id: "place-bomnl", name: "Bowdoin" },
];
const IDX = Object.fromEntries(LINE.map((s, i) => [s.id, i]));

type Train = { id: string; dir: 0 | 1; x: number; status: string; at: string };
export type Station = { id: string; name: string; toBowdoin: number | null; toWonderland: number | null };

function useTrains() {
  const [trains, setTrains] = useState<Train[] | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("https://api-v3.mbta.com/vehicles?filter%5Broute%5D=Blue&include=stop");
        const d = await r.json();
        const parent: Record<string, string> = {};
        for (const s of d.included || []) parent[s.id] = s.relationships?.parent_station?.data?.id || s.id;
        const out: Train[] = [];
        for (const v of d.data || []) {
          const sid = v.relationships?.stop?.data?.id;
          const p = sid ? parent[sid] : undefined;
          if (!p || IDX[p] == null) continue;
          const i = IDX[p], dir = v.attributes.direction_id as 0 | 1, st = v.attributes.current_status as string;
          // Direction 0 runs toward Bowdoin (rightward). A train "in transit to" a stop sits between it and the previous one.
          const back = st === "STOPPED_AT" ? 0 : st === "INCOMING_AT" ? 0.25 : 0.55;
          const x = Math.min(LINE.length - 1, Math.max(0, dir === 0 ? i - back : i + back));
          out.push({ id: v.id, dir, x, status: st, at: LINE[i].name });
        }
        if (alive) { setTrains(out); setAsOf(new Date()); }
      } catch { if (alive) setTrains((t) => t ?? []); }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return { trains, asOf };
}

const mins = (m: number | null) => (m == null ? "—" : m <= 0 ? "Now" : `${m}`);

export default function LiveLine({ stations, alert }: { stations?: Station[]; alert?: string }) {
  const { trains, asOf } = useTrains();
  const reduce = useReducedMotion();
  const pct = (x: number) => `${(x / (LINE.length - 1)) * 100}%`;
  const inRevere = useMemo(() => (trains || []).filter((t) => t.x <= 3.6).length, [trains]);
  const toBoston = (trains || []).filter((t) => t.dir === 0).length;
  const toRevere = (trains || []).filter((t) => t.dir === 1).length;

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#04121c] text-white" aria-label="Live Blue Line">
      {/* Photo of the line at Wonderland, fading into the panel */}
      <img src="/images/mbta-blue-line-train-at-wonderland-station.jpg" alt="A Blue Line train arriving at Wonderland station" loading="lazy"
        className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] object-cover opacity-45 [mask-image:linear-gradient(90deg,transparent,#000_55%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_0%_100%,hsl(199_98%_44%/0.35),transparent_60%)]" />

      <div className="p-5 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[13px] text-white/70">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0297DE] opacity-70 motion-reduce:hidden" /><span className="relative h-2 w-2 rounded-full bg-[#0297DE]" /></span>
              Live from the MBTA{asOf ? ` · ${asOf.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : ""}
            </p>
            <h2 className="mt-1 font-serif-display text-[34px] leading-none md:text-[44px]">The Blue Line, <em className="italic text-highlight-secondary">right now</em></h2>
          </div>
          <dl className="flex gap-6 text-right">
            <div><dt className="text-[12px] text-white/60">Trains running</dt><dd className="tnum font-serif-display text-[32px] leading-none">{trains ? trains.length : "—"}</dd></div>
            <div><dt className="text-[12px] text-white/60">In Revere</dt><dd className="tnum font-serif-display text-[32px] leading-none text-highlight-secondary">{trains ? inRevere : "—"}</dd></div>
          </dl>
        </div>

        {alert && <p className="mt-4 rounded-2xl bg-[#e5a93b]/15 px-4 py-3 text-[14px] text-[#ffd79a] ring-1 ring-[#e5a93b]/30">{alert}</p>}

        {/* The map */}
        <div className="relative mt-10 overflow-x-auto pb-2">
          <div className="relative mx-12 h-[170px] min-w-[760px]">
            {/* Revere segment highlight */}
            <div className="absolute top-[56px] h-[58px] rounded-2xl bg-white/[0.06] ring-1 ring-white/10" style={{ left: `calc(${pct(0)} - 18px)`, width: `calc(${pct(3)} + 36px)` }} />
            <span className="absolute top-[30px] text-[12px] font-medium text-highlight-secondary" style={{ left: `calc(${pct(0)} - 14px)` }}>Revere stations</span>

            {/* Two tracks: toward Boston above, toward Revere below */}
            {[70, 100].map((y, k) => (
              <div key={y} className="absolute left-0 right-0 h-[4px] rounded-full" style={{ top: y, background: k === 0 ? "#0297DE" : "hsl(199 98% 44% / 0.45)" }} />
            ))}
            <span className="absolute -top-0 right-0 text-[12px] text-white/55">To Boston →</span>
            <span className="absolute left-0 top-[136px] hidden text-[12px] text-white/55">← To Revere</span>

            {/* Stations */}
            {LINE.map((s, i) => (
              <div key={s.id} className="absolute top-[64px] -translate-x-1/2" style={{ left: pct(i) }}>
                <div className={cn("mx-auto h-[46px] w-[16px] rounded-full border-[3px] bg-[#04121c]", s.revere ? "border-white" : "border-white/45")} />
                <div className={cn("mt-2 w-[76px] text-center text-[12px] leading-tight", s.revere ? "font-medium text-white" : "text-white/55")}>{s.name}</div>
              </div>
            ))}

            {/* Trains */}
            {(trains || []).map((t) => (
              <motion.div key={t.id} className="absolute z-10 -translate-x-1/2" style={{ top: t.dir === 0 ? 58 : 88 }}
                initial={false} animate={{ left: pct(t.x) }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 40, damping: 16 }}
                title={`${t.dir === 0 ? "Toward Bowdoin" : "Toward Wonderland"} · ${t.status === "STOPPED_AT" ? "at" : "approaching"} ${t.at}`}>
                <span className={cn("flex h-[28px] items-center gap-1 rounded-full px-2 text-[11px] font-semibold shadow-[0_0_20px_rgba(252,115,77,0.55)]",
                  t.dir === 0 ? "bg-highlight-secondary text-[#2a0d04]" : "bg-white text-[#04121c]")}>
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden><rect x="2" y="2" width="12" height="10" rx="3" fill="currentColor" /><circle cx="5.5" cy="9" r="1.2" fill="#fff" /><circle cx="10.5" cy="9" r="1.2" fill="#fff" /><path d="M4 14l1.5-2M12 14l-1.5-2" stroke="currentColor" strokeWidth="1.4" /></svg>
                  {t.dir === 0 ? "→" : "←"}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-white/70">
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-full bg-highlight-secondary" />{toBoston} heading to Boston</span>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-full bg-white" />{toRevere} heading to Revere</span>
        </div>

        {/* Departure boards for Revere's stations */}
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {(stations ?? LINE.slice(0, 4).map((s) => ({ ...s, toBowdoin: null, toWonderland: null }))).map((s, i) => (
            <div key={s.id} className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <div className="text-[14px] font-medium">{s.name}</div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[11.5px] text-white/60">To Boston</div>
                  <div className="tnum font-serif-display text-[30px] leading-none text-highlight-secondary">{stations ? mins(s.toBowdoin) : "…"}<span className="ml-0.5 font-sans text-[12px] text-white/60">{s.toBowdoin != null && s.toBowdoin > 0 ? "min" : ""}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[11.5px] text-white/60">{i === 0 ? "Arriving" : "To Wonderland"}</div>
                  <div className="tnum font-serif-display text-[22px] leading-none">{stations ? mins(s.toWonderland) : "…"}<span className="ml-0.5 font-sans text-[11px] text-white/60">{s.toWonderland != null && s.toWonderland > 0 ? "min" : ""}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/70">
          <span>Buses through Revere</span>
          {["110", "116", "117", "119", "411", "426", "450"].map((r) => <span key={r} className="tnum rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white">{r}</span>)}
          <Link to="/mbta" className="ml-auto font-medium text-white hover:underline">All live times →</Link>
        </div>
      </div>
    </section>
  );
}
