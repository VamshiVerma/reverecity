import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { acs, atYear, inWords, latestYear, MASS, n0, pct, REVERE, span, sum, usd, usdK, years, type Row } from "@/components/people/acs";
import { Bars, Figure, Legend, Section, SourceNote, Trend } from "@/components/people/ui";

const STALE = { staleTime: 1000 * 60 * 60 * 12, retry: 1 };

// ---------- Queries ----------

function useIncome() {
  return useQuery({ queryKey: ["acs", "hh-income"], ...STALE, queryFn: async () => {
    const M = "Household Income by Race";
    const [rv, ma, bRv, bMa, gRv, gMa] = await Promise.all([
      acs("acs_ygr_median_household_income_race_5", ["Year", "Race"], M, REVERE, ["Race:0"]),
      acs("acs_ygr_median_household_income_race_5", ["Year", "Race"], M, MASS, ["Race:0"]),
      acs("acs_yg_household_income_5", ["Year", "Household Income Bucket"], "Household Income", REVERE),
      acs("acs_yg_household_income_5", ["Year", "Household Income Bucket"], "Household Income", MASS),
      acs("acs_yg_gini_5", ["Year"], "Wage GINI", REVERE),
      acs("acs_yg_gini_5", ["Year"], "Wage GINI", MASS),
    ]);
    const series = (rows: Row[]) => rows.filter((r) => r[M] != null).map((r) => ({ x: Number(r.Year), y: Number(r[M]) })).sort((a, b) => a.x - b.x);
    const gini = (rows: Row[]) => Number(atYear(rows, latestYear(rows))[0]?.["Wage GINI"]);
    return { year: latestYear(rv.rows), table: rv.table, rv: series(rv.rows), ma: series(ma.rows),
      buckets: { year: latestYear(bRv.rows), table: bRv.table, rv: groupBuckets(atYear(bRv.rows, latestYear(bRv.rows))), ma: groupBuckets(atYear(bMa.rows, latestYear(bMa.rows))) },
      gini: { rv: gini(gRv.rows), ma: gini(gMa.rows), table: gRv.table } };
  } });
}

// Census buckets, merged into seven readable ranges. Each Census bucket falls in exactly one range.
const RANGES: { label: string; lo: number; hi: number }[] = [
  { label: "Under $25,000", lo: 0, hi: 25000 },
  { label: "$25,000 to $49,999", lo: 25000, hi: 50000 },
  { label: "$50,000 to $74,999", lo: 50000, hi: 75000 },
  { label: "$75,000 to $99,999", lo: 75000, hi: 100000 },
  { label: "$100,000 to $149,999", lo: 100000, hi: 150000 },
  { label: "$150,000 to $199,999", lo: 150000, hi: 200000 },
  { label: "$200,000 or more", lo: 200000, hi: Infinity },
];
const bucketFloor = (b: string) => (b.startsWith("<") ? 0 : Number(b.replace(/[^0-9-]/g, "").split("-")[0]));
function groupBuckets(rows: Row[]) {
  const total = sum(rows, "Household Income") || 1;
  return RANGES.map((r) => {
    const n = sum(rows.filter((q) => { const f = bucketFloor(String(q["Household Income Bucket"])); return f >= r.lo && f < r.hi; }), "Household Income");
    return { label: r.label, n, share: n / total };
  });
}

const PLAIN: Record<string, string> = {
  "Accommodation & Food Services": "Restaurants, bars and hotels",
  "Health Care & Social Assistance": "Health care and social assistance",
  "Educational Services": "Schools and colleges",
  "Retail Trade": "Retail",
  "Transportation & Warehousing": "Transportation and warehousing",
  "Professional, Scientific, & Technical Services": "Professional and technical services",
  "Administrative & Support & Waste Management Services": "Building, office and waste services",
  "Public Administration": "Government",
  "Finance & Insurance": "Finance and insurance",
  "Other Services, Except Public Administration": "Repair, personal care and other services",
  "Real Estate & Rental & Leasing": "Real estate",
  "Wholesale Trade": "Wholesale",
  "Arts, Entertainment, & Recreation": "Arts and recreation",
};
const plain = (s: string) => PLAIN[s] ?? s.replace(/ & /g, " and ").replace(/,? and$/, "");

function useIndustry() {
  return useQuery({ queryKey: ["acs", "industry"], ...STALE, queryFn: async () => {
    const M = "Workforce by Industry and Gender";
    const [rv, ma] = await Promise.all([
      acs("acs_ygsi_gender_by_industry_c_5", ["Year", "Industry"], M, REVERE),
      acs("acs_ygsi_gender_by_industry_c_5", ["Year", "Industry"], M, MASS),
    ]);
    const y = latestYear(rv.rows);
    const now = atYear(rv.rows, y), nowMa = atYear(ma.rows, latestYear(ma.rows));
    const total = sum(now, M), totalMa = sum(nowMa, M) || 1;
    const all = now.map((r) => {
      const m = nowMa.find((q) => q.Industry === r.Industry);
      return { name: plain(r.Industry), n: Number(r[M]) || 0, share: (Number(r[M]) || 0) / (total || 1), ma: (Number(m?.[M]) || 0) / totalMa };
    }).sort((a, b) => b.n - a.n);
    const top = all.slice(0, 9), rest = all.slice(9);
    const other = { name: "Every other industry", n: rest.reduce((s, r) => s + r.n, 0), share: rest.reduce((s, r) => s + r.share, 0), ma: rest.reduce((s, r) => s + r.ma, 0) };
    return { year: y, table: rv.table, total, rows: [...top, other], top };
  } });
}

function useOccupations() {
  return useQuery({ queryKey: ["acs", "occupations"], ...STALE, queryFn: async () => {
    const E = "Median Earings by Occupation: Occupation Group", W = "Workforce by Occupation and Gender";
    const [eRv, eMa, w] = await Promise.all([
      acs("acs_ygo_occupation_for_median_earnings_5", ["Year", "Occupation Group"], E, REVERE),
      acs("acs_ygo_occupation_for_median_earnings_5", ["Year", "Occupation Group"], E, MASS),
      acs("acs_ygso_gender_by_occupation_c_5", ["Year", "Group"], W, REVERE),
    ]);
    const y = latestYear(eRv.rows);
    const nowW = atYear(w.rows, latestYear(w.rows));
    const workers = sum(nowW, W);
    const totalSeries = (rows: Row[]) => rows.filter((r) => r["Occupation Group"] === "Total" && r[E] != null).map((r) => ({ x: Number(r.Year), y: Number(r[E]) })).sort((a, b) => a.x - b.x);
    const groups = atYear(eRv.rows, y).filter((r) => r["Occupation Group"] !== "Total" && r[E] != null).map((r) => {
      const m = atYear(eMa.rows, latestYear(eMa.rows)).find((q) => q["Occupation Group"] === r["Occupation Group"]);
      const wk = Number(nowW.find((q) => q.Group === r["Occupation Group"])?.[W]) || 0;
      return { name: String(r["Occupation Group"]).replace(" Occupations", "").replace(/ & /g, " and ").replace(/, and /g, " and "), pay: Number(r[E]), ma: Number(m?.[E]), workers: wk, share: wk / (workers || 1) };
    }).sort((a, b) => b.pay - a.pay);
    return { year: y, table: eRv.table, workTable: w.table, workers, groups, trend: { rv: totalSeries(eRv.rows), ma: totalSeries(eMa.rows) } };
  } });
}

const AGE_GROUP = (a: string) => (/^(Under 5|5 Years|6 to 11|12 to 14|15 Years|16 & 17)/.test(a) ? 0 : /^(65|75)/.test(a) ? 2 : 1);
const BELOW = "Income In The Past 12 Months Below Poverty Level";

function usePoverty() {
  return useQuery({ queryKey: ["acs", "poverty"], ...STALE, queryFn: async () => {
    const M = "Poverty Population";
    const [rv, ma] = await Promise.all([
      acs("acs_ygpsar_poverty_by_gender_age_race_5", ["Year", "Poverty Status", "Age"], M, REVERE),
      acs("acs_ygpsar_poverty_by_gender_age_race_5", ["Year", "Poverty Status", "Age"], M, MASS),
    ]);
    const rate = (rows: Row[]) => sum(rows.filter((r) => r["Poverty Status"] === BELOW), M) / (sum(rows, M) || 1);
    const trend = (rows: Row[]) => years(rows).map((y) => ({ x: y, y: rate(atYear(rows, y)) }));
    const byAge = (rows: Row[]) => [0, 1, 2].map((g) => rate(rows.filter((r) => AGE_GROUP(String(r.Age)) === g)));
    const y = latestYear(rv.rows);
    const now = atYear(rv.rows, y), nowMa = atYear(ma.rows, latestYear(ma.rows));
    return { year: y, table: rv.table, below: sum(now.filter((r) => r["Poverty Status"] === BELOW), M), counted: sum(now, M), rate: rate(now), rateMa: rate(nowMa), ages: byAge(now), agesMa: byAge(nowMa), trend: { rv: trend(rv.rows), ma: trend(ma.rows) } };
  } });
}

// ---------- Page ----------

export default function EconomyPage() {
  const inc = useIncome();
  const ind = useIndustry();
  const occ = useOccupations();
  const pov = usePoverty();
  const I = inc.data, D = ind.data, O = occ.data, P = pov.data;

  const hh = I?.rv[I.rv.length - 1], hhMa = I?.ma[I.ma.length - 1];
  const hh0 = I?.rv[0], hhMa0 = I?.ma.find((p) => p.x === hh0?.x);
  const earn = O?.trend.rv[O.trend.rv.length - 1], earnMa = O?.trend.ma[O.trend.ma.length - 1];

  // The industry where Revere's share most exceeds the state's (among the largest) gets the one highlight.
  const standout = D ? D.top.reduce((a, b) => (b.share / (b.ma || 1) > a.share / (a.ma || 1) ? b : a)) : null;
  const service = O?.groups.find((g) => g.name.startsWith("Service"));
  const best = O?.groups[0];

  return (
    <DashboardLayout pageTitle="Jobs & income">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Median household income" value={hh ? usd(hh.y) : null} note={hhMa ? `Massachusetts: ${usd(hhMa.y)}` : " "} />
          <Figure label="Median earnings per worker" value={earn ? usd(earn.y) : null} note={earnMa ? `Massachusetts: ${usd(earnMa.y)}` : " "} />
          <Figure label="Below the poverty line" accent value={P ? pct(P.rate, 1) : null} note={P ? `Massachusetts: ${pct(P.rateMa, 1)}` : " "} />
          <Figure label="Working residents" value={D ? n0(D.total) : null} note={D ? `Employed, age 16 and up, ${span(D.year)}` : " "} />
        </section>

        <section className="grid gap-3 lg:grid-cols-12">
          <Section className="lg:col-span-7" title="Are household incomes catching up with the state?" loading={inc.isLoading} error={inc.error} retry={() => inc.refetch()}
            source={I && { table: I.table, year: I.year }} question="Why are household incomes in Revere lower than the Massachusetts average?"
            finding={hh && hhMa && hh0 && hhMa0 && <>The median Revere household made {usd(hh.y)} in {span(hh.x)}, {pct(hh.y / hhMa.y)} of the state's median. In {span(hh0.x)} it was {pct(hh0.y / hhMa0.y)}, so the gap has {hh.y / hhMa.y > hh0.y / hhMa0.y ? "narrowed" : "widened"}.</>}>
            {I && <>
              <Trend zero series={[{ name: "Revere", tone: "main", points: I.rv }, { name: "Massachusetts", tone: "n1", points: I.ma }]} fmt={usd} xLabel={span} />
              <p className="mt-3 text-[12.5px] text-muted-foreground">Half of households make more than the median, half less. Dollars are as reported for each period and are not adjusted for inflation.</p>
            </>}
          </Section>

          <Section className="lg:col-span-5" title="How are incomes spread out?" loading={inc.isLoading} error={inc.error} retry={() => inc.refetch()}
            source={I && { table: I.buckets.table, year: I.buckets.year }} question="How many Revere households are low-income?"
            finding={I && (() => {
              const hi = I.buckets.rv[5].share + I.buckets.rv[6].share, lo = I.buckets.rv[0].share;
              const w = inWords(hi);
              return <>{w.includes("%") ? `${w} of households` : `${w[0].toUpperCase()}${w.slice(1)} households`} make $150,000 or more a year, while {pct(lo)} make under $25,000.</>;
            })()}>
            {I && <>
              <Legend items={[{ label: "Revere", tone: "main" }, { label: "Massachusetts", tone: "n1", tick: true }]} />
              <Bars max={Math.max(...I.buckets.rv.map((b) => b.share), ...I.buckets.ma.map((b) => b.share))}
                items={I.buckets.rv.map((b, i) => ({ label: b.label, value: b.share, display: pct(b.share), compare: I.buckets.ma[i].share, compareDisplay: pct(I.buckets.ma[i].share) }))} />
              <p className="mt-4 text-[12.5px] text-muted-foreground">
                Share of {n0(I.buckets.rv.reduce((s, b) => s + b.n, 0))} households. Income inequality (Gini index, 0 = equal, 1 = one household has everything): Revere {I.gini.rv.toFixed(2)}, Massachusetts {I.gini.ma.toFixed(2)}{I.gini.table ? ` (table ${I.gini.table})` : ""}.
              </p>
            </>}
          </Section>

          <Section className="lg:col-span-7" title="What industries do residents work in?" loading={ind.isLoading} error={ind.error} retry={() => ind.refetch()}
            source={D && { table: D.table, year: D.year }} question="Which industries employ the most Revere residents?"
            finding={D && standout && <>{D.top[0].name} employ the most residents: {pct(D.top[0].share)} of {n0(D.total)} working people{standout === D.top[0] ? <>, against {pct(standout.ma)} of workers statewide.</> : <>. {standout.name} stand out most next to the state: {pct(standout.share)} of Revere workers, against {pct(standout.ma)}.</>}</>}>
            {D && <>
              <Legend items={[{ label: "Revere", tone: "main" }, { label: "Massachusetts", tone: "n1", tick: true }]} />
              <Bars max={Math.max(...D.rows.map((r) => Math.max(r.share, r.ma)))}
                items={D.rows.map((r) => ({ label: r.name, value: r.share, display: pct(r.share), compare: r.ma, compareDisplay: pct(r.ma), tone: r === standout ? "accent" : r.name === "Every other industry" ? "n1" : "main" }))} />
              <p className="mt-4 text-[12.5px] text-muted-foreground">Where residents work, wherever the job is: many commute into Boston or to the airport. Rows add to 100%.</p>
            </>}
          </Section>

          <Section className="lg:col-span-5" title="What do the main kinds of jobs pay?" loading={occ.isLoading} error={occ.error} retry={() => occ.refetch()}
            source={O && { table: O.table, year: O.year }} question="What kinds of jobs do Revere residents have, and what do they pay?"
            finding={O && service && best && <>Service jobs employ {pct(service.share)} of working residents and pay a median {usd(service.pay)} a year. {best.name} jobs pay the most, {usd(best.pay)}.</>}>
            {O && <>
              <Legend items={[{ label: "Revere median earnings", tone: "main" }, { label: "Massachusetts", tone: "n1", tick: true }]} />
              <Bars max={Math.max(...O.groups.map((g) => Math.max(g.pay, g.ma || 0)))}
                items={O.groups.map((g) => ({ label: g.name, sub: `${n0(g.workers)} workers`, value: g.pay, display: usdK(g.pay), compare: g.ma, compareDisplay: usdK(g.ma), tone: g === service ? "accent" : "main" }))} />
              <p className="mt-4 text-[12.5px] text-muted-foreground">Median yearly earnings of people who worked, full or part time. Worker counts are from table {O.workTable} and add to {n0(O.groups.reduce((s, g) => s + g.workers, 0))}.</p>
            </>}
          </Section>

          <Section className="lg:col-span-7" title="Who lives below the poverty line?" loading={pov.isLoading} error={pov.error} retry={() => pov.refetch()}
            source={P && { table: P.table, year: P.year }} question="What help is available in Revere for families below the poverty line?"
            finding={P && <>{n0(P.below)} residents, {pct(P.rate, 1)}, have incomes below the federal poverty line, against {pct(P.rateMa, 1)} statewide. {P.ages[0] > P.ages[1] ? `Children are more likely to be poor than working-age adults: ${pct(P.ages[0])} of them.` : ""}</>}>
            {P && <>
              <Legend items={[{ label: "Revere", tone: "main" }, { label: "Massachusetts", tone: "n1", tick: true }]} />
              <Bars max={Math.max(...P.ages, ...P.agesMa)}
                items={["Children under 18", "Adults 18 to 64", "65 and older"].map((label, i) => ({ label, value: P.ages[i], display: pct(P.ages[i], 1), compare: P.agesMa[i], compareDisplay: pct(P.agesMa[i], 1), tone: P.ages[i] === Math.max(...P.ages) ? "accent" : "main" }))} />
              <div className="mt-6"><h3 className="mb-2 text-[14px] font-medium text-foreground">Poverty rate over time</h3>
                <Trend height={140} zero series={[{ name: "Revere", tone: "main", points: P.trend.rv }, { name: "Massachusetts", tone: "n1", points: P.trend.ma }]} fmt={(v) => pct(v, 1)} xLabel={span} /></div>
            </>}
          </Section>

          <Section className="lg:col-span-5" title="Has a typical worker's pay kept up?" loading={occ.isLoading} error={occ.error} retry={() => occ.refetch()}
            source={O && { table: O.table, year: O.year }} question="How have wages in Revere changed over the last decade?"
            finding={O && O.trend.rv.length > 1 && earn && earnMa && (() => {
              const e0 = O.trend.rv[0], m0 = O.trend.ma.find((p) => p.x === e0.x);
              return <>Median earnings rose {pct(earn.y / e0.y - 1)} since {span(e0.x)}{m0 ? `, against ${pct(earnMa.y / m0.y - 1)} statewide` : ""}. A typical Revere worker now earns {pct(earn.y / earnMa.y)} of the state median.</>;
            })()}>
            {O && <>
              <Trend zero series={[{ name: "Revere", tone: "main", points: O.trend.rv }, { name: "Massachusetts", tone: "n1", points: O.trend.ma }]} fmt={usd} xLabel={span} />
              <p className="mt-3 text-[12.5px] text-muted-foreground">Not adjusted for inflation.</p>
            </>}
          </Section>
        </section>

        <SourceNote q="How does Revere's economy compare with the rest of Massachusetts?" />
      </div>
    </DashboardLayout>
  );
}
