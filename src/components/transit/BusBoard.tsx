import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { BUS_PLACES, BUS_ROUTES, BusDeparture, clock, minsUntil, useNow } from "./mbta";
import { FeedDown, FeedStatus, Section } from "./ui";

const PLACE = new Map(BUS_PLACES.map((p, i) => [p.key, { ...p, order: i }]));
const when = (at: number, now: number) => {
  const sec = (at - now) / 1000;
  if (sec <= 30) return "Due";
  if (sec >= 3600) return clock(at);
  return `${minsUntil(at, now)} min`;
};

export default function BusBoard({ buses, error, asOf }: { buses: BusDeparture[] | null; error: string | null; asOf: Date | null }) {
  const now = useNow(5_000);
  const byRoute = useMemo(() => {
    const m = new Map<string, Map<0 | 1, Map<string, BusDeparture[]>>>();
    for (const b of buses ?? []) {
      if (b.at - now < -15_000) continue;
      const dirs = m.get(b.route) ?? new Map();
      const places = dirs.get(b.dir) ?? new Map();
      const l = places.get(b.place) ?? [];
      l.push(b);
      places.set(b.place, l); dirs.set(b.dir, places); m.set(b.route, dirs);
    }
    return m;
  }, [buses, now]);

  return (
    <Section id="buses" title="When's my bus?" sub="Next departures for each route at Revere's busiest stops: Wonderland busway, Bell Circle, Revere Center and more."
      meta={<FeedStatus asOf={asOf} error={error} every="30 seconds" />}>
      {buses == null && error ? <FeedDown what="bus predictions" /> : (
        <div className="gap-3 md:columns-2 2xl:columns-3">
          {BUS_ROUTES.map((r) => {
            const dirs = byRoute.get(r.id);
            return (
              <article key={r.id} className="mb-3 break-inside-avoid rounded-[20px] bg-background/60 p-4 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="figure text-[30px] leading-none text-foreground">{r.id}</span>
                    <span className="min-w-0 text-[14px] leading-snug text-muted-foreground">{r.name}</span>
                  </div>
                  <a href={`https://www.mbta.com/schedules/${r.id}/line`} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
                    Schedule <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {buses == null ? (
                  <div className="mt-3 space-y-2"><div className="skeleton h-10" /><div className="skeleton h-10" /></div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {([0, 1] as const).map((d) => {
                      const places = [...(dirs?.get(d) ?? new Map<string, BusDeparture[]>()).entries()]
                        .sort((a, b) => PLACE.get(a[0])!.order - PLACE.get(b[0])!.order).slice(0, 3);
                      return (
                        <div key={d}>
                          <h3 className="text-[14px] font-semibold text-foreground">To {r.dest[d]}</h3>
                          {places.length === 0 ? (
                            <p className="mt-1 text-[13.5px] text-muted-foreground">No buses predicted from Revere right now.</p>
                          ) : (
                            <ul className="mt-1 divide-y divide-border">
                              {places.map(([key, list]) => {
                                const next = list.slice(0, 3);
                                const odd = next[0].headsign && !r.dest[d].toLowerCase().includes(next[0].headsign.toLowerCase().split(" ")[0]) ? next[0].headsign : null;
                                return (
                                  <li key={key} className="flex items-baseline justify-between gap-3 py-2">
                                    <span className="min-w-0 text-[14px] text-foreground/85">
                                      {PLACE.get(key)!.name}
                                      {odd && <span className="block text-[12.5px] text-muted-foreground">Next bus signed {odd}</span>}
                                    </span>
                                    <span className="figure shrink-0 text-right text-[15px] tracking-[-0.01em] text-foreground">
                                      <span className="text-[17px] font-semibold">{when(next[0].at, now)}</span>
                                      {next.slice(1).map((n) => <span key={n.id} className="text-muted-foreground"> · {when(n.at, now)}</span>)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-1 text-[13px] text-muted-foreground">Times are MBTA predictions from bus locations. "Due" means the bus is at or about to reach the stop.</p>
    </Section>
  );
}
