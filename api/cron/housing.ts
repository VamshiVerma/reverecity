// Vercel Cron: monthly. Zillow publishes ZHVI (home values) and ZORI (rents) mid-month as large CSVs;
// stream them, keep only Revere-area ZIP codes, and upsert via the upsert-housing edge function.
const FN = `${process.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co"}/functions/v1`;
const ZIPS: Record<string, string> = { "02151": "Revere", "02150": "Chelsea", "02149": "Everett", "02148": "Malden", "02152": "Winthrop", "01902": "Lynn", "02128": "East Boston" };
const FILES = [
  { metric: "zhvi", url: "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv" },
  { metric: "zori", url: "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv" },
];

function parseLine(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out;
}

async function extract(url: string, metric: string) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`${metric}: HTTP ${r.status}`);
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "", header: string[] | null = null;
  const rows: any[] = [];
  const cutoff = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10); // last ~13 months is enough to refresh
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!header) { header = parseLine(line); continue; }
      const m = line.match(/^\d+,\d+,"?(\d{5})"?,/);
      if (!m || !ZIPS[m[1]]) continue;
      const cols = parseLine(line);
      header.forEach((h, j) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(h) && h >= cutoff && cols[j]) rows.push({ zip: m[1], place: ZIPS[m[1]], metric, month: h, value: Number(cols[j]) });
      });
    }
  }
  return rows;
}

export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "unauthorized" });
  const out: any[] = [];
  for (const f of FILES) {
    try {
      const rows = await extract(f.url, f.metric);
      const r = await fetch(`${FN}/upsert-housing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-ingest-token": process.env.INGEST_TOKEN || "" },
        body: JSON.stringify({ rows }),
      });
      out.push({ metric: f.metric, found: rows.length, result: await r.json().catch(() => r.status) });
    } catch (e: any) {
      out.push({ metric: f.metric, error: String(e?.message || e) });
    }
  }
  res.status(200).json({ ranAt: new Date().toISOString(), out });
}

export const config = { maxDuration: 60 };
