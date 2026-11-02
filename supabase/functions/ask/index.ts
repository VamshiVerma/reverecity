// Revere City assistant — grounded question answering.
// Routes a plain-language question to the right data (budget documents via hybrid
// search, police dispatch logs, live weather + NWS alerts, live MBTA), then answers
// with an LLM when a key is configured server-side (GEMINI_API_KEY, ANTHROPIC_API_KEY
// or OPENAI_API_KEY), otherwise with a grounded summary built from the data itself.
// Always returns the sources it used.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// deno-lint-ignore no-explicit-any
const embedder = new (globalThis as any).Supabase.ai.Session("gte-small");
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Source = { label: string; detail?: string; url?: string; kind: string };
type Msg = { role: "user" | "assistant"; content: string };

// ---------- intent ----------
function intents(q: string) {
  const s = q.toLowerCase();
  const has = (re: RegExp) => re.test(s);
  return {
    police: has(/crime|safe|safety|incident|calls?\b|arrest|theft|stolen|break.?in|disturb|noise|fight|shots?|domestic|accident|crash|happen|going on|activity|suspicious|neighbou?rhood|my (block|street|area)|police (log|activity|calls?|report)/)
      || (has(/police|cops?/) && !has(/budget|spend|cost|money|fund|salar|payroll|fy ?2?0?2[0-9]|million|\$|department budget/)),
    budget: has(/budget|spend|spent|cost|money|fund|tax|revenue|salar|payroll|department|appropriat|fiscal|fy ?2?0?2[0-9]|million|dollar|\$|school|dpw|public works|pension|debt|capital|levy|ftes?|staff|employees|positions/),
    weather: has(/weather|temperature|rain|snow|wind|cold|hot|forecast|storm|umbrella|sunny|degrees|alert|warning|flood/) && !has(/budget|spend|cost|money|fund|removal|plow|fy ?2?0?2[0-9]|\$/),
    mbta: has(/mbta|\bt\b|train|blue line|subway|transit|commute|wonderland|revere beach station|beachmont|suffolk downs|bus|delay|shuttle/),
  };
}

// ---------- police ----------
const ALIASES: Record<string, string[]> = {
  "BOULEVARD": ["REVERE BEACH BLVD"], "BLVD": ["REVERE BEACH BLVD"], "THE BEACH": ["REVERE BEACH BLVD", "REVERE BEACH PKWY", "OCEAN AVE"],
  "BEACH": ["REVERE BEACH BLVD", "REVERE BEACH PKWY", "OCEAN AVE"], "WONDERLAND": ["NORTH SHORE RD", "OCEAN AVE"],
  "SQUIRE": ["SQUIRE RD"], "BROADWAY": ["BROADWAY"], "SHIRLEY": ["SHIRLEY AVE"], "PARKWAY": ["REVERE BEACH PKWY"],
};
let streetCache: { at: number; streets: string[] } | null = null;
async function knownStreets(): Promise<string[]> {
  if (streetCache && Date.now() - streetCache.at < 30 * 60e3) return streetCache.streets;
  const { data } = await supabase.rpc("distinct_police_streets");
  const streets = (data || []).map((r: any) => r.street as string).filter(Boolean);
  streetCache = { at: Date.now(), streets };
  return streets;
}
function streetsInQuestion(q: string, streets: string[]): string[] {
  const u = ` ${q.toUpperCase().replace(/[^A-Z0-9 ]/g, " ")} `;
  const hits = new Set<string>();
  for (const [k, v] of Object.entries(ALIASES)) if (u.includes(` ${k} `) || u.includes(`${k} `)) v.forEach((x) => hits.add(x));
  for (const s of streets) {
    const core = s.split(" + ")[0].replace(/\b(ST|AVE|RD|BLVD|PKWY|HWY|DR|LN|PL|CT|TER|WAY|SQ|CIR)\b\.?$/, "").trim();
    if (core.length >= 5 && !/^(REVERE|NORTH|SOUTH|EAST|WEST|CENTRAL|MAIN)$/.test(core) && u.includes(` ${core} `)) hits.add(s.split(" + ")[0]);
  }
  return [...hits].slice(0, 8);
}
const NOTABLE = ["VIOLENCE_THREATS", "DOMESTIC", "THEFT_PROPERTY", "CRASH", "SUSPICIOUS", "DISTURBANCE"];

async function policeContext(q: string) {
  const { data: latest } = await supabase.from("police_logs").select("log_date").order("log_date", { ascending: false }).limit(1);
  const latestDate = latest?.[0]?.log_date as string | undefined;
  if (!latestDate) return null;
  const since = new Date(new Date(latestDate).getTime() - 13 * 864e5).toISOString().slice(0, 10);
  const streets = streetsInQuestion(q, await knownStreets());

  let query = supabase.from("police_logs")
    .select("call_number,log_date,time_24h,call_reason,action,call_type_category,action_category,location_street,source_url")
    .gte("log_date", since).order("timestamp", { ascending: false }).limit(1500);
  if (streets.length) query = query.or(streets.map((s) => `location_street.ilike.%${s.replace(/[,()]/g, "")}%`).join(","));
  const { data: rows } = await query;
  const list = rows || [];

  const byCat: Record<string, number> = {}, byStreet: Record<string, number> = {}, byHour: Record<string, number> = {};
  for (const r of list) {
    byCat[r.call_type_category] = (byCat[r.call_type_category] || 0) + 1;
    if (r.location_street) byStreet[r.location_street] = (byStreet[r.location_street] || 0) + 1;
    const h = r.time_24h?.slice(0, 2); if (h) byHour[h] = (byHour[h] || 0) + 1;
  }
  const top = (o: Record<string, number>, n: number) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const notable = list.filter((r) => NOTABLE.includes(r.call_type_category) || r.action_category === "ARREST").slice(0, 25);
  const sourceUrls = [...new Set(list.map((r) => r.source_url).filter(Boolean))].slice(0, 3);
  return { latestDate, since, streets, total: list.length, byCat: top(byCat, 10), byStreet: top(byStreet, 8), byHour: top(byHour, 4), notable, sourceUrls };
}

// ---------- budget ----------
const DEPT_KEYS: [RegExp, RegExp][] = [
  [/police|cops?/i, /^Police Department/i], [/fire( dept| department)?\b|firefight/i, /^Fire Department/i],
  [/librar/i, /^Library/i], [/park|recreation|rec dept/i, /^Parks/i], [/snow|plow/i, /Snow & Ice/i],
  [/water|sewer/i, /Water & Sewer/i], [/trash|garbage|solid waste|recycl/i, /Solid Waste/i], [/pension|retire/i, /^Retirement/i],
  [/debt|bond|borrow/i, /^Debt Service/i], [/public works|dpw/i, /Public Works: (Administration|General Fund)/i],
  [/public health|health dep/i, /Public Health/i], [/veteran/i, /Veterans/i], [/elder|senior/i, /Elder Affairs/i],
  [/\bit\b|information tech|technology/i, /^Information Technology/i], [/city clerk|clerk/i, /^City Clerk/i],
  [/city council|council/i, /^City Council/i], [/mayor/i, /^Mayor/i], [/311|constituent/i, /Constituent/i],
  [/parking/i, /^Parking Control/i], [/assessor/i, /^Assessors/i], [/treasur|collector/i, /Collector/i],
  [/solicitor|legal|lawyer/i, /Solicitor/i], [/election/i, /^Election/i], [/planning|community development/i, /Planning/i],
  [/engineer/i, /^Engineering/i], [/inspection|isd/i, /Inspections/i], [/building commission/i, /Building Commissioner/i],
  [/benefit|insurance|health insurance/i, /Employee Benefits/i], [/human resource|\bhr\b/i, /^Human Resources/i],
  [/regional school|northeast metro|vocational/i, /Regional Schools/i], [/911|dispatch|emergency comm/i, /Emergency Communications/i],
  [/wellness center/i, /Wellness Center/i], [/purchas|procure/i, /^Purchasing/i], [/accounting|audit/i, /Accounting/i],
];
async function departmentFigures(q: string) {
  const wanted = DEPT_KEYS.filter(([k]) => k.test(q)).map(([, n]) => n);
  if (!wanted.length) return [];
  const { data } = await supabase.from("budget_departments").select("*").order("fiscal_year", { ascending: false });
  return (data || []).filter((r: any) => wanted.some((n) => n.test(r.name)));
}
const money = (v: number | null) => v == null ? "—" : "$" + Math.round(v).toLocaleString("en-US");

async function budgetContext(q: string) {
  const emb = await embedder.run(q, { mean_pool: true, normalize: true });
  const ftsQuery = q.replace(/[^\w\s$.]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !/^(the|and|for|how|much|what|does|city|revere|spend|spending|on|is|are|was)$/i.test(w)).join(" or ");
  const { data, error } = await supabase.rpc("match_doc_chunks", {
    query_embedding: Array.from(emb as number[]), query_text: ftsQuery || q, match_count: 7, doc_filter: null,
  });
  if (error) throw error;
  const wantsPeople = /salar|employee|who |staff|position|officer|chief|pay (for|of)|paid/i.test(q);
  return ((data || []) as any[]).filter((c) => wantsPeople || !/Employee Listing/i.test(c.content));
}

// ---------- weather ----------
async function weatherContext() {
  const { data } = await supabase.from("weather_data").select("fetched_at,data").order("fetched_at", { ascending: false }).limit(1);
  let row = data?.[0];
  if (!row || Date.now() - new Date(row.fetched_at).getTime() > 45 * 60e3) {
    try { await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-weather`, { method: "POST" }); } catch (_) { /* ignore */ }
    const again = await supabase.from("weather_data").select("fetched_at,data").order("fetched_at", { ascending: false }).limit(1);
    row = again.data?.[0] ?? row;
  }
  if (!row) return null;
  const d = row.data;
  return {
    fetchedAt: row.fetched_at, current: d.currentConditions, alerts: d.alerts || [],
    days: (d.days || []).slice(0, 4).map((x: any) => ({ date: x.datetime, hi: x.tempmax, lo: x.tempmin, conditions: x.conditions, precipprob: x.precipprob, wind: x.windspeed })),
  };
}

// ---------- MBTA ----------
const STOPS: Record<string, string> = { "place-wondl": "Wonderland", "place-rbmnl": "Revere Beach", "place-bmmnl": "Beachmont", "place-sdmnl": "Suffolk Downs" };
async function mbtaContext() {
  const base = "https://api-v3.mbta.com";
  const [al, pr] = await Promise.all([
    fetch(`${base}/alerts?filter[route]=Blue,110,116,117,119,411,426,450&filter[datetime]=NOW`).then((r) => r.json()).catch(() => ({ data: [] })),
    fetch(`${base}/predictions?filter[stop]=${Object.keys(STOPS).join(",")}&filter[route]=Blue&sort=departure_time&page[limit]=24&include=stop`).then((r) => r.json()).catch(() => ({ data: [] })),
  ]);
  const alerts = (al.data || []).map((a: any) => ({ effect: a.attributes.effect, header: a.attributes.header, severity: a.attributes.severity, lifecycle: a.attributes.lifecycle }));
  const now = Date.now();
  const preds = (pr.data || []).map((p: any) => {
    const t = p.attributes.departure_time || p.attributes.arrival_time;
    const parent = p.relationships?.stop?.data?.id || "";
    const inc = (pr.included || []).find((s: any) => s.id === parent);
    const station = STOPS[inc?.relationships?.parent_station?.data?.id] || inc?.attributes?.name || parent;
    return t ? { station, toward: p.attributes.direction_id === 0 ? "Bowdoin (Downtown)" : "Wonderland", mins: Math.round((new Date(t).getTime() - now) / 60e3) } : null;
  }).filter((x: any) => x && x.mins >= 0).slice(0, 12);
  return { alerts, preds };
}

// ---------- LLM ----------
const SYSTEM = `You are the Revere City assistant for residents of Revere, Massachusetts.
Answer using ONLY the CONTEXT provided. Be warm, plain-spoken and specific: give numbers, dates, street names and times.
- If the context does not contain the answer, say so plainly and suggest where to look. Never invent figures.
- Police data comes from the Revere PD public dispatch log; say what date it runs through. Do not speculate about individuals.
- For budget answers, cite the document and page like (FY2027 Adopted Budget, p. 47). Prefer FY2027 (current fiscal year) unless asked otherwise.
- Keep answers concise: a short direct answer first, then 2–5 bullets if useful. Use Markdown. No preamble.`;

async function llm(context: string, question: string, history: Msg[]): Promise<{ text: string; model: string } | null> {
  const user = `CONTEXT:\n${context}\n\nQUESTION: ${question}`;
  const hist = history.slice(-6);
  const gem = Deno.env.get("GEMINI_API_KEY"), ant = Deno.env.get("ANTHROPIC_API_KEY"), oai = Deno.env.get("OPENAI_API_KEY"), groq = Deno.env.get("GROQ_API_KEY");
  try {
    if (ant) {
      for (const model of ["claude-haiku-5-5", "claude-haiku-4-5"]) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ant, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model, max_tokens: 900, system: SYSTEM, messages: [...hist, { role: "user", content: user }] }),
        });
        if (r.ok) { const j = await r.json(); return { text: j.content?.map((c: any) => c.text).join("") ?? "", model }; }
      }
    }
    if (groq) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${groq}`, "content-type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", temperature: 0.3, max_tokens: 900, messages: [{ role: "system", content: SYSTEM }, ...hist, { role: "user", content: user }] }),
      });
      if (r.ok) { const j = await r.json(); return { text: j.choices?.[0]?.message?.content ?? "", model: "llama-3.3-70b (Groq)" }; }
    }
    if (gem) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gem}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [...hist.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })), { role: "user", parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: 900, temperature: 0.3 },
        }),
      });
      if (r.ok) { const j = await r.json(); return { text: j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "", model: "gemini-2.5-flash" }; }
    }
    if (oai) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${oai}`, "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.3, max_tokens: 900, messages: [{ role: "system", content: SYSTEM }, ...hist, { role: "user", content: user }] }),
      });
      if (r.ok) { const j = await r.json(); return { text: j.choices?.[0]?.message?.content ?? "", model: "gpt-4o-mini" }; }
    }
  } catch (_) { /* fall through to grounded answer */ }
  return null;
}

// ---------- helpers ----------
const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const KEEP = new Set(["MVA", "MBTA", "911", "OIC", "DPW", "ERO", "BOLO", "OUI", "CPR", "EMS", "MV", "PD"]);
const title = (s: string) => s.split(/(\s+|\/|,)/).map((w) => KEEP.has(w.toUpperCase()) ? w.toUpperCase() : w.toLowerCase().replace(/\b\w/, (c) => c.toUpperCase())).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  const started = Date.now();
  try {
    const { question = "", history = [] } = await req.json();
    const q = String(question).slice(0, 600).trim();
    if (!q) return json({ error: "empty question" }, 400);

    let it = intents(q);
    if (!it.police && !it.budget && !it.weather && !it.mbta) it = { police: false, budget: true, weather: false, mbta: false }; // documents are the default knowledge base

    const [police, budget, weather, mbta, depts] = await Promise.all([
      it.police ? policeContext(q) : null,
      it.budget ? budgetContext(q).catch(() => []) : null,
      it.weather ? weatherContext() : null,
      it.mbta ? mbtaContext() : null,
      it.budget ? departmentFigures(q).catch(() => []) : [],
    ]);

    const sources: Source[] = [];
    const ctx: string[] = [];
    const cards: any[] = [];

    if (police) {
      const where = police.streets.length ? ` on/near ${police.streets.map(title).join(", ")}` : " citywide";
      ctx.push(`POLICE DISPATCH LOG (Revere PD), ${fmtDate(police.since)} to ${fmtDate(police.latestDate)}${where}: ${police.total} calls.
By type: ${police.byCat.map(([k, v]) => `${pretty(k)} ${v}`).join("; ")}.
Busiest streets: ${police.byStreet.map(([k, v]) => `${title(k)} ${v}`).join("; ")}.
Busiest hours: ${police.byHour.map(([k, v]) => `${k}:00 (${v})`).join(", ")}.
Notable calls: ${police.notable.map((r) => `${fmtDate(r.log_date)} ${r.time_24h} ${title(r.call_reason)} → ${title(r.action)}${r.location_street ? " @ " + title(r.location_street) : ""}`).join(" | ")}`);
      police.sourceUrls.forEach((u: string) => {
        const f = decodeURIComponent(u.split("/").pop() || "");
        const m = f.match(/^(\d{2})-(\d{2})[^]*?-to-(\d{2})-(\d{2})/);
        const mon = (n: string) => new Date(2000, Number(n) - 1, 1).toLocaleDateString("en-US", { month: "short" });
        const detail = m ? `${mon(m[1])} ${Number(m[2])}–${m[3] === m[1] ? "" : mon(m[3]) + " "}${Number(m[4])} log` : `through ${fmtDate(police.latestDate)}`;
        sources.push({ kind: "police", label: "Revere PD public log", detail, url: u });
      });
      cards.push({ type: "police", latestDate: police.latestDate, since: police.since, total: police.total, streets: police.streets, byCat: police.byCat.slice(0, 5) });
    }
    if (depts && depts.length) {
      ctx.push(`BUDGET DEPARTMENT TOTALS (structured, from the adopted budget books):\n${depts.map((d: any) =>
        `${d.doc_title} p. ${d.page}: ${d.name} — FY${d.fiscal_year} budget ${money(d.recommended)} (payroll ${money(d.payroll)}, non-payroll ${money(d.non_payroll)}); prior year adopted ${money(d.prior_adopted)}; department requested ${money(d.dept_request)}`).join("\n")}`);
      for (const d of depts) sources.push({ kind: "budget", label: d.doc_title, detail: `p. ${d.page} · ${d.name}`, url: `${d.source_url}#page=${d.page}` });
      cards.push({ type: "budget", rows: depts.map((d: any) => ({ name: d.name, fy: d.fiscal_year, amount: d.recommended, prior: d.prior_adopted, payroll: d.payroll, nonPayroll: d.non_payroll, page: d.page, doc: d.doc_title })) });
    }
    if (budget && budget.length) {
      ctx.push(`BUDGET DOCUMENT EXCERPTS:\n${budget.map((c: any) => `[${c.doc_title}, p. ${c.page}${c.section ? " — " + c.section : ""}]\n${c.content}`).join("\n---\n")}`);
      const seen = new Set<string>();
      for (const c of budget) {
        const k = `${c.doc_id}:${c.page}`; if (seen.has(k)) continue; seen.add(k);
        sources.push({ kind: "budget", label: c.doc_title, detail: `p. ${c.page}${c.section ? " · " + title(c.section) : ""}`, url: `${c.source_url}#page=${c.page}` });
      }
    }
    if (weather) {
      const c = weather.current;
      ctx.push(`WEATHER (Open-Meteo, fetched ${weather.fetchedAt}): now ${Math.round(c.temp)}°F (feels ${Math.round(c.feelslike)}°F), ${c.conditions}, wind ${Math.round(c.windspeed)} mph, humidity ${Math.round(c.humidity)}%.
Next days: ${weather.days.map((d: any) => `${d.date}: ${d.conditions}, ${Math.round(d.hi)}/${Math.round(d.lo)}°F, ${d.precipprob}% precip`).join("; ")}.
NWS active alerts: ${weather.alerts.length ? weather.alerts.map((a: any) => `${a.event} — ${a.headline}`).join(" | ") : "none"}`);
      sources.push({ kind: "weather", label: "Open-Meteo forecast", detail: "updated " + new Date(weather.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) });
      if (weather.alerts.length) sources.push({ kind: "weather", label: "National Weather Service", detail: `${weather.alerts.length} active alert(s)`, url: "https://alerts.weather.gov" });
      cards.push({ type: "weather", current: { temp: c.temp, feels: c.feelslike, conditions: c.conditions, icon: c.icon, wind: c.windspeed }, days: weather.days, alerts: weather.alerts.length });
    }
    if (mbta) {
      ctx.push(`MBTA LIVE (api-v3.mbta.com, ${new Date().toISOString()}):
Alerts on Blue Line & Revere buses: ${mbta.alerts.length ? mbta.alerts.map((a: any) => `${pretty(a.effect)}: ${a.header}`).join(" | ") : "none active"}.
Next Blue Line departures: ${mbta.preds.length ? mbta.preds.map((p: any) => `${p.station} → ${p.toward} in ${p.mins} min`).join("; ") : "no live predictions right now"}`);
      sources.push({ kind: "mbta", label: "MBTA live data", detail: `${mbta.alerts.length} alert(s) · ${mbta.preds.length} predictions`, url: "https://www.mbta.com/schedules/Blue" });
      cards.push({ type: "mbta", alerts: mbta.alerts.slice(0, 4), preds: mbta.preds.slice(0, 6) });
    }

    const seenSrc = new Set<string>();
    const uniqSources = sources.filter((x) => { const k = x.label + "|" + (x.detail ?? "") + "|" + (x.url ?? ""); if (seenSrc.has(k)) return false; seenSrc.add(k); return true; }).slice(0, 8);
    sources.length = 0; sources.push(...uniqSources);
    const context = ctx.join("\n\n") || "No matching city data was found.";
    const gen = await llm(context, q, Array.isArray(history) ? history : []);

    let answer = gen?.text?.trim();
    if (!answer) {
      // Grounded answer without an LLM: honest, structured, sourced.
      const parts: string[] = [];
      if (police) {
        parts.push(`**Police activity${police.streets.length ? " around " + police.streets.map(title).join(", ") : " in Revere"}** — ${police.total} calls logged ${fmtDate(police.since)} to ${fmtDate(police.latestDate)} (latest posted RPD log).`);
        if (police.byCat.length) parts.push(`- Most common: ${police.byCat.slice(0, 4).map(([k, v]) => `${pretty(k)} (${v})`).join(", ")}`);
        if (police.byHour.length) parts.push(`- Busiest hours: ${police.byHour.slice(0, 3).map(([h]) => `${Number(h) % 12 || 12}${Number(h) < 12 ? "am" : "pm"}`).join(", ")}`);
        police.notable.slice(0, 4).forEach((r) => parts.push(`- ${fmtDate(r.log_date)}, ${r.time_24h}: ${title(r.call_reason)}${r.location_street ? " on " + title(r.location_street) : ""} → ${title(r.action).toLowerCase()}`));
      }
      if (weather) {
        const c = weather.current;
        parts.push(`**Weather now:** ${Math.round(c.temp)}°F and ${c.conditions.toLowerCase()} (feels like ${Math.round(c.feelslike)}°F, wind ${Math.round(c.windspeed)} mph).`);
        weather.days.slice(1, 3).forEach((d: any) => parts.push(`- ${new Date(d.date + "T12:00").toLocaleDateString("en-US", { weekday: "long" })}: ${d.conditions}, ${Math.round(d.hi)}°/${Math.round(d.lo)}°, ${d.precipprob}% chance of precipitation`));
        if (weather.alerts.length) parts.push(`- ⚠️ ${weather.alerts.map((a: any) => a.event).join(", ")}`);
      }
      if (mbta) {
        parts.push(mbta.alerts.length ? `**MBTA:** ${mbta.alerts.length} active alert(s) — ${mbta.alerts[0].header}` : `**MBTA:** no active alerts on the Blue Line or Revere bus routes.`);
        const nb = mbta.preds.filter((p: any) => p.station === "Revere Beach").slice(0, 3);
        if (nb.length) parts.push(`- Revere Beach: ${nb.map((p: any) => `${p.toward} in ${p.mins} min`).join(" · ")}`);
      }
      const byName = new Map<string, any[]>();
      for (const d of depts || []) byName.set(d.name, [...(byName.get(d.name) || []), d]);
      for (const [name, rows] of byName) {
        const cur = rows.find((r: any) => r.fiscal_year === 2027) ?? rows[0];
        const pct = cur.prior_adopted ? ((cur.recommended - cur.prior_adopted) / cur.prior_adopted) * 100 : null;
        parts.push(`**${name} — FY${cur.fiscal_year} budget: ${money(cur.recommended)}**${pct != null ? ` (${Math.abs(pct) < 0.05 ? `unchanged from FY${cur.fiscal_year - 1}` : `${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(1)}% from ${money(cur.prior_adopted)} in FY${cur.fiscal_year - 1}`})` : ""}.`);
        if (cur.payroll != null) parts.push(`- Payroll ${money(cur.payroll)} · other expenses ${money(cur.non_payroll)}`);
        parts.push(`- Source: *${cur.doc_title}, p. ${cur.page}*`);
      }
      if (budget && budget.length && !(depts && depts.length)) {
        parts.push(`**From the city budget documents** — the most relevant passages:`);
        budget.slice(0, 3).forEach((c: any) => {
          const snippet = c.content.split("\n").filter((l: string) => /\d/.test(l)).slice(0, 4).join("\n") || c.content.slice(0, 300);
          parts.push(`> *${c.doc_title}, p. ${c.page}${c.section ? " — " + title(c.section) : ""}*\n> ${snippet.replace(/\n/g, "\n> ")}`);
        });
      }
      answer = parts.join("\n") || "I couldn't find city data matching that question yet.";
    }

    return json({ answer, sources, cards, mode: gen ? "llm" : "grounded", model: gen?.model ?? null, ms: Date.now() - started });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
