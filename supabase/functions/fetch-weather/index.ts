// Fetches Revere weather from Open-Meteo (no API key) plus active National Weather
// Service alerts, maps it to the Visual-Crossing-compatible shape the frontend uses,
// and stores it in public.weather_data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const LAT = 42.4084, LON = -71.012;
const TZ = "America/New_York";

// WMO weather code -> [conditions text, Visual Crossing icon id]
function wmo(code: number, isDay = true): [string, string] {
  const d = isDay ? "day" : "night";
  if (code === 0) return ["Clear", `clear-${d}`];
  if (code === 1) return ["Mainly clear", `clear-${d}`];
  if (code === 2) return ["Partly cloudy", `partly-cloudy-${d}`];
  if (code === 3) return ["Overcast", "cloudy"];
  if (code === 45 || code === 48) return ["Fog", "fog"];
  if (code >= 51 && code <= 57) return ["Drizzle", "rain"];
  if (code >= 61 && code <= 67) return [code >= 65 ? "Heavy rain" : "Rain", "rain"];
  if (code >= 71 && code <= 77) return [code >= 75 ? "Heavy snow" : "Snow", "snow"];
  if (code >= 80 && code <= 82) return ["Rain showers", "showers-day"];
  if (code === 85 || code === 86) return ["Snow showers", "snow-showers-day"];
  if (code >= 95) return ["Thunderstorm", "thunder-rain"];
  return ["Unknown", "cloudy"];
}
const epoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const hhmm = (iso: string) => (iso.split("T")[1] || "00:00").slice(0, 5) + ":00";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&timezone=${encodeURIComponent(TZ)}` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=7` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,visibility,uv_index` +
      `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,snowfall,weather_code,cloud_cover,pressure_msl,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max`;
    const r = await fetch(url);
    if (!r.ok) return json({ error: `Open-Meteo ${r.status}` }, 502);
    const om = await r.json();

    // NWS active alerts for this point (keyless; requires a User-Agent).
    let alerts: any[] = [];
    try {
      const a = await fetch(`https://api.weather.gov/alerts/active?point=${LAT},${LON}`, {
        headers: { "User-Agent": "revere.city civic dashboard (contact via revere.city)", Accept: "application/geo+json" },
      });
      if (a.ok) {
        const g = await a.json();
        alerts = (g.features || []).map((f: any) => ({
          event: f.properties.event,
          headline: f.properties.headline,
          severity: f.properties.severity,
          urgency: f.properties.urgency,
          description: f.properties.description,
          instruction: f.properties.instruction,
          onset: f.properties.onset,
          ends: f.properties.ends || f.properties.expires,
          sender: f.properties.senderName,
        }));
      }
    } catch (_) { /* alerts are best-effort */ }

    const H = om.hourly, Dd = om.daily, C = om.current;
    const days = Dd.time.map((date: string, i: number) => {
      const [conditions, icon] = wmo(Dd.weather_code[i]);
      const hours = H.time.map((t: string, j: number) => ({ t, j })).filter(({ t }: any) => t.startsWith(date)).map(({ t, j }: any) => {
        const [hc, hi] = wmo(H.weather_code[j], H.is_day[j] === 1);
        return {
          datetime: hhmm(t), datetimeEpoch: epoch(t), temp: H.temperature_2m[j], feelslike: H.apparent_temperature[j],
          humidity: H.relative_humidity_2m[j], dew: H.dew_point_2m[j], precip: H.precipitation[j],
          precipprob: H.precipitation_probability[j] ?? 0, snow: H.snowfall[j] ?? 0, snowdepth: 0,
          preciptype: H.precipitation[j] > 0 ? [H.snowfall[j] > 0 ? "snow" : "rain"] : null,
          windgust: H.wind_gusts_10m[j], windspeed: H.wind_speed_10m[j], winddir: H.wind_direction_10m[j],
          pressure: H.pressure_msl[j], visibility: Math.round((H.visibility[j] ?? 0) / 1609.34 * 10) / 10,
          cloudcover: H.cloud_cover[j], solarradiation: 0, solarenergy: 0, uvindex: H.uv_index[j] ?? 0, severerisk: 0,
          conditions: hc, icon: hi, stations: null, source: "fcst",
        };
      });
      const avg = (k: string) => hours.length ? Math.round(hours.reduce((s: number, h: any) => s + (h[k] ?? 0), 0) / hours.length * 10) / 10 : 0;
      return {
        datetime: date, datetimeEpoch: epoch(`${date}T00:00:00`), tempmax: Dd.temperature_2m_max[i], tempmin: Dd.temperature_2m_min[i],
        temp: Math.round((Dd.temperature_2m_max[i] + Dd.temperature_2m_min[i]) / 2 * 10) / 10,
        feelslikemax: Dd.apparent_temperature_max[i], feelslikemin: Dd.apparent_temperature_min[i],
        feelslike: Math.round((Dd.apparent_temperature_max[i] + Dd.apparent_temperature_min[i]) / 2 * 10) / 10,
        dew: avg("dew"), humidity: avg("humidity"), precip: Dd.precipitation_sum[i], precipprob: Dd.precipitation_probability_max[i] ?? 0,
        precipcover: 0, preciptype: Dd.precipitation_sum[i] > 0 ? [Dd.snowfall_sum[i] > 0 ? "snow" : "rain"] : null,
        snow: Dd.snowfall_sum[i], snowdepth: 0, windgust: Dd.wind_gusts_10m_max[i], windspeed: Dd.wind_speed_10m_max[i],
        winddir: Dd.wind_direction_10m_dominant[i], pressure: avg("pressure"), cloudcover: avg("cloudcover"), visibility: avg("visibility"),
        solarradiation: 0, solarenergy: 0, uvindex: Dd.uv_index_max[i] ?? 0, severerisk: 0,
        sunrise: hhmm(Dd.sunrise[i]), sunriseEpoch: epoch(Dd.sunrise[i]), sunset: hhmm(Dd.sunset[i]), sunsetEpoch: epoch(Dd.sunset[i]),
        moonphase: 0, conditions, description: `${conditions}. High ${Math.round(Dd.temperature_2m_max[i])}°F, low ${Math.round(Dd.temperature_2m_min[i])}°F.`,
        icon, stations: null, source: "fcst", hours, precipsum: Dd.precipitation_sum[i], precipsumnormal: 0, snowsum: Dd.snowfall_sum[i],
      };
    });

    const [cc, ci] = wmo(C.weather_code, C.is_day === 1);
    const currentConditions = {
      datetime: hhmm(C.time), datetimeEpoch: epoch(C.time), temp: C.temperature_2m, feelslike: C.apparent_temperature,
      humidity: C.relative_humidity_2m, dew: C.dew_point_2m, precip: C.precipitation, precipprob: days[0]?.precipprob ?? 0,
      snow: 0, snowdepth: 0, preciptype: C.precipitation > 0 ? ["rain"] : null, windgust: C.wind_gusts_10m, windspeed: C.wind_speed_10m,
      winddir: C.wind_direction_10m, pressure: C.pressure_msl, visibility: Math.round((C.visibility ?? 0) / 1609.34 * 10) / 10,
      cloudcover: C.cloud_cover, solarradiation: 0, solarenergy: 0, uvindex: C.uv_index ?? 0, conditions: cc, icon: ci,
      stations: null, source: "obs", sunrise: days[0]?.sunrise, sunriseEpoch: days[0]?.sunriseEpoch, sunset: days[0]?.sunset,
      sunsetEpoch: days[0]?.sunsetEpoch, moonphase: 0,
    };

    const now = new Date().toISOString();
    const weatherData = {
      queryCost: 0, latitude: LAT, longitude: LON, resolvedAddress: "Revere, MA, United States", address: "revere",
      timezone: TZ, tzoffset: (om.utc_offset_seconds ?? 0) / 3600, days, stations: {}, currentConditions,
      alerts, provider: "Open-Meteo + National Weather Service", isProcessed: true, fetchTimestamp: now,
    };

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // keep the table small: drop rows older than 2 days
    await supabase.from("weather_data").delete().lt("fetched_at", new Date(Date.now() - 2 * 864e5).toISOString());
    const { data, error } = await supabase.from("weather_data").insert({
      location: "revere", fetched_at: now, data: weatherData, current_conditions: currentConditions,
      temp: currentConditions.temp, humidity: currentConditions.humidity, conditions: cc, icon: ci,
    }).select("id, fetched_at, temp, conditions");
    if (error) throw error;

    return json({ message: "Weather data updated successfully", timestamp: now, alerts: alerts.length, data: data?.[0] });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
