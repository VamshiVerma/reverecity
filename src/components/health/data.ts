import { MASS, REVERE, Row, tesseract } from "@/components/commute/kit";

// Coverage: ACS table B27010 via DataUSA, grouped the Kaiser Family Foundation way so each person is
// counted once (people with Medicare and Medicaid count under Medicaid). Groups add up to the
// civilian population not living in institutions.
// Adult health: CDC PLACES, model-based estimates from the Behavioral Risk Factor Surveillance System.

export type Cov = "Employer" | "Medicaid" | "Medicare" | "NonGroup" | "OtherPublic" | "Uninsured";
export const COVERAGE: { id: Cov; label: string; hint: string }[] = [
  { id: "Employer", label: "Through a job", hint: "Employer-based coverage, their own or a family member's" },
  { id: "Medicaid", label: "MassHealth (Medicaid)", hint: "Medicaid and other means-tested public coverage, including people who also have Medicare" },
  { id: "Medicare", label: "Medicare", hint: "Medicare without Medicaid" },
  { id: "NonGroup", label: "Bought on their own", hint: "Direct-purchase plans, including Massachusetts Health Connector plans" },
  { id: "OtherPublic", label: "Military or VA", hint: "TRICARE and VA health care" },
  { id: "Uninsured", label: "No insurance", hint: "No health coverage of any kind" },
];

export type CovYear = { year: number; total: number; c: Record<Cov, number> };
const blank = (): Record<Cov, number> => ({ Employer: 0, Medicaid: 0, Medicare: 0, NonGroup: 0, OtherPublic: 0, Uninsured: 0 });
const M = "Health Insurance Policies";

function byYear(rows: Row[]): CovYear[] {
  const m = new Map<number, CovYear>();
  for (const r of rows) {
    const e = m.get(r.Year) ?? { year: r.Year, total: 0, c: blank() };
    const k = r["Kaiser Coverage"] as Cov;
    const v = Number(r[M]) || 0;
    if (k in e.c) e.c[k] += v;
    e.total += v;
    m.set(r.Year, e);
  }
  return [...m.values()].sort((a, b) => a.year - b.year);
}

function byAge(rows: Row[]) {
  const y = Math.max(...rows.map((r) => r.Year));
  const m = new Map<string, { age: string; id: number; total: number; uninsured: number }>();
  for (const r of rows.filter((r) => r.Year === y)) {
    const e = m.get(r.Age) ?? { age: r.Age, id: r["Age ID"], total: 0, uninsured: 0 };
    const v = Number(r[M]) || 0;
    e.total += v;
    if (r["Kaiser Coverage"] === "Uninsured") e.uninsured += v;
    m.set(r.Age, e);
  }
  return { year: y, ages: [...m.values()].sort((a, b) => a.id - b.id) };
}

export type NetYear = { year: number; total: number; sub: number; noSub: number; none: number };
function internet(rows: Row[]): NetYear[] {
  const m = new Map<number, NetYear>();
  for (const r of rows) {
    const e = m.get(r.Year) ?? { year: r.Year, total: 0, sub: 0, noSub: 0, none: 0 };
    const v = Number(r["Households by Internet Access"]) || 0;
    const id = r["Access Group ID"];
    if (id === 0) e.sub += v; else if (id === 1) e.noSub += v; else e.none += v;
    e.total += v;
    m.set(r.Year, e);
  }
  // Keep only years where all three groups were reported, so shares are of a full total.
  return [...m.values()].filter((e) => e.sub > 0 && e.none > 0).sort((a, b) => a.year - b.year);
}

export async function loadCoverage() {
  const cube = "acs_ygh_health_care_coverage_overall_5";
  const net = "acs_ygh_households_with_no_internet_2016_5";
  const [cR, cM, aR, aM, nR, nM] = await Promise.all([
    tesseract(cube, ["Year", "Kaiser Coverage"], M, REVERE),
    tesseract(cube, ["Year", "Kaiser Coverage"], M, MASS),
    tesseract(cube, ["Year", "Age", "Kaiser Coverage"], M, REVERE),
    tesseract(cube, ["Year", "Age", "Kaiser Coverage"], M, MASS),
    tesseract(net, ["Year", "Access Group"], "Households by Internet Access", REVERE),
    tesseract(net, ["Year", "Access Group"], "Households by Internet Access", MASS),
  ]);
  return {
    cov: { revere: byYear(cR), mass: byYear(cM) },
    age: { revere: byAge(aR), mass: byAge(aM) },
    net: { revere: internet(nR), mass: internet(nM) },
  };
}

// ---------- CDC PLACES ----------
export type Measure = { id: string; label: string; group: string; year: string; value: number; lo: number; hi: number; county?: number };
const PLACES_PLACE = "https://data.cdc.gov/resource/eav7-hnsx.json"; // Place data, 2025 release
const PLACES_COUNTY = "https://data.cdc.gov/resource/swc5-untb.json"; // County data, 2025 release

export const GROUPS: { id: string; label: string; match: string; what: string }[] = [
  { id: "conditions", label: "Conditions", match: "Health Outcomes", what: "chronic conditions" },
  { id: "care", label: "Checkups", match: "Prevention", what: "preventive care measures" },
  { id: "habits", label: "Habits", match: "Health Risk Behaviors", what: "habits" },
  { id: "status", label: "How people feel", match: "Health Status", what: "self-rated health measures" },
  { id: "needs", label: "Everyday needs", match: "Health-Related Social Needs", what: "everyday needs" },
  { id: "disability", label: "Disability", match: "Disability", what: "disability measures" },
];

// Plain names. Anything not listed falls back to CDC's short label.
const LABEL: Record<string, string> = {
  HIGHCHOL: "High cholesterol (of those screened)", BPHIGH: "High blood pressure", OBESITY: "Obesity", DEPRESSION: "Ever told they have depression",
  ARTHRITIS: "Arthritis", CASTHMA: "Asthma", DIABETES: "Diabetes", CANCER: "Ever had cancer (not skin)", COPD: "COPD", CHD: "Coronary heart disease",
  STROKE: "Ever had a stroke", TEETHLOST: "Lost all their teeth (65 and older)",
  CHECKUP: "Checkup in the past year", CHOLSCREEN: "Cholesterol checked in the past 5 years", DENTAL: "Dentist visit in the past year",
  MAMMOUSE: "Mammogram in the past 2 years (women 50–74)", COLON_SCREEN: "Up to date on colon cancer screening (45–75)", BPMED: "Taking blood pressure medicine (of those with high blood pressure)",
  LPA: "No exercise outside of work", SLEEP: "Sleeps less than 7 hours", BINGE: "Binge drinking", CSMOKING: "Smokes cigarettes",
  GHLTH: "Says their health is fair or poor", MHLTH: "Mental health not good 14+ days a month", PHLTH: "Physical health not good 14+ days a month",
  LONELINESS: "Feels lonely", EMOTIONSPT: "Lacks social or emotional support", FOODSTAMP: "Got SNAP (food stamps) in the past year", FOODINSECU: "Ran short of food",
  HOUSINSECU: "Couldn't pay rent or mortgage on time", LACKTRPT: "Lacked reliable transportation", SHUTUTILITY: "Threatened with a utility shutoff",
  DISABILITY: "Any disability", COGNITION: "Trouble concentrating or remembering", MOBILITY: "Trouble walking or climbing stairs", INDEPLIVE: "Trouble doing errands alone",
  HEARING: "Deaf or serious trouble hearing", VISION: "Blind or serious trouble seeing", SELFCARE: "Trouble dressing or bathing",
};
// ACS (above) is the better source for insurance; PLACES' modeled figure covers only ages 18–64 and would contradict it.
const SKIP = new Set(["ACCESS2"]);

export async function loadPlaces() {
  const q = (u: string, id: string) => fetch(`${u}?locationid=${id}&datavaluetypeid=CrdPrv&$limit=200`).then((r) => { if (!r.ok) throw new Error(`CDC ${r.status}`); return r.json(); });
  const [place, county] = await Promise.all([q(PLACES_PLACE, "2556585"), q(PLACES_COUNTY, "25025")]);
  if (!Array.isArray(place) || !place.length) throw new Error("CDC PLACES returned no rows");
  const cty = new Map<string, number>((county as any[]).map((r) => [r.measureid, Number(r.data_value)]));
  const measures: Measure[] = (place as any[]).filter((r) => !SKIP.has(r.measureid) && r.data_value != null).map((r) => ({
    id: r.measureid, label: LABEL[r.measureid] ?? r.short_question_text, group: GROUPS.find((g) => g.match === r.category)?.id ?? "other",
    year: r.year, value: Number(r.data_value) / 100, lo: Number(r.low_confidence_limit) / 100, hi: Number(r.high_confidence_limit) / 100,
    county: cty.has(r.measureid) ? cty.get(r.measureid)! / 100 : undefined,
  }));
  const years = [...new Set(measures.map((m) => m.year))].sort();
  return { measures, years, adults: Number((place as any[])[0]?.totalpop18plus) || null };
}
