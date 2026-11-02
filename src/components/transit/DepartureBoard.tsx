import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { REVERE_STATIONS, Train, clock, minsUntil, useNow } from "./mbta";
import { FeedDown, FeedStatus } from "./ui";

const dueLabel = (sec: number, now: number, at: number, arrival: boolean) =>
  sec <= 30 ? (arrival ? "Arriving" : "Boarding") : sec >= 3600 ? clock(at) : `${minsUntil(at, now)} min`;

function Row({ dir, trains, now, endOfLine }: { dir: 0 | 1; trains: Train[]; now: number; endOfLine?: boolean }) {
  const [first, ...rest] = trains;
  const sec = first ? (first.at - now) / 1000 : 0;
  const big = first ? dueLabel(sec, now, first.at, !!endOfLine) : null;
  const isWord = big === "Boarding" || big === "Arriving";
  const label = dir === 0 ? "To Boston (Bowdoin)" : endOfLine ? "Arriving from Boston" : "To Wonderland";
  return (
    <div className="grid grid-cols-[6px_1fr_auto] items-center gap-x-3 py-3">
      <span className={cn("h-full min-h-[44px] rounded-full", dir === 0 ? "bg-highlight-secondary" : "bg-white")} aria-hidden />
      <div className="min-w-0">
        <div className="text-[13px] text-white/70">{label}</div>
        <div className="mt-0.5 text-[13px] leading-snug text-white/60">
          {first ? (
            <>
              {isWord ? (endOfLine ? "Pulling in now" : "Doors open now") : `${endOfLine ? "Arrives" : "Leaves"} ${clock(first.at)}`}
              {rest.length > 0 && <> · then <span className="figure text-[13.5px] tracking-normal text-white/85">{rest.map((r) => minsUntil(r.at, now)).join(", ")}</span> min</>}
            </>
          ) : endOfLine ? "No trains on the way right now" : "No trains predicted right now"}
        </div>
      </div>
      <div className={cn("figure shrink-0 text-right leading-none", dir === 0 ? "text-highlight-secondary" : "text-white", isWord ? "text-[22px] tracking-[-0.02em]" : "text-[30px] md:text-[34px]")}>
        {big ? (big.endsWith(" min") ? <>{big.slice(0, -4)}<span className="ml-1 font-sans text-[14px] tracking-normal text-white/60">min</span></> : big) : <span className="text-[22px] text-white/40">None</span>}
      </div>
    </div>
  );
}

export default function DepartureBoard({ trains, error, asOf }: { trains: Train[] | null; error: string | null; asOf: Date | null }) {
  const now = useNow();
  const reduce = useReducedMotion();
  const upcoming = (station: string, dir: 0 | 1) => (trains ?? []).filter((t) => t.station === station && t.dir === dir && t.at - now > -15_000).slice(0, 3);

  return (
    <section id="trains" aria-labelledby="trains-h" className="relative isolate overflow-hidden rounded-[28px] bg-[#04121c] text-white">
      <img src="/images/outbound-train-at-revere-beach-station-july.jpg" alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(4,18,28,0.6),rgba(4,18,28,0.9)_45%,rgba(4,18,28,0.97))]" />
      <div className="p-4 md:p-7">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-4">
          <div>
            <h2 id="trains-h" className="text-[26px] font-semibold leading-tight tracking-[-0.02em] md:text-[32px]">When's my train?</h2>
            <p className="text-[13.5px] text-white/70">The next three Blue Line trains at each Revere station, both ways.</p>
          </div>
          <p className="flex items-center gap-2 text-[13px] text-white/70">
            <span className="relative flex h-2 w-2" aria-hidden>
              {!reduce && !error && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0297DE] opacity-70" />}
              <span className={cn("relative h-2 w-2 rounded-full", error ? "bg-[#e5a93b]" : "bg-[#0297DE]")} />
            </span>
            <FeedStatus asOf={asOf} error={error} every="20 seconds" dark />
          </p>
        </div>

        {trains == null && error ? <div className="mt-5"><FeedDown what="train predictions" dark /></div> : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {REVERE_STATIONS.map((s, i) => (
              <motion.div key={s.id} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[20px] bg-[#04121c]/70 px-4 pb-1 pt-4 ring-1 ring-white/10">
                <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{s.name}</h3>
                {trains == null ? (
                  <div className="space-y-2 py-3"><div className="skeleton h-14 !bg-white/10" /><div className="skeleton h-14 !bg-white/10" /></div>
                ) : (
                  <div className="divide-y divide-white/10">
                    <Row dir={0} trains={upcoming(s.id, 0)} now={now} />
                    <Row dir={1} trains={upcoming(s.id, 1)} now={now} endOfLine={s.id === "place-wondl"} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
        <p className="mt-4 text-[13px] text-white/60">Wonderland is the end of the line, so trains from Boston finish there; every train toward Boston starts there.</p>
      </div>
    </section>
  );
}
