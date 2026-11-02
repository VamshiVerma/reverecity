import { MASS, REVERE, Row, tesseract } from "./kit";

// ACS 5-year commuting tables via DataUSA. Every share is computed from counts in the same table,
// so the groups below always add up to the table's total.

export type Mode = "alone" | "carpool" | "rail" | "bus" | "walk" | "bike" | "other" | "home";
export const MODES: { id: Mode; label: string }[] = [
  { id: "alone", label: "Drove alone" },
  { id: "carpool", label: "Carpooled" },
  { id: "rail", label: "Subway or train" },
  { id: "bus", label: "Bus" },
  { id: "home", label: "Worked from home" },
  { id: "walk", label: "Walked" },
  { id: "bike", label: "Bicycle" },
  { id: "other", label: "Taxi, motorcycle or other" },
];

// DataUSA names table B08301's lines by position, and the Census reordered the rail lines in 2019
// (so "Streetcar" holds subway riders from then on). Summing every rail line avoids the mislabel.
function modeOf(name: string): Mode {
  const n = name.toLowerCase();
  if (n === "drove alone") return "alone";
  if (n.includes("carpool")) return "carpool";
  if (n.startsWith("bus")) return "bus";
  if (n.includes("streetcar") || n.includes("subway") || n.includes("railroad") || n.includes("ferry")) return "rail";
  if (n === "walked") return "walk";
  if (n === "bicycle") return "bike";
  if (n === "worked at home") return "home";
  return "other"; // taxi, motorcycle, other means
}

export type ModeYear = { year: number; total: number; counts: Record<Mode, number> };
const emptyCounts = (): Record<Mode, number> => ({ alone: 0, carpool: 0, rail: 0, bus: 0, walk: 0, bike: 0, other: 0, home: 0 });

function modesByYear(rows: Row[]): ModeYear[] {
  const m = new Map<number, ModeYear>();
  for (const r of rows) {
    const y = r.Year as number;
    const e = m.get(y) ?? { year: y, total: 0, counts: emptyCounts() };
    const v = Number(r["Commute Means"]) || 0;
    e.counts[modeOf(r["Transportation Means"])] += v;
    e.total += v;
    m.set(y, e);
  }
  return [...m.values()].sort((a, b) => a.year - b.year);
}

export type Bin = { label: string; short: string; n: number };
const binShort = (s: string) => s.replace(/ Minutes/, "").replace("< 5", "<5");
function latest(rows: Row[]) { const y = Math.max(...rows.map((r) => r.Year)); return { y, rows: rows.filter((r) => r.Year === y) }; }

export type CommuteData = Awaited<ReturnType<typeof loadCommute>>;

export async function loadCommute() {
  const cube = {
    means: "acs_ygt_means_of_transportation_to_work_5",
    mean: "acs_ygt_mean_transportation_time_to_work_5",
    time: "acs_ygt_travel_time_to_work_5",
    cars: "acs_ygsv_gender_of_workers_by_vehicles_available_5",
  };
  const [mR, mM, tR, tM, dR, dM, cR, cM] = await Promise.all([
    tesseract(cube.means, ["Year", "Transportation Means"], "Commute Means", REVERE),
    tesseract(cube.means, ["Year", "Transportation Means"], "Commute Means", MASS),
    tesseract(cube.mean, ["Year"], "Average Commute Time", REVERE),
    tesseract(cube.mean, ["Year"], "Average Commute Time", MASS),
    tesseract(cube.time, ["Year", "Travel Time"], "Commuter Population", REVERE),
    tesseract(cube.time, ["Year", "Travel Time"], "Commuter Population", MASS),
    tesseract(cube.cars, ["Year", "Vehicles Available"], "Commute Means by Gender", REVERE),
    tesseract(cube.cars, ["Year", "Vehicles Available"], "Commute Means by Gender", MASS),
  ]);

  const avg = (rows: Row[]) => rows.map((r) => ({ x: r.Year as number, y: Number(r["Average Commute Time"]) })).sort((a, b) => a.x - b.x);
  const bins = (rows: Row[]) => {
    const l = latest(rows);
    const b: Bin[] = l.rows.sort((a, b) => a["Travel Time ID"] - b["Travel Time ID"]).map((r) => ({ label: r["Travel Time"], short: binShort(r["Travel Time"]), n: Number(r["Commuter Population"]) || 0 }));
    return { year: l.y, bins: b, total: b.reduce((s, x) => s + x.n, 0) };
  };
  const cars = (rows: Row[]) => {
    const l = latest(rows);
    const b = l.rows.sort((a, b) => a["Vehicles Available ID"] - b["Vehicles Available ID"]).map((r) => ({ id: r["Vehicles Available ID"] as number, n: Number(r["Commute Means by Gender"]) || 0 }));
    // Three or more cars are folded together; few households have more.
    const g = [
      { key: "0", label: "No vehicle", n: b.filter((x) => x.id === 0).reduce((s, x) => s + x.n, 0) },
      { key: "1", label: "One vehicle", n: b.filter((x) => x.id === 1).reduce((s, x) => s + x.n, 0) },
      { key: "2", label: "Two vehicles", n: b.filter((x) => x.id === 2).reduce((s, x) => s + x.n, 0) },
      { key: "3", label: "Three or more", n: b.filter((x) => x.id >= 3).reduce((s, x) => s + x.n, 0) },
    ];
    return { year: l.y, groups: g, total: g.reduce((s, x) => s + x.n, 0) };
  };

  return {
    modes: { revere: modesByYear(mR), mass: modesByYear(mM) },
    avg: { revere: avg(tR), mass: avg(tM) },
    time: { revere: bins(dR), mass: bins(dM) },
    cars: { revere: cars(cR), mass: cars(cM) },
  };
}
