import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AskButton, Bar, CompareBars, Figure, Legend, LoadError, Panel, Segmented, SeriesKey, TrendLines, acsRange, compare, num, pct, useLoad } from "@/components/commute/kit";
import { COVERAGE, GROUPS, loadCoverage, loadPlaces } from "@/components/health/data";

const ACS = "U.S. Census Bureau, American Community Survey 5-year estimates";
const ageLabel = (a: string) => a.replace(" Years & Over", " and older").replace(" Years", "");

export default function HealthPage() {
  const acs = useLoad(loadCoverage);
  const places = useLoad(loadPlaces);
  const [group, setGroup] = useState(GROUPS[0].id);

  const v = useMemo(() => {
    const d = acs.data;
    if (!d) return null;
    const r = d.cov.revere.at(-1)!, m = d.cov.mass.find((x) => x.year === r.year) ?? d.cov.mass.at(-1)!, r0 = d.cov.revere[0];
    const unins = (y: typeof r) => y.c.Uninsured / y.total;
    const coverage: Bar[] = COVERAGE.map((c) => ({ key: c.id, label: c.label, hint: c.hint, value: r.c[c.id] / r.total, compare: m.c[c.id] / m.total, count: r.c[c.id], countLabel: "people", highlight: c.id === "Uninsured" }))
      .sort((a, b) => (a.key === "Uninsured" ? 1 : b.key === "Uninsured" ? -1 : b.value - a.value));
    const ma = new Map(d.age.mass.ages.map((a) => [a.age, a.uninsured / a.total]));
    const ageRates = d.age.revere.ages.map((a) => ({ ...a, rate: a.uninsured / a.total }));
    const worst = ageRates.reduce((a, b) => (b.rate > a.rate ? b : a));
    const ages: Bar[] = ageRates.map((a) => ({ key: a.age, label: ageLabel(a.age), value: a.rate, compare: ma.get(a.age), count: a.uninsured, countLabel: `uninsured of ${num(a.total)}`, highlight: a.age === worst.age }));
    const n = d.net.revere.at(-1)!, nm = d.net.mass.find((x) => x.year === n.year) ?? d.net.mass.at(-1)!, n0 = d.net.revere[0];
    const offline = (x: typeof n) => (x.noSub + x.none) / x.total;
    const net: Bar[] = [
      { key: "sub", label: "Paid home internet", value: n.sub / n.total, compare: nm.sub / nm.total, count: n.sub, countLabel: "households" },
      { key: "noSub", label: "Internet without paying for a plan", hint: "For example, free building or public Wi-Fi", value: n.noSub / n.total, compare: nm.noSub / nm.total, count: n.noSub, countLabel: "households" },
      { key: "none", label: "No internet at home", value: n.none / n.total, compare: nm.none / nm.total, count: n.none, countLabel: "households", highlight: true },
    ];
    return { r, m, r0, unins, coverage, ages, worst, n, nm, n0, offline, net };
  }, [acs.data]);

  const p = useMemo(() => {
    const d = places.data;
    if (!d) return null;
    const g = GROUPS.find((x) => x.id === group)!;
    const list = d.measures.filter((m) => m.group === group).sort((a, b) => b.value - a.value);
    // "Clearly" higher or lower: the county's figure falls outside Revere's 95% confidence interval.
    const above = list.filter((m) => m.county != null && m.county < m.lo), below = list.filter((m) => m.county != null && m.county > m.hi);
    const top = above.slice().sort((a, b) => (b.value - b.county!) - (a.value - a.county!))[0];
    const rows: Bar[] = list.map((m) => ({ key: m.id, label: m.label, value: m.value, compare: m.county, highlight: m.id === top?.id, hint: `Revere ${pct(m.value)} (95% range ${pct(m.lo)} to ${pct(m.hi)}), ${m.year} estimate` }));
    const finding = `Of the ${list.length} ${g.what} here, Revere adults are clearly above Suffolk County on ${above.length} and clearly below on ${below.length}${top ? `. The widest gap: ${top.label.toLowerCase()}, ${pct(top.value)} against ${pct(top.county!)}` : ""}.`;
    const checkup = d.measures.find((m) => m.id === "CHECKUP");
    return { list, rows, finding, checkup, years: d.years, adults: d.adults };
  }, [places.data, group]);

  const yr = v ? acsRange(v.r.year) : "";
  const placesYears = p ? p.years.join(" and ") : "";

  return (
    <DashboardLayout pageTitle="Health">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <p className="text-[13px] text-muted-foreground">
          {v ? <>Insurance and internet access from the Census, averaged over {yr}. Adult health estimates from the CDC{p ? ` (${placesYears} data)` : ""}.</> : "Loading the latest Census and CDC figures…"}
        </p>
        {acs.error && <LoadError onRetry={acs.retry} what="the Census coverage figures" />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="No health insurance" accent value={v ? pct(v.unins(v.r)) : null}
            note={v ? `${num(v.r.c.Uninsured)} people · ${pct(v.unins(v.m))} statewide` : " "} />
          <Figure label="Covered by MassHealth" value={v ? pct(v.r.c.Medicaid / v.r.total, 0) : null}
            note={v ? `${pct(v.m.c.Medicaid / v.m.total, 0)} statewide` : " "} />
          <Figure label="Adults with a yearly checkup" value={p?.checkup ? pct(p.checkup.value, 0) : places.error ? "n/a" : null}
            note={p?.checkup?.county != null ? `${pct(p.checkup.county, 0)} in Suffolk County` : " "} />
          <Figure label="Homes without paid internet" value={v ? pct(v.offline(v.n), 0) : null}
            note={v ? `${num(v.n.noSub + v.n.none)} households · ${pct(v.offline(v.nm), 0)} statewide` : " "} />
        </section>

        <section className="grid gap-3 lg:grid-cols-12">
          <Panel className="lg:col-span-7" title="How do Revere residents get health insurance?"
            finding={v && <>{pct(v.r.c.Employer / v.r.total, 0)} are covered through a job and {pct(v.r.c.Medicaid / v.r.total, 0)} through MassHealth, {compare(v.r.c.Medicaid / v.r.total, v.m.c.Medicaid / v.m.total)} the statewide share. {pct(v.unins(v.r))} have no insurance at all, {compare(v.unins(v.r), v.unins(v.m))} the state rate.</>}
            source={v ? `Source: ${ACS}, ${yr} (B27010), via DataUSA. Each person counted once, by their main coverage; ${num(v.r.total)} residents not living in institutions.` : undefined}
            question="How do I sign up for MassHealth or a Health Connector plan in Revere?">
            {v ? <><Legend /><CompareBars rows={v.coverage} /></> : !acs.error && <div className="skeleton h-[380px]" />}
          </Panel>

          <Panel className="lg:col-span-5" title="Who is most likely to be uninsured?"
            finding={v && <>Residents aged {ageLabel(v.worst.age).toLowerCase()} are the most likely to go without: {pct(v.worst.uninsured / v.worst.total)}, against {pct(v.ages.find((a) => a.key === v.worst.age)!.compare!)} statewide. Almost everyone 65 and older has Medicare.</>}
            source={v ? `Source: ${ACS}, ${yr} (B27010), via DataUSA. Share of each age group with no coverage.` : undefined}>
            {v ? <><Legend /><CompareBars rows={v.ages} /></> : !acs.error && <div className="skeleton h-[280px]" />}
          </Panel>

          <Panel className="lg:col-span-6" title="Are fewer people going without insurance?"
            finding={v && <>The uninsured rate went from {pct(v.unins(v.r0))} in {acsRange(v.r0.year)} to {pct(v.unins(v.r))} in {yr}. That's still {compare(v.unins(v.r), v.unins(v.m))} the statewide rate of {pct(v.unins(v.m))}.</>}
            source={v ? `Source: ${ACS}, ${acsRange(v.r0.year)} through ${yr}, via DataUSA. Each point is a 5-year average, so neighboring points overlap.` : undefined}>
            {acs.data ? <><SeriesKey items={[{ name: "Revere", main: true }, { name: "Massachusetts" }]} />
              <TrendLines zero format={(y) => pct(y, 0)} series={[
                { name: "Revere", main: true, points: acs.data.cov.revere.map((y) => ({ x: y.year, y: y.c.Uninsured / y.total })) },
                { name: "Massachusetts", points: acs.data.cov.mass.map((y) => ({ x: y.year, y: y.c.Uninsured / y.total })) },
              ]} /></> : !acs.error && <div className="skeleton h-[220px]" />}
          </Panel>

          <Panel className="lg:col-span-6" title="Can residents get online for a video visit?"
            finding={v && <>{pct(v.n.none / v.n.total)} of Revere households have no internet at home, down from {pct(v.n0.none / v.n0.total)} in {acsRange(v.n0.year)}. That makes telehealth appointments and patient portals harder to use. Statewide it's {pct(v.nm.none / v.nm.total)}.</>}
            source={v ? `Source: ${ACS}, ${acsRange(v.n.year)} (B28002), via DataUSA. ${num(v.n.total)} households.` : undefined}
            question="Where can I get free internet or a low-cost plan in Revere?">
            {v ? <><Legend /><CompareBars rows={v.net} /></> : !acs.error && <div className="skeleton h-[220px]" />}
          </Panel>

          <section className="min-w-0 rounded-[24px] bg-card p-4 md:p-6 lg:col-span-12">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold text-foreground">How healthy are Revere adults?</h2>
                {p ? <p className="mt-1 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">{p.finding}</p> : !places.error && <span className="skeleton mt-2 block h-4 w-2/3" />}
              </div>
              <Segmented id="hl-group" value={group} onChange={setGroup} options={GROUPS} />
            </div>
            <div className="mt-4">
              {places.error ? <LoadError onRetry={places.retry} what="the CDC estimates" /> : p ? (
                <>
                  <Legend other="Suffolk County" />
                  <div className="grid gap-x-10 md:grid-cols-2">
                    <CompareBars rows={p.rows.slice(0, Math.ceil(p.rows.length / 2))} otherName="Suffolk County" max={Math.max(...p.list.flatMap((m) => [m.value, m.county ?? 0]))} />
                    <div className="mt-3 md:mt-0"><CompareBars rows={p.rows.slice(Math.ceil(p.rows.length / 2))} otherName="Suffolk County" max={Math.max(...p.list.flatMap((m) => [m.value, m.county ?? 0]))} /></div>
                  </div>
                </>
              ) : <div className="skeleton h-[300px]" />}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-[80ch] text-[12.5px] leading-snug text-muted-foreground">
                Source: CDC PLACES, 2025 release ({placesYears || "2022–2023"} data), share of {p?.adults ? `Revere's ${num(p.adults)} adults` : "adults 18 and older"}. These are statistical estimates built from a national phone survey and Census data, not counts of patients, so small gaps aren't meaningful. "Clearly" means Suffolk County's figure falls outside Revere's 95% range. Hover a row for that range. Earlier releases used different methods, so no trend is shown.
              </p>
              <AskButton q="What health services are available for adults in Revere, like checkups, screenings and mental health care?" />
            </div>
          </section>
        </section>

        <section className="flex flex-col gap-3 rounded-[24px] bg-card p-4 text-[14px] md:flex-row md:items-center md:justify-between md:p-6">
          <div className="max-w-[760px] text-muted-foreground">
            Coverage and internet figures are Census survey estimates and each carries a margin of error; Massachusetts uses the same tables and years. Adult health figures are CDC model estimates compared with Suffolk County, which also includes Boston, Chelsea and Winthrop. Hospital visits, overdoses and causes of death aren't shown because we couldn't find a city-level open data source for them that the page can read directly.
            <span className="mt-2 flex flex-wrap gap-2">
              {[["DataUSA: Revere", "https://datausa.io/profile/geo/revere-ma"], ["CDC PLACES data", "https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-Place-Data-20/eav7-hnsx"], ["Census table B27010", `https://data.census.gov/table/ACSDT5Y${v?.r.year ?? 2024}.B27010?g=160XX00US2556585`]].map(([l, u]) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[13px] text-foreground hover:bg-accent">{l} <ExternalLink className="h-3 w-3" /></a>
              ))}
            </span>
          </div>
          <AskButton primary q={v ? `${pct(v.unins(v.r))} of Revere residents have no health insurance (${yr} ACS). Where can they get covered?` : "Where can Revere residents get health insurance?"} />
        </section>
      </div>
    </DashboardLayout>
  );
}
