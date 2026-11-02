import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Live numbers and time charts for the Blue Line card.
// Colour follows direction everywhere on the card: cantaloupe = toward Boston, white = toward Revere/Wonderland.
// Direction is never colour-only: every lane and chart half is labelled, and the arrows repeat it.

type Dep = { at: number; scheduled: boolean; trip?: string };
type Sched = { at: number; trip: string };
type Pair<T> = { 0: T; 1: T };

const TZ = "America/New_York";
const hm = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const hourLabel = (t: number, short = false) => {
  const h = Number(new Date(t).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TZ })) % 24;
  const ap = h < 12 ? "am" : "pm";
  const n = h % 12 || 12;
  return short ? `${n}${ap[0]}` : `${n} ${ap}`;
};
const hourKey = (t: number) => new Date(t).toLocaleString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false, timeZone: TZ });

/** Average minutes between consecutive trains, from the next departures (or the timetable around now). */
function headway(deps: Dep[] | undefined, day: Sched[] | undefined, now: number) {
  const up = (deps ?? []).filter((d) => d.at > now - 30_000).slice(0, 6).map((d) => d.at);
  let pts = up;
  if (pts.length < 3) pts = (day ?? []).filter((x) => x.at > now - 30 * 60e3 && x.at < now + 60 * 60e3).map((x) => x.at);
  if (pts.length < 2) return null;
  const gaps = pts.slice(1).map((t, i) => t - pts[i]);
  return Math.max(1, Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length / 60e3));
}

/** How far live predictions are from the timetable for the same trips, in minutes (positive = late). */
function lateness(deps: Pair<Dep[]> | null, day: Pair<Sched[]> | null, now: number) {
  if (!deps || !day) return null;
  const diffs: number[] = [];
  for (const dir of [0, 1] as const) {
    const byTrip = new Map(day[dir].map((x) => [x.trip, x.at]));
    for (const d of deps[dir]) {
      if (d.scheduled || !d.trip || d.at > now + 40 * 60e3) continue;
      const s = byTrip.get(d.trip);
      if (s != null && Math.abs(d.at - s) < 45 * 60e3) diffs.push((d.at - s) / 60e3);
    }
  }
  if (diffs.length < 2) return null;
  diffs.sort((a, b) => a - b);
  return { median: diffs[Math.floor(diffs.length / 2)], n: diffs.length };
}

export function TrainStats({ running, inRevere, deps, day, now, atEnd }: { running: Pair<number> | null; inRevere: number | null; deps: Pair<Dep[]> | null; day: Pair<Sched[]> | null; now: number; atEnd: boolean }) {
  const h0 = headway(deps?.[0], day?.[0], now), h1 = headway(deps?.[1], day?.[1], now);
  const late = lateness(deps, day, now);
  const lateText = late == null ? "—" : Math.abs(late.median) < 1.5 ? "On time" : late.median > 0 ? `${Math.round(late.median)} min late` : `${Math.round(-late.median)} min early`;
  const tiles = [
    { k: "Trains on the line", v: running ? String(running[0] + running[1]) : "…", sub: running ? `${running[0]} to Boston · ${running[1]} to Wonderland${inRevere != null ? ` · ${inRevere} in Revere now` : ""}` : "Counting…" },
    { k: "To Boston", v: h0 ? `every ${h0} min` : "—", sub: "average gap between trains", dot: "bg-highlight-secondary" },
    { k: atEnd ? "From Boston" : "To Wonderland", v: h1 ? `every ${h1} min` : "—", sub: "average gap between trains", dot: "bg-white" },
    { k: "Vs. timetable", v: lateText, sub: late ? `from the next ${late.n} live trains` : "no live trains to compare yet" },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-white/10 ring-1 ring-white/10 md:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.k} className="bg-[#061925]/90 px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[12.5px] text-white/65">
            {t.dot && <span className={cn("h-2 w-2 rounded-full", t.dot)} />}{t.k}
          </div>
          <div className="figure mt-1 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-white md:text-[26px]">{t.v}</div>
          <div className="mt-0.5 text-[12px] leading-snug text-white/50">{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

/** The next hour at the chosen station: every train each way, drifting toward "now" each second. */
export function NextHour({ deps, day, now, atEnd, stationName, narrow }: { deps: Pair<Dep[]> | null; day: Pair<Sched[]> | null; now: number; atEnd: boolean; stationName: string; narrow: boolean }) {
  // Phones show the next half hour so the dots have room; desktops show the hour.
  const SPAN = (narrow ? 30 : 60) * 60e3;
  const lastOf = (dir: 0 | 1) => { const l = day?.[dir]; const t = l?.length ? l[l.length - 1].at : null; return t && t > now ? t : null; };
  const [hover, setHover] = useState<string | null>(null);
  const ticks = useMemo(() => {
    const q = (narrow ? 10 : 15) * 60e3, out: number[] = [];
    for (let t = Math.ceil(now / q) * q; t < now + SPAN; t += q) out.push(t);
    return out;
    // recompute once a minute is plenty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(now / 60e3), narrow]);
  const lanes = [
    { dir: 0 as const, name: "To Boston", fill: "bg-highlight-secondary", ring: "border-highlight-secondary", text: "text-highlight-secondary" },
    { dir: 1 as const, name: atEnd ? "From Boston" : "To Wonderland", fill: "bg-white", ring: "border-white", text: "text-white" },
  ];
  const within = (dir: 0 | 1) => (deps?.[dir] ?? []).filter((d) => d.at > now - 20_000 && d.at < now + SPAN);
  const total = within(0).length + within(1).length;
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - now) / SPAN) * 100));

  return (
    <div className="rounded-[22px] bg-black/25 px-4 pb-3 pt-4 ring-1 ring-white/10 md:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px] font-semibold">The next {narrow ? "half hour" : "hour"} at {stationName}</h3>
        <span className="text-[12.5px] text-white/60">
          {deps ? `${total} train${total === 1 ? "" : "s"}` : "Loading…"} · <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white/80" />live</span> · <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-white/80" />timetable</span>
        </span>
      </div>

      <div className={cn("mt-3 grid gap-x-3", narrow ? "grid-cols-1" : "grid-cols-[112px_1fr]")}>
        {lanes.map((l) => (
          <div key={l.dir} className="contents">
            <div className={cn("flex items-center gap-1.5 text-[13px] text-white/80", narrow ? "mt-1 h-[20px]" : "h-[44px]")}>
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", l.fill)} /><span className="leading-tight">{l.name}</span>
            </div>
            <div className={cn("relative", narrow ? "mx-2 h-[50px]" : "h-[44px]")}>
              <div className={cn("absolute inset-x-0 h-px bg-white/15", narrow ? "top-[32px]" : "top-1/2")} />
              {ticks.map((t) => <div key={t} className={cn("absolute h-[24px] w-px bg-white/10", narrow ? "top-[20px]" : "top-[10px]")} style={{ left: `${pct(t)}%` }} />)}
              {within(l.dir).map((d, i) => {
                const id = `${l.dir}-${d.trip ?? d.at}`;
                const mins = Math.max(0, Math.round((d.at - now) / 60e3));
                const label = `${l.name}: ${mins <= 0 ? "now" : `in ${mins} min`} (${hm(d.at)})${d.scheduled ? ", timetable" : ", live"}`;
                const p = pct(d.at);
                return (
                  <button key={id} aria-label={label} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(id)} onBlur={() => setHover(null)}
                    className={cn("absolute grid h-[28px] w-[28px] -translate-x-1/2 -translate-y-1/2 place-items-center", narrow ? "top-[32px]" : "top-1/2", "transition-[left] duration-1000 ease-linear motion-reduce:transition-none")}
                    style={{ left: `${p}%` }}>
                    <span className={cn("block h-[12px] w-[12px] rounded-full ring-2 ring-[#04121c]", d.scheduled ? cn("border-2 bg-[#04121c]", l.ring) : l.fill)} />
                    {i === 0 && (
                      <span className={cn("figure pointer-events-none absolute -top-[13px] whitespace-nowrap text-[11.5px] font-semibold", l.text, p > 85 ? "right-1" : "left-1/2 -translate-x-1/2")}>
                        {mins <= 0 ? "now" : `${mins} min`}
                      </span>
                    )}
                    {hover === id && (
                      <span className={cn("pointer-events-none absolute top-full z-20 mt-1 whitespace-nowrap rounded-lg bg-[#0b2232] px-2.5 py-1.5 text-left text-[12px] text-white shadow-lg ring-1 ring-white/15", p > 70 ? "right-0" : p < 15 ? "left-0" : "left-1/2 -translate-x-1/2")}>
                        <span className="figure font-semibold">{hm(d.at)}</span> · {mins <= 0 ? "now" : `in ${mins} min`}<span className="block text-white/60">{d.scheduled ? "Timetable (no live prediction yet)" : "Live prediction"}</span>
                      </span>
                    )}
                  </button>
                );
              })}
              {deps && !within(l.dir).length && <span className="absolute inset-0 grid place-items-center text-[12.5px] text-white/55">No trains in the next hour</span>}
            </div>
          </div>
        ))}
        {!narrow && <div />}
        <div className={cn("relative h-[18px] text-[11.5px] text-white/50", narrow && "mx-2")}>
          <span className="absolute left-0 -translate-x-1/2">Now</span>
          {ticks.map((t) => <span key={t} className={cn("figure absolute -translate-x-1/2 whitespace-nowrap", (pct(t) < 12 || pct(t) > 94) && "hidden")} style={{ left: `${pct(t)}%` }}>{narrow ? hm(t).replace(/\s?[AP]M$/, "") : hm(t)}</span>)}
        </div>
      </div>
      {(lastOf(0) || lastOf(1)) && (
        <p className="mt-3 border-t border-white/10 pt-3 text-[12.5px] text-white/65">
          Last trains tonight:{lastOf(0) && <> <span className="text-highlight-secondary">to Boston</span> <span className="figure font-semibold text-white">{hm(lastOf(0)!)}</span></>}
          {lastOf(0) && lastOf(1) && " · "}{lastOf(1) && <>{atEnd ? "from Boston" : "to Wonderland"} <span className="figure font-semibold text-white">{hm(lastOf(1)!)}</span></>}
        </p>
      )}
    </div>
  );
}

/** Trains per hour today at the chosen station: Boston-bound above the axis, Revere-bound below. */
export function TrainsByHour({ day, now, atEnd }: { day: Pair<Sched[]> | null; now: number; atEnd: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const cols = useMemo(() => {
    if (!day) return [];
    const map = new Map<string, { key: string; t: number; c: Pair<number> }>();
    for (const dir of [0, 1] as const) for (const x of day[dir]) {
      const k = hourKey(x.at);
      const e = map.get(k) ?? { key: k, t: x.at, c: { 0: 0, 1: 0 } };
      e.c[dir]++; e.t = Math.min(e.t, x.at);
      map.set(k, e);
    }
    return [...map.values()].sort((a, b) => a.t - b.t);
  }, [day]);
  if (day && !cols.length) return null;
  const max = Math.max(1, ...cols.flatMap((c) => [c.c[0], c.c[1]]));
  const nowKey = hourKey(now);
  const cur = cols.findIndex((c) => c.key === nowKey);
  const H = 54;
  const busiest = cols.reduce((b, c, i) => (c.c[0] + c.c[1] > (cols[b]?.c[0] ?? 0) + (cols[b]?.c[1] ?? 0) ? i : b), 0);
  const show = hover ?? (cur >= 0 ? cur : null);

  return (
    <div className="rounded-[22px] bg-black/25 px-4 pb-3 pt-4 ring-1 ring-white/10 md:px-6 lg:flex lg:flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px] font-semibold">Trains per hour today</h3>
        <span className="text-[12.5px] text-white/60">
          {show != null && cols[show]
            ? <><span className="figure font-semibold text-white">{hourLabel(cols[show].t)}</span>{show === cur && hover == null ? " (now)" : ""}: <span className="text-highlight-secondary">{cols[show].c[0]} to Boston</span> · {cols[show].c[1]} {atEnd ? "from Boston" : "to Wonderland"}</>
            : "From the MBTA timetable"}
        </span>
      </div>
      {!day ? <div className="mt-3 h-[140px] animate-pulse rounded-xl bg-white/5" /> : (
        <div className="relative mt-4 flex flex-1 flex-col" role="img"
          aria-label={`Trains per hour today. Busiest hour ${hourLabel(cols[busiest].t)} with ${cols[busiest].c[0]} to Boston and ${cols[busiest].c[1]} the other way.`}>
          <div className="flex flex-1 gap-[2px]" onMouseLeave={() => setHover(null)}>
            {cols.map((c, i) => {
              const past = cur >= 0 && i < cur;
              return (
                <button key={c.key} className={cn("group relative flex min-w-0 flex-1 flex-col items-stretch rounded-md outline-none focus-visible:ring-1 focus-visible:ring-white/50", i === cur && "bg-white/[0.07]")}
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  aria-label={`${hourLabel(c.t)}: ${c.c[0]} to Boston, ${c.c[1]} ${atEnd ? "from Boston" : "to Wonderland"}`}>
                  <div className="flex items-end justify-center px-[1px] lg:flex-1" style={{ minHeight: H }}>
                    <div className={cn("w-full max-w-[14px] rounded-t-[4px] bg-highlight-secondary transition-opacity", past ? "opacity-35" : "opacity-100", hover === i && "opacity-100")} style={{ height: `${(c.c[0] / max) * 100}%` }} />
                  </div>
                  <div className="h-[2px] bg-white/25" />
                  <div className="flex items-start justify-center px-[1px] lg:flex-1" style={{ minHeight: H }}>
                    <div className={cn("w-full max-w-[14px] rounded-b-[4px] bg-white transition-opacity", past ? "opacity-30" : "opacity-90", hover === i && "opacity-100")} style={{ height: `${(c.c[1] / max) * 100}%` }} />
                  </div>
                  <span className={cn("figure mt-1 h-[14px] text-center text-[10.5px] leading-none", i === cur ? "font-semibold text-white" : "text-white/45")}>
                    {i === cur ? "now" : i % 3 === 0 ? hourLabel(c.t, true) : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/60">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-highlight-secondary" />Above the line: to Boston</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-white" />Below: {atEnd ? "from Boston" : "to Wonderland"}</span>
            <span>Faded bars have already run</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Every train today at the chosen station, each way: how many in total, how many have run, how many are left. */
export function TodaySummary({ day, now, atEnd, stationName }: { day: Pair<Sched[]> | null; now: number; atEnd: boolean; stationName: string }) {
  return (
    <div className="rounded-[22px] bg-black/25 px-4 pb-4 pt-4 ring-1 ring-white/10 md:px-6">
      <h3 className="text-[15px] font-semibold">All trains today at {stationName}</h3>
      {!day && <div className="mt-3 h-[96px] animate-pulse rounded-xl bg-white/5" />}
      {day && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {([0, 1] as const).map((dir) => {
            const all = day[dir], ran = all.filter((x) => x.at <= now).length, left = all.length - ran;
            const first = all[0]?.at, last = all[all.length - 1]?.at;
            return (
              <div key={dir} className="rounded-2xl bg-white/[0.05] px-3.5 py-3 ring-1 ring-white/10">
                <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                  <span className={cn("h-2 w-2 rounded-full", dir === 0 ? "bg-highlight-secondary" : "bg-white")} />
                  {dir === 0 ? "To Boston" : atEnd ? "From Boston" : "To Wonderland"}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="figure text-[24px] font-semibold leading-none text-white">{all.length}</span>
                  <span className="text-[13px] text-white/60">trains today</span>
                </div>
                <div className="mt-2 flex h-[6px] gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${ran} have run, ${left} still to come`}>
                  <div className={cn("rounded-l-full", dir === 0 ? "bg-highlight-secondary/45" : "bg-white/40")} style={{ width: `${all.length ? (ran / all.length) * 100 : 0}%` }} />
                  <div className={cn("flex-1 rounded-r-full", dir === 0 ? "bg-highlight-secondary" : "bg-white")} />
                </div>
                <div className="mt-1.5 text-[12px] leading-relaxed text-white/60">
                  <span><span className="figure font-semibold text-white">{ran}</span> run · <span className="figure font-semibold text-white">{left}</span> to come</span>
                  {first && last && <span className="block">First <span className="figure text-white/85">{hm(first)}</span> · last <span className="figure text-white/85">{hm(last)}</span></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
