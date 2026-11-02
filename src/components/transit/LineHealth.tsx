import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LINE, Train, Vehicle, useNow } from "./mbta";
import { FeedDown, FeedStatus, Figure, Section } from "./ui";

const LAST = LINE.length - 1;
const idx = new Map(LINE.map((s, i) => [s.id, i]));

/** Where a train sits along the line: 0 is Wonderland, 11 is Bowdoin. Moving trains sit between stations. */
function position(v: Vehicle) {
  const i = idx.get(v.station);
  if (i == null) return null;
  const back = v.dir === 0 ? -1 : 1; // the side it's coming from
  const off = v.status === "STOPPED_AT" ? 0 : v.status === "INCOMING_AT" ? 0.25 : 0.5;
  return Math.max(0, Math.min(LAST, i + back * off));
}

/** Typical and longest gap between the next few trains at one platform, in minutes. */
function gaps(trains: Train[], station: string, dir: 0 | 1, now: number) {
  const t = trains.filter((x) => x.station === station && x.dir === dir && x.at > now - 15_000).slice(0, 6).map((x) => x.at);
  if (t.length < 3) return null;
  const g = t.slice(1).map((x, i) => (x - t[i]) / 60_000).sort((a, b) => a - b);
  return { typical: Math.round(g[Math.floor(g.length / 2)]), longest: Math.round(g[g.length - 1]) };
}

export default function LineHealth({ vehicles, trains, error, asOf }: { vehicles: Vehicle[] | null; trains: Train[] | null; error: string | null; asOf: Date | null }) {
  const now = useNow(15_000);
  const reduce = useReducedMotion();
  const placed = useMemo(() => (vehicles ?? []).map((v) => ({ ...v, p: position(v) })).filter((v): v is Vehicle & { p: number } => v.p != null), [vehicles]);
  const count = (d: 0 | 1) => placed.filter((v) => v.dir === d).length;
  const g0 = trains ? gaps(trains, "place-rbmnl", 0, now) : null;
  const g1 = trains ? gaps(trains, "place-rbmnl", 1, now) : null;
  const longest = Math.max(g0?.longest ?? 0, g1?.longest ?? 0);
  const ready = vehicles != null;
  const pct = (p: number) => `${(p / LAST) * 100}%`;

  const train = (v: Vehicle & { p: number }, vertical: boolean) => (
    <motion.span key={v.id + (vertical ? "v" : "h")} title={`Train ${v.label}, ${v.dir === 0 ? "toward Boston" : "toward Wonderland"}`}
      className={cn("absolute z-10 block rounded-full ring-2 ring-card", v.dir === 0 ? "bg-highlight-secondary" : "bg-foreground",
        vertical ? "h-[18px] w-[10px] -translate-x-1/2 -translate-y-1/2" : "h-[10px] w-[18px] -translate-x-1/2 -translate-y-1/2")}
      style={vertical ? { left: v.dir === 0 ? "calc(50% - 12px)" : "calc(50% + 12px)" } : { top: v.dir === 0 ? "calc(50% - 12px)" : "calc(50% + 12px)" }}
      initial={false} animate={vertical ? { top: pct(v.p) } : { left: pct(v.p) }} transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }} />
  );

  return (
    <Section id="line" title="Is the Blue Line keeping up?" sub="Every train on the line right now, and how far apart they are at Revere Beach."
      meta={<FeedStatus asOf={asOf} error={error} every="30 seconds" />}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure label="Trains running" value={ready ? placed.length : null} accent note={ready ? `${count(0)} toward Boston, ${count(1)} toward Wonderland` : " "} />
        <Figure label="Toward Boston" value={trains ? (g0 ? `~${g0.typical}` : "—") : null} unit={g0 ? "min" : undefined} note={g0 ? "Between trains at Revere Beach" : trains ? "Not enough trains predicted" : " "} />
        <Figure label="Toward Wonderland" value={trains ? (g1 ? `~${g1.typical}` : "—") : null} unit={g1 ? "min" : undefined} note={g1 ? "Between trains at Revere Beach" : trains ? "Not enough trains predicted" : " "} />
        <Figure label="Longest gap ahead" value={trains ? (longest ? longest : "—") : null} unit={longest ? "min" : undefined}
          note={longest >= 12 ? "Longer than usual. Allow extra time." : longest ? "Among the next few trains" : trains ? "No trains predicted" : " "} />
      </div>

      {vehicles == null && error ? <div className="mt-4"><FeedDown what="train locations" /></div> : (
        <div className="mt-4 rounded-[20px] bg-background/60 p-4 ring-1 ring-border md:px-6 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-2"><span className="h-2.5 w-[18px] rounded-full bg-highlight-secondary" aria-hidden />Toward Boston</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-[18px] rounded-full bg-foreground" aria-hidden />Toward Wonderland</span>
          </div>

          {/* Wide screens: one horizontal strip, Wonderland on the left. */}
          <div className="relative mx-[34px] mt-4 hidden h-[96px] md:block" role="img" aria-label={`${placed.length} trains on the Blue Line`}>
            <div className="absolute inset-x-0 top-[30px] h-[3px] -translate-y-1/2 rounded-full bg-highlight/70" />
            {LINE.map((s, i) => (
              <div key={s.id} className="absolute top-[30px] -translate-x-1/2" style={{ left: pct(i) }}>
                <span className={cn("block h-[9px] w-[9px] -translate-y-1/2 rounded-full ring-2 ring-highlight", s.revere ? "bg-highlight" : "bg-card")} />
                <span className={cn("absolute left-1/2 top-[20px] w-[76px] -translate-x-1/2 text-center text-[12px] leading-tight", s.revere ? "font-medium text-foreground" : "text-muted-foreground")}>
                  <span className="lg:hidden">{s.short}</span><span className="hidden lg:inline">{s.name}</span>
                </span>
              </div>
            ))}
            <div className="absolute inset-x-0 top-0 h-[60px]">{ready && placed.map((v) => train(v, false))}</div>
            {!ready && <div className="skeleton absolute inset-x-0 top-[18px] h-6" />}
          </div>

          {/* Phones: the same line standing up, Wonderland at the top. */}
          <div className="relative mt-4 grid grid-cols-[1fr_56px] md:hidden">
            <ol className="relative">
              {LINE.map((s) => (
                <li key={s.id} className={cn("flex h-[30px] items-center text-[14px]", s.revere ? "font-medium text-foreground" : "text-muted-foreground")}>{s.name}</li>
              ))}
            </ol>
            <div className="relative" style={{ height: LINE.length * 30 }} role="img" aria-label={`${placed.length} trains on the Blue Line`}>
              <div className="absolute inset-y-[15px] left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-highlight/70" />
              <div className="absolute inset-x-0 inset-y-[15px]">
                {LINE.map((s, i) => (
                  <span key={s.id} className={cn("absolute left-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-highlight", s.revere ? "bg-highlight" : "bg-card")} style={{ top: pct(i) }} />
                ))}
                {ready && placed.map((v) => train(v, true))}
              </div>
              {!ready && <div className="skeleton absolute inset-0" />}
            </div>
          </div>
          <p className="mt-3 text-[12.5px] text-muted-foreground">Positions come from each train's last report and are approximate between stations.</p>
        </div>
      )}
    </Section>
  );
}
