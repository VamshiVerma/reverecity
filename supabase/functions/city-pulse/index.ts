// "City pulse" — ranked live headline items for the broadcast ticker.
// Sources: MBTA v3 alerts (Blue Line + Revere bus routes), National Weather Service
// alerts, current weather, notable calls from the latest Revere PD public log,
// and next Blue Line departures. Cached at the edge for 2 minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Item = { id: string; kind: "mbta" | "weather" | "police" | "city"; level: "breaking" | "alert" | "info"; tag: string; text: string; at?: string; href?: string };

const cap = (s: string) => s.toLowerCase().replace(/(^|[\s/,(-])([a-z])/g, (_m, p, c) => p + c.toUpperCase()).replace(/\b(Mva|Mbta|Oic)\b/g, (w) => w.toUpperCase());
const NOTABLE: Record<string, string> = {
  VIOLENCE_THREATS: "Public safety", DOMESTIC: "Public safety", THEFT_PROPERTY: "Property crime", CRASH: "Crash", MISSING_PERSON: "Missing person",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const items: Item[] = [];

  const [mbta, wx, police] = await Promise.all([
    fetch("https://api-v3.mbta.com/alerts?filter[route]=Blue,110,116,117,119,411,426,450&filter[datetime]=NOW").then((r) => r.json()).catch(() => ({ data: [] })),
    supabase.from("weather_data").select("fetched_at,data").order("fetched_at", { ascending: false }).limit(1),
    supabase.from("police_logs").select("log_date").order("log_date", { ascending: false }).limit(1),
  ]);

  // MBTA
  for (const a of mbta.data || []) {
    const at = a.attributes;
    const blue = (a.relationships?.informed_entity ?? at.informed_entity ?? []).some?.((e: any) => e.route === "Blue") ?? /blue line/i.test(at.header);
    const severe = /SUSPENSION|SHUTTLE|STATION_CLOSURE/.test(at.effect) && (blue || at.severity >= 7) || at.severity >= 9;
    items.push({
      id: `mbta-${a.id}`, kind: "mbta", level: severe ? "breaking" : "alert",
      tag: at.effect === "DETOUR" ? "Detour" : cap(String(at.effect).replace(/_/g, " ")),
      text: at.short_header || at.header, at: at.updated_at, href: "https://www.mbta.com/alerts",
    });
  }

  // Weather
  let wrow = wx.data?.[0];
  if (!wrow || Date.now() - new Date(wrow.fetched_at).getTime() > 60 * 60e3) {
    try { await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-weather`, { method: "POST" }); } catch (_) { /* best effort */ }
    const again = await supabase.from("weather_data").select("fetched_at,data").order("fetched_at", { ascending: false }).limit(1);
    wrow = again.data?.[0] ?? wrow;
  }
  if (wrow) {
    const d = wrow.data;
    for (const a of d.alerts || []) {
      items.push({ id: `nws-${a.event}-${a.onset}`, kind: "weather", level: /Severe|Extreme/.test(a.severity) ? "breaking" : "alert", tag: a.event, text: a.headline, at: a.onset, href: "https://alerts.weather.gov" });
    }
    const c = d.currentConditions, t = d.days?.[0], n = d.days?.[1];
    if (c) items.push({ id: "wx-now", kind: "weather", level: "info", tag: "Weather", text: `${Math.round(c.temp)}°F and ${String(c.conditions).toLowerCase()} in Revere${t ? ` · high ${Math.round(t.tempmax)}°, low ${Math.round(t.tempmin)}°` : ""}${n ? ` · tomorrow ${String(n.conditions).toLowerCase()}, ${n.precipprob}% chance of precipitation` : ""}`, at: wrow.fetched_at, href: "/weather" });
  }

  // Police — notable calls from the most recent 2 log days
  const latest = police.data?.[0]?.log_date as string | undefined;
  if (latest) {
    const since = new Date(new Date(latest).getTime() - 864e5).toISOString().slice(0, 10);
    const { data: rows } = await supabase.from("police_logs")
      .select("call_number,log_date,time_24h,call_reason,action,call_type_category,action_category,location_street")
      .gte("log_date", since).order("timestamp", { ascending: false }).limit(400);
    const notable = (rows || []).filter((r) => NOTABLE[r.call_type_category] || r.action_category === "ARREST").slice(0, 6);
    for (const r of notable) {
      const when = new Date(r.log_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      items.push({
        id: `pd-${r.call_number}`, kind: "police", level: "info", tag: r.action_category === "ARREST" ? "Arrest" : NOTABLE[r.call_type_category] || "Police",
        text: `${cap(r.call_reason)}${r.location_street ? " on " + cap(r.location_street) : ""} — ${cap(r.action).toLowerCase()} (${when}, ${r.time_24h.slice(0, 2)}:${r.time_24h.slice(2)})`,
        at: r.log_date, href: "/police-logs",
      });
    }
    items.push({ id: "pd-fresh", kind: "city", level: "info", tag: "Police log", text: `${(rows || []).length} calls in the latest Revere PD public log, through ${new Date(latest + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}`, at: latest, href: "/police-logs" });
  }

  const order = { breaking: 0, alert: 1, info: 2 } as const;
  items.sort((a, b) => order[a.level] - order[b.level]);

  return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), items }), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=120" },
  });
});
