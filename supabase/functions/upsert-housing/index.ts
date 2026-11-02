// Upserts Zillow ZHVI/ZORI rows for the Revere area. Called monthly by the Vercel cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.headers.get("x-ingest-token") !== Deno.env.get("INGEST_TOKEN")) return new Response("forbidden", { status: 403 });
  const { rows } = await req.json();
  if (!Array.isArray(rows) || !rows.length) return Response.json({ upserted: 0 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const clean = rows
    .filter((r: any) => /^\d{5}$/.test(r.zip) && (r.metric === "zhvi" || r.metric === "zori") && /^\d{4}-\d{2}-\d{2}$/.test(r.month) && Number.isFinite(r.value))
    .map((r: any) => ({ zip: r.zip, place: String(r.place).slice(0, 40), metric: r.metric, month: r.month, value: Math.round(r.value) }));
  const { error } = await sb.from("housing_market").upsert(clean, { onConflict: "zip,metric,month" });
  return Response.json({ upserted: error ? 0 : clean.length, error: error?.message });
});
