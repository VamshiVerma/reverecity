// Vercel Cron: runs daily. Pulls any newly posted Revere PD log, refreshes weather,
// and keeps the Supabase project active (free projects pause after ~7 idle days).
const FN = `${process.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co"}/functions/v1`;

export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const run = async (name: string, path: string) => {
    const t = Date.now();
    try {
      const r = await fetch(`${FN}/${path}`, { method: "POST" });
      const body = await r.json().catch(() => ({}));
      return { name, ok: r.ok, ms: Date.now() - t, body };
    } catch (e: any) {
      return { name, ok: false, ms: Date.now() - t, error: String(e?.message || e) };
    }
  };
  const results = await Promise.all([run("police", "sync-police-logs?max=2"), run("weather", "fetch-weather")]);
  res.status(results.every((r) => r.ok) ? 200 : 207).json({ ranAt: new Date().toISOString(), results });
}

export const config = { maxDuration: 60 };
