// American Community Survey 5-year estimates, read from Data USA's public Tesseract API (no key, CORS open).
const BASE = "https://api-ts.datausa.io/tesseract/data.jsonrecords";

export type Geo = { level: "Place" | "State"; id: string; name: string };
export const REVERE: Geo = { level: "Place", id: "16000US2556585", name: "Revere" };
export const MASS: Geo = { level: "State", id: "04000US25", name: "Massachusetts" };

export type Row = Record<string, any>;
export type Result = { rows: Row[]; table: string };

/** One cube, one place. `drill` is the list of non-geography levels; `cuts` adds include filters like "Race:0". */
export async function acs(cube: string, drill: string[], measure: string, geo: Geo, cuts: string[] = []): Promise<Result> {
  const p = new URLSearchParams({
    cube,
    drilldowns: [...drill, geo.level].join(","),
    measures: measure,
    include: [`${geo.level}:${geo.id}`, ...cuts].join(";"),
  });
  const res = await fetch(`${BASE}?${p}`);
  if (!res.ok) throw new Error(`Data USA returned ${res.status} for ${cube}`);
  const j = await res.json();
  const rows: Row[] = j.data ?? [];
  if (!rows.length) throw new Error(`No rows for ${cube}`);
  return { rows, table: String(j.annotations?.table_id ?? "").split(",")[0] };
}

export const latestYear = (rows: Row[]) => Math.max(...rows.map((r) => Number(r.Year)));
export const atYear = (rows: Row[], y: number) => rows.filter((r) => Number(r.Year) === y);
export const years = (rows: Row[]) => [...new Set(rows.map((r) => Number(r.Year)))].sort((a, b) => a - b);
export const sum = (rows: Row[], m: string) => rows.reduce((s, r) => s + (Number(r[m]) || 0), 0);

/** The 5-year estimate labelled 2024 covers 2020 through 2024. */
export const span = (y: number) => `${y - 4}–${y}`;
export const acsLabel = (y: number) => `ACS ${span(y)} 5-year estimates`;

export const n0 = (v: number) => Math.round(v).toLocaleString("en-US");
export const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;
export const usdK = (v: number) => `$${Math.round(v / 1000)}k`;
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

/** "about half", "about 1 in 4" — plain words for a share, used in finding sentences. */
export function inWords(share: number) {
  const opts: [number, string][] = [[1 / 2, "about half"], [1 / 3, "about 1 in 3"], [2 / 3, "about 2 in 3"], [1 / 4, "about 1 in 4"], [3 / 4, "about 3 in 4"], [1 / 5, "about 1 in 5"], [1 / 6, "about 1 in 6"], [1 / 8, "about 1 in 8"], [1 / 10, "about 1 in 10"]];
  const best = opts.reduce((a, b) => (Math.abs(b[0] - share) < Math.abs(a[0] - share) ? b : a));
  return Math.abs(best[0] - share) < 0.025 ? best[1] : pct(share);
}

export const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));
