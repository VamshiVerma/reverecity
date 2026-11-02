import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { acs, atYear, latestYear, MASS, n0, pct, REVERE, span, sum, years, type Row } from "@/components/people/acs";
import { Bars, Columns, Figure, Legend, Section, SourceNote, Stack, Trend } from "@/components/people/ui";

const STALE = { staleTime: 1000 * 60 * 60 * 12, retry: 1 };

// ---------- Queries: each section loads (and fails) on its own ----------

function usePopulation() {
  return useQuery({ queryKey: ["acs", "population"], ...STALE, queryFn: async () => {
    const [pop, age, ageMa] = await Promise.all([
      acs("acs_yg_total_population_5", ["Year"], "Population", REVERE),
      acs("acs_ygs_median_age_total_5", ["Year"], "Median Age", REVERE),
      acs("acs_ygs_median_age_total_5", ["Year"], "Median Age", MASS),
    ]);
    const series = pop.rows.map((r) => ({ x: Number(r.Year), y: Number(r.Population) })).sort((a, b) => a.x - b.x);
    const ageSeries = age.rows.map((r) => ({ x: Number(r.Year), y: Number(r["Median Age"]) })).sort((a, b) => a.x - b.x);
    const y = series[series.length - 1].x;
    return { series, ageSeries, ageMa: Number(atYear(ageMa.rows, latestYear(ageMa.rows))[0]?.["Median Age"]), year: y, table: pop.table, ageTable: age.table };
  } });
}

const AGE_BANDS: [string, string[]][] = [
  ["Under 18", ["Under 5 Years", "5 to 17 Years"]],
  ["18 to 24", ["18 to 24 Years"]],
  ["25 to 34", ["25 to 34 Years"]],
  ["35 to 44", ["35 to 44 Years"]],
  ["45 to 54", ["45 to 54 Years"]],
  ["55 to 64", ["55 to 59 Years", "60 & 61 Years", "62 to 64 Years"]],
  ["65 to 74", ["65 to 74 Years"]],
  ["75 and over", ["75 Years & Over"]],
];
const FB = "Foreign Born";

function useBirthplace() {
  return useQuery({ queryKey: ["acs", "birthplace"], ...STALE, queryFn: async () => {
    const [rv, ma, countries] = await Promise.all([
      acs("acs_ygpa_place_of_birth_by_age_5", ["Year", "Place of Birth", "Age"], "Birthplace", REVERE),
      acs("acs_ygpa_place_of_birth_by_age_5", ["Year", "Place of Birth"], "Birthplace", MASS),
      acs("acs_ygf_place_of_birth_for_foreign_born_5", ["Year", "Country"], "Foreign-Born Citizens", REVERE),
    ]);
    const M = "Birthplace";
    const share = (rows: Row[]) => years(rows).map((y) => { const r = atYear(rows, y); return { x: y, y: sum(r.filter((q) => q["Place of Birth"] === FB), M) / (sum(r, M) || 1) }; });
    const y = latestYear(rv.rows);
    const now = atYear(rv.rows, y);
    const by = (p: string) => sum(now.filter((r) => r["Place of Birth"] === p), M);
    const total = sum(now, M);
    const ages = AGE_BANDS.map(([label, keys]) => {
      const rows = now.filter((r) => keys.includes(r.Age));
      return { label, total: sum(rows, M), abroad: sum(rows.filter((r) => r["Place of Birth"] === FB), M) };
    });
    const cy = latestYear(countries.rows);
    const crow = atYear(countries.rows, cy);
    const cTotal = sum(crow, "Foreign-Born Citizens");
    const top = crow.map((r) => ({ name: String(r.Country).replace(", Excluding Hong Kong & Taiwan", "").replace(" & ", " and "), n: Number(r["Foreign-Born Citizens"]) || 0 }))
      .filter((c) => c.n > 0).sort((a, b) => b.n - a.n).slice(0, 8);
    return {
      year: y, table: rv.table, total,
      parts: { ma: by("Born In State of Residence"), other: by("Born In Other State In The United States"), abroadUS: by("Native; Born Outside The United States"), foreign: by(FB) },
      ages, trend: { rv: share(rv.rows), ma: share(ma.rows) },
      countries: { year: cy, table: countries.table, total: cTotal, top },
    };
  } });
}

function useCitizenship() {
  return useQuery({ queryKey: ["acs", "citizenship"], ...STALE, queryFn: async () => {
    const [rv, ma] = await Promise.all([
      acs("acs_ygc_citizenship_status_5", ["Year", "Citizenship Status Granular"], "Citizenship Status", REVERE),
      acs("acs_ygc_citizenship_status_5", ["Year", "Citizenship Status Granular"], "Citizenship Status", MASS),
    ]);
    const pick = (rows: Row[]) => {
      const now = atYear(rows, latestYear(rows));
      const g = (k: string) => sum(now.filter((r) => r["Citizenship Status Granular"] === k), "Citizenship Status");
      const bornUS = g("U.S. Citizen, Born In The United States") + g("U.S. Citizen, Born In Puerto Rico or U.S. Island Areas") + g("U.S. Citizen, Born Abroad of American Parent (S)");
      return { bornUS, naturalized: g("U.S. Citizen By Naturalization"), non: g("Not a U.S. Citizen"), total: sum(now, "Citizenship Status") };
    };
    return { year: latestYear(rv.rows), table: rv.table, rv: pick(rv.rows), ma: pick(ma.rows) };
  } });
}

const RACE_GROUPS: [string, (eth: string, race: string) => boolean][] = [
  ["Hispanic or Latino, any race", (e) => e === "Hispanic or Latino"],
  ["White", (e, r) => e !== "Hispanic or Latino" && r === "White Alone"],
  ["Black", (e, r) => e !== "Hispanic or Latino" && r === "Black or African American Alone"],
  ["Asian", (e, r) => e !== "Hispanic or Latino" && r === "Asian Alone"],
  ["Another race, or more than one", (e, r) => e !== "Hispanic or Latino" && !["White Alone", "Black or African American Alone", "Asian Alone"].includes(r)],
];

function useRace() {
  return useQuery({ queryKey: ["acs", "race"], ...STALE, queryFn: async () => {
    const [rv, ma] = await Promise.all([
      acs("acs_ygr_race_with_hispanic_5", ["Year", "Ethnicity", "Race"], "Hispanic Population", REVERE),
      acs("acs_ygr_race_with_hispanic_5", ["Year", "Ethnicity", "Race"], "Hispanic Population", MASS),
    ]);
    const M = "Hispanic Population";
    const groups = (rows: Row[]) => { const t = sum(rows, M) || 1; return RACE_GROUPS.map(([label, f]) => ({ label, share: sum(rows.filter((r) => f(r.Ethnicity, r.Race)), M) / t, n: sum(rows.filter((r) => f(r.Ethnicity, r.Race)), M) })); };
    const hisp = (rows: Row[]) => years(rows).map((y) => ({ x: y, y: groups(atYear(rows, y))[0].share }));
    const y = latestYear(rv.rows);
    return { year: y, table: rv.table, rv: groups(atYear(rv.rows, y)), ma: groups(atYear(ma.rows, latestYear(ma.rows))), trend: { rv: hisp(rv.rows), ma: hisp(ma.rows) } };
  } });
}

function useTenure() {
  return useQuery({ queryKey: ["acs", "tenure"], ...STALE, queryFn: async () => {
    const [rv, ma] = await Promise.all([
      acs("acs_ygo_tenure_5", ["Year", "Occupied By"], "Household Ownership", REVERE),
      acs("acs_ygo_tenure_5", ["Year", "Occupied By"], "Household Ownership", MASS),
    ]);
    const M = "Household Ownership";
    const rent = (rows: Row[]) => years(rows).map((y) => { const r = atYear(rows, y); return { x: y, y: sum(r.filter((q) => q["Occupied By"] === "Renter Occupied"), M) / (sum(r, M) || 1) }; });
    const y = latestYear(rv.rows);
    const now = atYear(rv.rows, y);
    return { year: y, table: rv.table, owners: sum(now.filter((r) => r["Occupied By"] === "Owner Occupied"), M), renters: sum(now.filter((r) => r["Occupied By"] === "Renter Occupied"), M), trend: { rv: rent(rv.rows), ma: rent(ma.rows) } };
  } });
}

const ERA: Record<string, string> = { "Gulf War (2001-)": "Gulf War era, 2001 and later", "Gulf War (1990s)": "Gulf War era, 1990s", Vietnam: "Vietnam era", Korea: "Korean War", "World War II": "World War II", Other: "Other periods" };

function useVeterans() {
  return useQuery({ queryKey: ["acs", "veterans"], ...STALE, queryFn: async () => {
    const r = await acs("acs_ygv_veterans_5", ["Year", "Period of Service"], "Veterans", REVERE);
    const y = latestYear(r.rows);
    const now = atYear(r.rows, y).map((q) => ({ label: ERA[q["Period of Service"]] ?? q["Period of Service"], n: Number(q.Veterans) || 0 }));
    return { year: y, table: r.table, total: now.reduce((s, q) => s + q.n, 0), eras: now.filter((q) => q.n > 0) };
  } });
}

// ---------- Page ----------

export default function DemographicsPage() {
  const pop = usePopulation();
  const birth = useBirthplace();
  const cit = useCitizenship();
  const race = useRace();
  const ten = useTenure();
  const vet = useVeterans();

  const P = pop.data, B = birth.data, C = cit.data, R = race.data, T = ten.data, V = vet.data;
  const first = P?.series[0], last = P?.series[P.series.length - 1];
  const fbShare = B ? B.parts.foreign / B.total : null;
  const fbMa = B?.trend.ma[B.trend.ma.length - 1]?.y ?? null;
  const rentShare = T ? T.renters / (T.owners + T.renters) : null;
  const rentMa = T?.trend.ma[T.trend.ma.length - 1]?.y ?? null;
  const ageMed = P?.ageSeries[P.ageSeries.length - 1];

  return (
    <DashboardLayout pageTitle="Who lives here">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Residents" value={last ? n0(last.y) : null} note={P ? `Census estimate for ${span(P.year)}` : " "} />
          <Figure label="Born outside the U.S." accent value={fbShare != null ? pct(fbShare) : null} note={fbMa != null ? `Massachusetts: ${pct(fbMa)}` : " "} />
          <Figure label="Median age" value={ageMed ? ageMed.y.toFixed(1) : null} note={P ? `Massachusetts: ${P.ageMa.toFixed(1)}` : " "} />
          <Figure label="Households that rent" value={rentShare != null ? pct(rentShare) : null} note={rentMa != null ? `Massachusetts: ${pct(rentMa)}` : " "} />
        </section>

        <section className="grid gap-3 lg:grid-cols-12">
          <Section className="lg:col-span-7" title="Is Revere growing?" loading={pop.isLoading} error={pop.error} retry={() => pop.refetch()}
            source={P && { table: P.table, year: P.year }} question="How has Revere's population changed over the last decade?"
            finding={first && last && <>Revere had about {n0(Math.round(last.y / 100) * 100)} residents in the {span(last.x)} estimate, {pct(Math.abs(last.y / first.y - 1))} {last.y >= first.y ? "more" : "fewer"} than in {span(first.x)}. The step up in {span(2021)} mostly reflects the Census Bureau re-basing its estimates on the 2020 Census count, not a one-year boom.</>}>
            {P && <Columns points={P.series} fmt={n0} xLabel={span} />}
          </Section>

          <Section className="lg:col-span-5" title="What is Revere's ethnic and racial makeup?" loading={race.isLoading} error={race.error} retry={() => race.refetch()}
            source={R && { table: R.table, year: R.year }} question="How has Revere's Hispanic and Latino community grown?"
            finding={R && <>{pct(R.rv[0].share)} of residents are Hispanic or Latino, up from {pct(R.trend.rv[0].y)} in {span(R.trend.rv[0].x)}. Statewide the share is {pct(R.ma[0].share)}.</>}>
            {R && <>
              <Legend items={[{ label: "Revere", tone: "main" }, { label: "Massachusetts", tone: "n1", tick: true }]} />
              <Bars max={Math.max(...R.rv.map((g) => g.share), ...R.ma.map((g) => g.share))}
                items={R.rv.map((g, i) => ({ label: g.label, value: g.share, display: pct(g.share), compare: R.ma[i].share, compareDisplay: pct(R.ma[i].share), tone: i === 0 ? "accent" : "main" }))} />
              <p className="mt-4 text-[12.5px] text-muted-foreground">Groups other than Hispanic or Latino count people who are not Hispanic. Each person is counted once; the five rows add to 100%.</p>
              <div className="mt-5"><h3 className="mb-2 text-[14px] font-medium text-foreground">Hispanic or Latino share over time</h3>
                <Trend height={130} zero series={[{ name: "Revere", tone: "main", points: R.trend.rv }, { name: "Massachusetts", tone: "n1", points: R.trend.ma }]} fmt={(v) => pct(v)} xLabel={span} /></div>
            </>}
          </Section>

          <Section className="lg:col-span-7" title="Where were residents born?" loading={birth.isLoading} error={birth.error} retry={() => birth.refetch()}
            source={B && { table: B.table, year: B.year }} question="Where do Revere's immigrant residents come from?"
            finding={B && fbShare != null && fbMa != null && <>{pct(fbShare)} of Revere residents were born outside the U.S., {fbShare / fbMa >= 2 ? `more than twice the state's ${pct(fbMa)}` : `compared with ${pct(fbMa)} statewide`}. In {span(B.trend.rv[0].x)} it was {pct(B.trend.rv[0].y)}.</>}>
            {B && <>
              <Stack fmt={(v, s) => `${n0(v)} · ${pct(s)}`} parts={[
                { label: "Born in Massachusetts", value: B.parts.ma, tone: "n1" },
                { label: "Born in another state", value: B.parts.other, tone: "n2" },
                { label: "U.S. citizen at birth, born abroad or in a territory", value: B.parts.abroadUS, tone: "main" },
                { label: "Born in another country", value: B.parts.foreign, tone: "accent" },
              ]} />
              <div className="mt-6"><h3 className="mb-2 text-[14px] font-medium text-foreground">Share born in another country</h3>
                <Trend height={140} zero series={[{ name: "Revere", tone: "main", points: B.trend.rv }, { name: "Massachusetts", tone: "n1", points: B.trend.ma }]} fmt={(v) => pct(v)} xLabel={span} /></div>
            </>}
          </Section>

          <Section className="lg:col-span-5" title="Which countries are they from?" loading={birth.isLoading} error={birth.error} retry={() => birth.refetch()}
            source={B && { table: B.countries.table, year: B.countries.year }} question="What countries are Revere's immigrants from?"
            finding={B && B.countries.top.length > 1 && <>{B.countries.top[0].name} and {B.countries.top[1].name} together are the birthplace of {pct((B.countries.top[0].n + B.countries.top[1].n) / B.countries.total)} of the {n0(B.countries.total)} residents born abroad.</>}>
            {B && <>
              <Bars items={B.countries.top.map((c, i) => ({ label: c.name, value: c.n, display: n0(c.n), sub: pct(c.n / B.countries.total), tone: i === 0 ? "accent" : "main" }))} />
              <p className="mt-4 text-[12.5px] text-muted-foreground">The eight largest. This table counts {n0(B.countries.total)} foreign-born residents; the birthplace table above counts {n0(B.parts.foreign)}, because the two are separate estimates.</p>
            </>}
          </Section>

          <Section className="lg:col-span-7" title="How old are residents?" loading={birth.isLoading} error={birth.error} retry={() => birth.refetch()}
            source={B && { table: B.table, year: B.year }} question="What is the age breakdown of Revere's residents?"
            finding={B && (() => {
              const kids = B.ages[0].total / B.total, old = (B.ages[6].total + B.ages[7].total) / B.total;
              const prime = B.ages.slice(2, 5), pa = prime.reduce((s, a) => s + a.abroad, 0) / (prime.reduce((s, a) => s + a.total, 0) || 1);
              return <>{pct(kids)} of residents are under 18 and {pct(old)} are 65 or older. Among adults 25 to 54, {pct(pa)} were born in another country.</>;
            })()}>
            {B && <AgeRows ages={B.ages} />}
          </Section>

          <Section className="lg:col-span-5" title="How many residents are U.S. citizens?" loading={cit.isLoading} error={cit.error} retry={() => cit.refetch()}
            source={C && { table: C.table, year: C.year }} question="How many Revere residents are not U.S. citizens, and what does that mean for voting?"
            finding={C && <>{pct(C.rv.non / C.rv.total)} of residents are not U.S. citizens, compared with {pct(C.ma.non / C.ma.total)} statewide. Of residents who immigrated, {pct(C.rv.naturalized / (C.rv.naturalized + C.rv.non))} have become citizens.</>}>
            {C && <Stack fmt={(v, s) => `${n0(v)} · ${pct(s)}`} parts={[
              { label: "Citizen from birth", value: C.rv.bornUS, tone: "n1" },
              { label: "Became a citizen", value: C.rv.naturalized, tone: "main" },
              { label: "Not a citizen", value: C.rv.non, tone: "accent" },
            ]} />}
          </Section>

          <Section className="lg:col-span-7" title="Do most households own or rent?" loading={ten.isLoading} error={ten.error} retry={() => ten.refetch()}
            source={T && { table: T.table, year: T.year }} question="Is renting more common in Revere than in the rest of Massachusetts?"
            finding={T && rentShare != null && rentMa != null && <>{pct(rentShare)} of Revere's {n0(T.owners + T.renters)} households rent their home, compared with {pct(rentMa)} across Massachusetts.</>}>
            {T && <>
              <Stack fmt={(v, s) => `${n0(v)} · ${pct(s)}`} parts={[{ label: "Rent", value: T.renters, tone: "main" }, { label: "Own", value: T.owners, tone: "n1" }]} />
              <div className="mt-6"><h3 className="mb-2 text-[14px] font-medium text-foreground">Share of households that rent</h3>
                <Trend height={130} zero series={[{ name: "Revere", tone: "main", points: T.trend.rv }, { name: "Massachusetts", tone: "n1", points: T.trend.ma }]} fmt={(v) => pct(v)} xLabel={span} /></div>
            </>}
          </Section>

          <Section className="lg:col-span-5" title="How many veterans live here?" loading={vet.isLoading} error={vet.error} retry={() => vet.refetch()}
            source={V && { table: V.table, year: V.year }} question="What services are available for veterans in Revere?"
            finding={V && <>{n0(V.total)} residents are military veterans. By when they served:</>}>
            {V && <Bars items={V.eras.map((e) => ({ label: e.label, value: e.n, display: n0(e.n) }))} />}
          </Section>
        </section>

        <SourceNote q="What does the Census say about who lives in Revere?" />
      </div>
    </DashboardLayout>
  );
}

function AgeRows({ ages }: { ages: { label: string; total: number; abroad: number }[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...ages.map((a) => a.total));
  return (
    <div>
      <Legend items={[{ label: "Born in another country", tone: "main" }, { label: "Born in the U.S. or a territory", tone: "n2" }]} />
      <ul className="space-y-2.5">
        {ages.map((a, i) => (
          <li key={a.label} title={`${a.label}: ${n0(a.total)} residents, ${n0(a.abroad)} born abroad`}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="text-foreground">{a.label}</span>
              <span className="figure text-foreground">{n0(a.total)}<span className="ml-1.5 text-[12.5px] text-muted-foreground">{pct(a.abroad / (a.total || 1))} born abroad</span></span>
            </div>
            <motion.div className="mt-1.5 flex h-2 gap-[2px] overflow-hidden" initial={reduce ? false : { width: 0 }} animate={{ width: `${(a.total / max) * 100}%` }} transition={{ delay: i * 0.04, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <span className="h-full rounded-l-full bg-highlight" style={{ width: `${(a.abroad / (a.total || 1)) * 100}%` }} />
              <span className="h-full flex-1 rounded-r-full bg-foreground/15" />
            </motion.div>
          </li>
        ))}
      </ul>
    </div>
  );
}
