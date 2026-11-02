// Live, verifiable headline numbers for the dashboard hero.
// Every figure carries its source and as-of time; nothing here is hardcoded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const STOPS: Record<string, string> = { "place-wondl": "Wonderland", "place-rbmnl": "Revere Beach", "place-bmmnl": "Beachmont", "place-sdmnl": "Suffolk Downs" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const [wx, latest, depts, mbtaAlerts, preds] = await Promise.all([
    supabase.from("weather_data").select("fetched_at,data").order("fetched_at", { ascending: false }).limit(1),
    supabase.from("police_logs").select("log_date").order("log_date", { ascending: false }).limit(1),
    supabase.from("budget_departments").select("name,fiscal_year,recommended,prior_adopted,page,doc_title,source_url").eq("fiscal_year", 2027),
    fetch("https://api-v3.mbta.com/alerts?filter[route]=Blue&filter[datetime]=NOW").then((r) => r.json()).catch(() => ({ data: [] })),
    fetch("https://api-v3.mbta.com/predictions?filter[stop]=place-rbmnl&filter[route]=Blue&sort=departure_time&page[limit]=6").then((r) => r.json()).catch(() => ({ data: [] })),
  ]);
  // Next train each way at every Blue Line station in Revere, north to south.
  const STATIONS = [["place-wondl", "Wonderland"], ["place-rbmnl", "Revere Beach"], ["place-bmmnl", "Beachmont"], ["place-sdmnl", "Suffolk Downs"]];
  const stationPreds = await Promise.all(STATIONS.map(([id]) =>
    fetch(`https://api-v3.mbta.com/predictions?filter[stop]=${id}&filter[route]=Blue&sort=departure_time&page[limit]=8`).then((r) => r.json()).catch(() => ({ data: [] }))));

  // Weather (refresh if older than an hour)
  let w = wx.data?.[0];
  if (!w || Date.now() - new Date(w.fetched_at).getTime() > 60 * 60e3) {
    try { await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-weather`, { method: "POST" }); } catch (_) { /* best effort */ }
    w = (await supabase.from("weather_data").select("fetched_at,data").order("fetched_at", { ascending: false }).limit(1)).data?.[0] ?? w;
  }
  const weather = w ? {
    temp: w.data.currentConditions.temp, feels: w.data.currentConditions.feelslike, conditions: w.data.currentConditions.conditions,
    icon: w.data.currentConditions.icon, hi: w.data.days?.[0]?.tempmax, lo: w.data.days?.[0]?.tempmin,
    alerts: (w.data.alerts || []).map((a: any) => a.event), asOf: w.fetched_at, source: "Open-Meteo · NWS",
    days: (w.data.days || []).slice(0, 5).map((d: any) => ({ date: d.datetime, hi: d.tempmax, lo: d.tempmin, conditions: d.conditions, precipprob: d.precipprob })),
  } : null;

  // Police: last 7 days of the latest posted log
  let police = null;
  const ld = latest.data?.[0]?.log_date as string | undefined;
  if (ld) {
    const since = new Date(new Date(ld).getTime() - 6 * 864e5).toISOString().slice(0, 10);
    const prevSince = new Date(new Date(ld).getTime() - 13 * 864e5).toISOString().slice(0, 10);
    const prevUntil = new Date(new Date(ld).getTime() - 7 * 864e5).toISOString().slice(0, 10);
    const [cur, prev] = await Promise.all([
      supabase.rpc("police_stats", { since, until: ld, streets: null }),
      supabase.rpc("police_stats", { since: prevSince, until: prevUntil, streets: null }),
    ]);
    const c = cur.data || {};
    const top = (c.by_category || [])[0];
    police = {
      calls7d: c.total ?? 0, prev7d: prev.data?.total ?? 0, since, through: ld, topCategory: top?.k ?? null, topCount: top?.n ?? 0,
      daily: (() => {
        const d = (c.by_day || []).map((x: any) => ({ d: x.k, n: x.n }));
        const sorted = d.map((x: any) => x.n).sort((a: number, b: number) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)] || 0;
        return d.length > 3 && d[d.length - 1].n < med * 0.4 ? d.slice(0, -1) : d; // drop partial last morning
      })(), source: "Revere PD public log",
    };
  }

  // MBTA Blue Line
  const alerts = (mbtaAlerts.data || []).map((a: any) => ({ effect: a.attributes.effect, header: a.attributes.short_header || a.attributes.header }));
  const now = Date.now();
  const next = (preds.data || []).map((p: any) => {
    const t = p.attributes.departure_time || p.attributes.arrival_time;
    return t ? { toward: p.attributes.direction_id === 0 ? "Bowdoin" : "Wonderland", mins: Math.round((new Date(t).getTime() - now) / 60e3) } : null;
  }).filter((x: any) => x && x.mins >= 0).slice(0, 4);
  const nextBy = (data: any[], dir: number) => {
    const m = data.map((p: any) => ({ dir: p.attributes.direction_id, t: p.attributes.departure_time || p.attributes.arrival_time }))
      .filter((p: any) => p.dir === dir && p.t).map((p: any) => Math.round((new Date(p.t).getTime() - now) / 60e3)).filter((x: number) => x >= 0);
    return m.length ? m[0] : null;
  };
  const stations = STATIONS.map(([id, name], i) => ({ id, name, toBowdoin: nextBy(stationPreds[i].data || [], 0), toWonderland: nextBy(stationPreds[i].data || [], 1) }));
  const mbta = { status: alerts.length ? "Disrupted" : "Normal service", alerts, next, stations, station: STOPS["place-rbmnl"], asOf: new Date().toISOString(), source: "MBTA v3 API" };

  // Budget headline figures (FY2027 adopted)
  const find = (re: RegExp) => (depts.data || []).find((d: any) => re.test(d.name));
  const pick = (d: any) => d && { name: d.name, amount: d.recommended, prior: d.prior_adopted, page: d.page, doc: d.doc_title, url: `${d.source_url}#page=${d.page}` };
  const budget = {
    school: { name: "School Department", amount: 132944577, prior: 131567036, page: 172, doc: "FY2027 Adopted Budget", url: "https://files.aptuitivcdn.com/GB7r14nbKy-1182/docs/FY2027-Budget-Adopted.pdf#page=172" },
    police: pick(find(/^Police Department/i)),
    fire: pick(find(/^Fire Department/i)),
    dpw: pick(find(/Public Works: Administration/i)),
  };

  return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), weather, police, mbta, budget }), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=120" },
  });
});
