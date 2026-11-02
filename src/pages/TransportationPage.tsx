import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AskButton, Bar, CompareBars, Figure, Legend, LoadError, Panel, Segmented, SeriesKey, TrendLines, acsRange, acsShort, compare, num, pct, useLoad } from "@/components/commute/kit";
import { MODES, Mode, loadCommute } from "@/components/commute/data";
import TimeHistogram from "@/components/commute/TimeHistogram";

const ACS = "U.S. Census Bureau, American Community Survey 5-year estimates";
type Trend = "transit" | "home" | "alone";
const TRENDS: { id: Trend; label: string; pick: (c: Record<Mode, number>) => number }[] = [
  { id: "transit", label: "Transit", pick: (c) => c.rail + c.bus },
  { id: "home", label: "From home", pick: (c) => c.home },
  { id: "alone", label: "Drove alone", pick: (c) => c.alone },
];

export default function TransportationPage() {
  const { data, error, retry } = useLoad(loadCommute);
  const [trend, setTrend] = useState<Trend>("transit");

  const v = useMemo(() => {
    if (!data) return null;
    const r = data.modes.revere.at(-1)!, m = data.modes.mass.find((x) => x.year === r.year) ?? data.modes.mass.at(-1)!;
    const first = data.modes.revere[0];
    const share = (y: typeof r, k: Mode) => y.counts[k] / y.total;
    const transit = (y: typeof r) => (y.counts.rail + y.counts.bus) / y.total;
    const modes: Bar[] = MODES.map((x) => ({ key: x.id, label: x.label, value: share(r, x.id), compare: share(m, x.id), count: r.counts[x.id], countLabel: "workers", highlight: x.id === "rail" }))
      .sort((a, b) => b.value - a.value);
    const avgR = data.avg.revere.at(-1)!, avgM = data.avg.mass.find((x) => x.x === avgR.x) ?? data.avg.mass.at(-1)!, avg0 = data.avg.revere[0];
    const t = data.time.revere, tm = data.time.mass;
    const hourPlus = (d: typeof t) => d.bins.filter((b) => /^(60|90)/.test(b.short)).reduce((s, b) => s + b.n, 0) / d.total;
    const under20 = (d: typeof t) => d.bins.slice(0, 4).reduce((s, b) => s + b.n, 0) / d.total;
    const peak = t.bins.reduce((a, b) => (b.n > a.n ? b : a));
    const c = data.cars.revere, cm = data.cars.mass;
    const cars: Bar[] = c.groups.map((g, i) => ({ key: g.key, label: g.label, value: g.n / c.total, compare: cm.groups[i].n / cm.total, count: g.n, countLabel: "workers", highlight: g.key === "0" }));
    return { r, m, first, share, transit, modes, avgR, avgM, avg0, t, tm, hourPlus, under20, peak, c, cars };
  }, [data]);

  const tr = TRENDS.find((x) => x.id === trend)!;
  const trendSeries = data ? [
    { name: "Revere", main: true, points: data.modes.revere.map((y) => ({ x: y.year, y: tr.pick(y.counts) / y.total })) },
    { name: "Massachusetts", points: data.modes.mass.map((y) => ({ x: y.year, y: tr.pick(y.counts) / y.total })) },
  ] : null;
  const trendFinding = (() => {
    if (!trendSeries) return null;
    const a = trendSeries[0].points[0], b = trendSeries[0].points.at(-1)!, mb = trendSeries[1].points.at(-1)!;
    const what = { transit: "taking transit to work", home: "working from home", alone: "driving to work alone" }[trend];
    const dir = Math.abs(b.y - a.y) < 0.01 ? "held near" : b.y > a.y ? "rose from" : "fell from";
    return dir === "held near"
      ? `The share of workers ${what} held near ${pct(b.y)} between ${acsRange(a.x)} and ${acsRange(b.x)}. Statewide it's ${pct(mb.y)}.`
      : `The share of workers ${what} ${dir} ${pct(a.y)} in ${acsRange(a.x)} to ${pct(b.y)} in ${acsRange(b.x)}. Statewide it's ${pct(mb.y)}.`;
  })();

  const yr = v ? acsRange(v.r.year) : "";
  const src = (table: string) => `Source: ${ACS}, ${yr} (${table}), via DataUSA.`;

  return (
    <DashboardLayout pageTitle="Commuting">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <p className="text-[13px] text-muted-foreground">
          {v ? <>Census survey of Revere residents with jobs, averaged over {yr}. For trains and buses running right now, see <Link to="/mbta" className="text-foreground underline underline-offset-4">the MBTA page</Link>.</> : "Loading the latest Census figures…"}
        </p>

        {error && <LoadError onRetry={retry} what="the Census commuting figures" />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Average trip to work" accent value={v ? `${v.avgR.y.toFixed(1)} min` : null}
            note={v ? `${(v.avgR.y - v.avgM.y).toFixed(1)} min ${v.avgR.y >= v.avgM.y ? "longer" : "shorter"} than the state's ${v.avgM.y.toFixed(1)}` : " "} />
          <Figure label="Take transit" value={v ? pct(v.transit(v.r), 0) : null}
            note={v ? `${num(v.r.counts.rail + v.r.counts.bus)} workers · ${pct(v.transit(v.m), 0)} statewide` : " "} />
          <Figure label="Work from home" value={v ? pct(v.share(v.r, "home"), 0) : null}
            note={v ? `Up from ${pct(v.share(v.first, "home"), 0)} in ${acsRange(v.first.year)}` : " "} />
          <Figure label="No car at home" value={v ? pct(v.c.groups[0].n / v.c.total, 0) : null}
            note={v ? `of workers · ${pct(data!.cars.mass.groups[0].n / data!.cars.mass.total, 0)} statewide` : " "} />
        </section>

        <section className="grid gap-3 lg:grid-cols-12">
          <Panel className="lg:col-span-7" title="How do Revere residents get to work?"
            finding={v && <>{pct(v.transit(v.r))} of working residents take the subway, a train or a bus, {compare(v.transit(v.r), v.transit(v.m))} the statewide share. Most still drive: {pct(v.share(v.r, "alone"))} alone and {pct(v.share(v.r, "carpool"))} in a carpool.</>}
            source={v ? `${src("B08301")} ${num(v.r.total)} workers aged 16 and over. Subway or train includes the Blue Line, commuter rail and ferry.` : undefined}
            question="Why do so many Revere residents take the Blue Line to work?">
            {v ? <><Legend /><CompareBars rows={v.modes} /></> : !error && <div className="skeleton h-[420px]" />}
          </Panel>

          <Panel className="lg:col-span-5" title="How long does the trip take?"
            finding={v && <>{pct(v.hourPlus(v.t), 0)} of Revere commuters spend an hour or more getting to work, against {pct(v.hourPlus(v.tm), 0)} statewide. Only {pct(v.under20(v.t), 0)} get there in under 20 minutes. The most common trip is {v.peak.short.replace("-", " to ")} minutes.</>}
            source={v ? `${src("B08303")} ${num(v.t.total)} workers who don't work from home.` : undefined}
            question="How does Revere's commute time compare with nearby cities?">
            {v ? <><Legend /><TimeHistogram revere={v.t} mass={v.tm} /></> : !error && <div className="skeleton h-[240px]" />}
          </Panel>

          <Panel className="lg:col-span-6" title="Is the commute getting longer?"
            finding={v && <>The average one-way trip is {v.avgR.y.toFixed(1)} minutes, {v.avgR.y >= v.avg0.y ? "up" : "down"} from {v.avg0.y.toFixed(1)} in {acsRange(v.avg0.x)}. Statewide it's {v.avgM.y.toFixed(1)} minutes.</>}
            source={v ? `Source: ${ACS}, ${acsRange(data!.avg.revere[0].x)} through ${yr}, via DataUSA. Each point is a 5-year average, so neighboring points overlap.` : undefined}>
            {data ? <><SeriesKey items={[{ name: "Revere", main: true }, { name: "Massachusetts" }]} />
              <TrendLines series={[{ name: "Revere", main: true, points: data.avg.revere }, { name: "Massachusetts", points: data.avg.mass }]} format={(y) => `${Math.round(y)}`} /></>
              : !error && <div className="skeleton h-[220px]" />}
            {data && <p className="mt-1 text-[12px] text-muted-foreground">Minutes, one way</p>}
          </Panel>

          <Panel className="lg:col-span-6" title="How has the way people get to work changed?"
            finding={trendFinding ?? (error ? undefined : null)}
            source={v ? `${src("B08301")} Shares of all workers 16 and over in each 5-year period.` : undefined}>
            <div className="mb-3"><Segmented<Trend> id="cm-trend" value={trend} onChange={setTrend} options={TRENDS} /></div>
            {trendSeries ? <><SeriesKey items={[{ name: "Revere", main: true }, { name: "Massachusetts" }]} /><TrendLines series={trendSeries} format={(y) => pct(y, 0)} zero /></>
              : !error && <div className="skeleton h-[220px]" />}
          </Panel>

          <Panel className="lg:col-span-5" title="Do working residents have a car?"
            finding={v && <>{pct(v.c.groups[0].n / v.c.total)} of working residents live in a household with no vehicle, {compare(v.c.groups[0].n / v.c.total, data!.cars.mass.groups[0].n / data!.cars.mass.total)} the state rate. {pct(v.c.groups[1].n / v.c.total, 0)} share a household with just one.</>}
            source={v ? `${src("B08014")} ${num(v.c.total)} workers living in households.` : undefined}
            question="Which Revere neighborhoods have the most households without a car?">
            {v ? <><Legend /><CompareBars rows={v.cars} /></> : !error && <div className="skeleton h-[260px]" />}
          </Panel>

          <section className="flex min-w-0 flex-col justify-between gap-6 rounded-[24px] bg-card p-4 md:p-6 lg:col-span-7">
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">Is my train or bus on time?</h2>
              <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground">
                {v ? <>About {num(v.r.counts.rail)} Revere residents ride the subway or a train to work and {num(v.r.counts.bus)} take the bus. </> : null}
                Live arrivals, delays and service alerts for Wonderland, Revere Beach, Beachmont and Suffolk Downs and the bus routes through the city are on the MBTA page.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/mbta" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground">
                Live Blue Line and buses <ArrowRight className="h-4 w-4" />
              </Link>
              <AskButton q="What's the fastest way from Revere to downtown Boston right now?" />
            </div>
          </section>
        </section>

        <section className="flex flex-col gap-3 rounded-[24px] bg-card p-4 text-[14px] md:flex-row md:items-center md:justify-between md:p-6">
          <div className="max-w-[760px] text-muted-foreground">
            All figures are from the Census Bureau's American Community Survey, which asks a sample of households how they usually got to work last week. Five-year estimates are used because single-year figures aren't published reliably for a city Revere's size; each carries a margin of error. Massachusetts figures use the same tables and years.
            <span className="mt-2 flex flex-wrap gap-2">
              {[["DataUSA: Revere", "https://datausa.io/profile/geo/revere-ma"], ...["B08301", "B08303", "B08014"].map((t) => [`Census table ${t}`, `https://data.census.gov/table/ACSDT5Y${v?.r.year ?? 2024}.${t}?g=160XX00US2556585`])].map(([l, u]) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[13px] text-foreground hover:bg-accent">{l} <ExternalLink className="h-3 w-3" /></a>
              ))}
            </span>
          </div>
          <AskButton primary q={v ? `Revere's average commute is ${v.avgR.y.toFixed(1)} minutes (${acsShort(v.r.year)} ACS). What could make it shorter?` : "How do most Revere residents commute?"} />
        </section>
      </div>
    </DashboardLayout>
  );
}
