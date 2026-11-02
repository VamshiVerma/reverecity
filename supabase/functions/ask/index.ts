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

// ---------- plain-language police wording ----------
const ACTION_PLAIN: [RegExp, string][] = [
  [/^services rendered/i, "officers helped"], [/^call log entry only/i, "logged only"], [/^report to follow/i, "report filed"],
  [/referred to other agency/i, "referred to another agency"], [/^no action required/i, "no action needed"], [/^tow motor vehicle/i, "vehicle towed"],
  [/^citation\/warning issued/i, "citation or warning issued"], [/^nothing showing/i, "officers found nothing"], [/^refused response/i, "help declined"],
  [/^officer spoke to subject/i, "officer spoke with those involved"], [/^no service made/i, "papers not served"], [/^mva - papers exchanged/i, "drivers exchanged info"],
  [/^arrest\(s\) made/i, "arrest made"], [/^(transported to hospital|ambulance transport)/i, "taken to hospital"], [/^building checked/i, "building checked"],
  [/^unable to locate/i, "couldn't locate"], [/^be on the lookout/i, "lookout issued"], [/^(accidental trip|false alarm)/i, "false alarm"],
  [/^medical aid/i, "medical aid given"], [/^parking ticker issued/i, "parking ticket issued"], [/^no violation observed/i, "no violation found"],
  [/^paperwork served/i, "papers served"], [/^transported to court/i, "taken to court"],
];
function plainAction(a: string | null | undefined) {
  const s = String(a || "").trim();
  for (const [re, out] of ACTION_PLAIN) if (re.test(s)) return out;
  return s.toLowerCase();
}
function plainReason(r: string | null | undefined) {
  return String(r || "")
    .replace(/\bMotor Vehicle Accident\b/gi, "Car crash")
    .replace(/^MVA\s*[-,]?\s*/i, "Car crash, ")
    .replace(/Hit & Run/gi, "hit-and-run")
    .replace(/,\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
function time12(hhmm: string | null | undefined) {
  const m = String(hhmm || "").match(/^(\d{2}):?(\d{2})/);
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

function fmtShort(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
// ---------- intent ----------
function intents(q: string) {
  const s = q.toLowerCase();
  const has = (re: RegExp) => re.test(s);
  return {
    police: has(/crime|safe|safety|incident|calls?\b|arrest|theft|stolen|break.?in|disturb|noise|fight|shots?|domestic|accident|crash|happen|going on|activity|suspicious|neighbou?rhood|my (block|street|area)|police (log|activity|calls?|report)/)
      || (has(/police|cops?/) && !has(/budget|spend|cost|money|fund|salar|payroll|fy ?2?0?2[0-9]|million|\$|department budget/)),
    budget: has(/budget|spend|spent|cost|money|fund|tax|revenue|salar|payroll|department|appropriat|fiscal|fy ?2?0?2[0-9]|million|dollar|\$|school|dpw|public works|pension|debt|capital|levy|ftes?|staff|employees|positions/),
    weather: has(/weather|temperature|\brain(y|ing)?\b|\bsnow|\bwind(y)?\b|\bcold\b|\bhot\b|forecast|\bstorm|umbrella|sunny|degrees|weather alert|warning|flood/) && !has(/budget|spend|cost|money|fund|removal|plow|fy ?2?0?2[0-9]|\$/),
    mbta: has(/mbta|\bt\b|train|blue line|subway|transit|commute|wonderland|revere beach station|beachmont|suffolk downs|bus|delay|shuttle/),
    housing: has(/hous|home (value|price)|homes?\b.*(cost|worth|price)|\brents?\b|\brental|apartment|condo|real estate market|afford|zillow|mortgage|cost of living|live in revere/) && !has(/property tax|tax levy|housing authority budget/),
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
  // Aggregated in Postgres: the REST API caps row reads at 1000.
  const { data, error } = await supabase.rpc("police_stats", { since, until: latestDate, streets: streets.length ? streets : null });
  if (error || !data) return null;
  const pairs = (a: any[]) => (a || []).map((x: any) => [x.k, x.n] as [string, number]);
  return {
    latestDate, since, streets, total: data.total as number,
    byCat: pairs(data.by_category).slice(0, 10), byStreet: pairs(data.by_street).slice(0, 8), byHour: pairs(data.by_hour).slice(0, 4),
    notable: (data.notable || []) as any[], sourceUrls: (data.sources || []).filter(Boolean).slice(0, 3) as string[],
  };
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

async function budgetContext(q: string, emb: number[]) {
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
// ---------- housing (Zillow Research, refreshed monthly) ----------
async function housingContext() {
  const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
  const { data } = await supabase.from("housing_market").select("place,metric,month,value").gte("month", since).order("month");
  const by: Record<string, Record<string, { month: string; value: number }[]>> = {};
  for (const r of data || []) ((by[r.place] ||= {})[r.metric] ||= []).push(r);
  const rows = Object.entries(by).map(([place, m]) => {
    const v = m.zhvi || [], r = m.zori || [];
    const yoy = (s: any[]) => (s.length >= 13 ? ((s[s.length - 1].value - s[s.length - 13].value) / s[s.length - 13].value) * 100 : null);
    return { place, value: v.at(-1)?.value, vYoY: yoy(v), rent: r.at(-1)?.value, rYoY: yoy(r), month: v.at(-1)?.month };
  }).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return { rows, month: rows.find((r) => r.place === "Revere")?.month };
}

const REVERE_STATIONS: [string, string, RegExp][] = [
  ["place-wondl", "Wonderland", /wonderland/],
  ["place-rbmnl", "Revere Beach", /revere beach(?! b(ou)?l(e)?v)/],
  ["place-bmmnl", "Beachmont", /beachmont/],
  ["place-sdmnl", "Suffolk Downs", /suffolk downs/],
];
async function mbtaContext(q = "") {
  const base = "https://api-v3.mbta.com";
  const s = q.toLowerCase();
  const asked = REVERE_STATIONS.filter(([, , re]) => re.test(s));
  const stations = asked.length ? asked : [REVERE_STATIONS[1]];
  const wantDir = /\b(boston|downtown|bowdoin|airport|inbound|state|aquarium|maverick|government center)\b/.test(s) ? 0 : /\b(to|toward|towards) wonderland\b|northbound|outbound/.test(s) ? 1 : null;
  const [al, ...prs] = await Promise.all([
    fetch(`${base}/alerts?filter[route]=Blue,110,116,117,119,411,426,450&filter[datetime]=NOW`).then((r) => r.json()).catch(() => ({ data: [] })),
    ...stations.map(([id]) => fetch(`${base}/predictions?filter[stop]=${id}&filter[route]=Blue&sort=departure_time&page[limit]=10`).then((r) => r.json()).catch(() => ({ data: [] }))),
  ]);
  const alerts = (al.data || []).map((a: any) => ({ effect: a.attributes.effect, header: a.attributes.header, severity: a.attributes.severity, lifecycle: a.attributes.lifecycle }));
  const now = Date.now();
  const preds: { station: string; toward: string; dir: number; mins: number }[] = [];
  stations.forEach(([, name], i) => {
    for (const p of prs[i].data || []) {
      const t = p.attributes.departure_time || p.attributes.arrival_time;
      if (!t) continue;
      const mins = Math.round((new Date(t).getTime() - now) / 60e3);
      const dir = p.attributes.direction_id;
      if (mins < 0 || (wantDir != null && dir !== wantDir)) continue;
      if (name === "Wonderland" && dir === 1) continue; // arrivals at the end of the line aren't departures
      preds.push({ station: name, toward: dir === 0 ? "Boston (Bowdoin)" : "Wonderland", dir, mins });
    }
  });
  return { alerts, preds: preds.slice(0, 12), stations: stations.map(([, n]) => n), wantDir };
}

// ---------- routing by meaning ----------
type Intent = "civic" | "police_activity" | "crime_trend" | "budget" | "revenue" | "transit" | "weather" | "housing" | "smalltalk";
async function route(emb: number[], q: string) {
  const { data } = await supabase.rpc("match_intent", { query_embedding: emb, k: 8 });
  const best = new Map<string, number>();
  for (const r of (data || []) as any[]) best.set(r.intent, Math.max(best.get(r.intent) ?? 0, r.similarity));
  const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]);
  const [t1, s1] = ranked[0] ?? ["", 0];
  const chosen = new Set<Intent>();
  if (s1 >= 0.84) {
    chosen.add(t1 as Intent);
    for (const [t, sc] of ranked.slice(1, 3)) if (sc >= 0.86 && sc >= s1 - 0.012) chosen.add(t as Intent);
  }
  // Specific words that leave no doubt.
  const s = q.toLowerCase();
  if (/\b(train|blue line|bus|mbta|wonderland station|commute)\b/.test(s) && !chosen.size) chosen.add("transit");
  if (/\b(rent|home prices?|housing|mortgage)\b/.test(s) && !chosen.size) chosen.add("housing");
  if (/\b(budget|fy ?20\d\d|appropriation)\b/.test(s)) chosen.add("budget");
  if (/\b(who is|who's|phone number|contact|address of|where is city hall|hours)\b/.test(s) && !/\b(train|bus)\b/.test(s)) chosen.add("civic");
  if (/^(hi|hello|hey|thanks|thank you|yo|good (morning|afternoon|evening))\b[\s!.?]*$/i.test(q.trim())) { chosen.clear(); chosen.add("smalltalk"); }
  return { intents: chosen, top: ranked.slice(0, 3).map(([t, v]) => `${t}:${v.toFixed(3)}`) };
}

// ---------- city directory (from the adopted budget books) ----------
async function civicContext(q: string) {
  const { data } = await supabase.from("civic_directory").select("dept,name,title,phone,location,keywords,doc_id,page,source_url");
  const words = q.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !/^(the|who|what|where|how|does|for|and|can|get|you|revere|city|about|call|contact|number|phone|reach)$/.test(w));
  const scored = ((data || []) as any[]).map((r) => {
    const hay = `${r.dept} ${r.title} ${r.keywords}`.toLowerCase();
    let sc = 0;
    for (const w of words) if (hay.includes(w)) sc += hay.split(/\s+/).includes(w) ? 2 : 1;
    if (/mayor/.test(q.toLowerCase()) && r.dept === "Mayor") sc += 5;
    return { ...r, sc };
  }).filter((r) => r.sc > 0).sort((a, b) => b.sc - a.sc);
  // A second entry only when it's nearly as relevant as the first.
  return scored.length > 1 && scored[1].sc >= scored[0].sc - 1 ? scored.slice(0, 2) : scored.slice(0, 1);
}

// ---------- crime trend: last 28 days vs the 28 before ----------
async function crimeTrend() {
  const { data: l } = await supabase.from("police_logs").select("log_date").order("log_date", { ascending: false }).limit(1);
  const latest = l?.[0]?.log_date as string | undefined;
  if (!latest) return null;
  const d = (n: number) => new Date(new Date(latest + "T12:00:00").getTime() - n * 864e5).toISOString().slice(0, 10);
  // Compare equal windows that the log actually covers (posted logs can have gaps).
  const { data: daily } = await supabase.rpc("police_daily");
  const have = new Set(((daily || []) as any[]).map((x) => String(x.log_date).slice(0, 10)));
  let covered = 0;
  for (let i = 0, miss = 0; i < 120; i++) { if (have.has(d(i))) { covered = i + 1; miss = 0; } else if (++miss > 2) break; }
  const w = Math.max(7, Math.min(28, Math.floor(covered / 2)));
  const [cur, prev, a1, a0] = await Promise.all([
    supabase.rpc("police_stats", { since: d(w - 1), until: latest, streets: null }),
    supabase.rpc("police_stats", { since: d(2 * w - 1), until: d(w), streets: null }),
    supabase.from("police_logs").select("*", { count: "exact", head: true }).eq("action_category", "ARREST").gte("log_date", d(w - 1)).lte("log_date", latest),
    supabase.from("police_logs").select("*", { count: "exact", head: true }).eq("action_category", "ARREST").gte("log_date", d(2 * w - 1)).lte("log_date", d(w)),
  ]);
  const c = (cur.data || {}) as any, p = (prev.data || {}) as any;
  const pc = new Map(((p.by_category || []) as any[]).map((x) => [x.k, x.n]));
  const changes = ((c.by_category || []) as any[]).map((x) => ({ k: x.k, now: x.n, before: pc.get(x.k) ?? 0 }))
    .filter((x) => x.now + x.before >= 8).map((x) => ({ ...x, diff: x.now - x.before })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return { days: w, since: d(w - 1), latest, prevSince: d(2 * w - 1), prevUntil: d(w), total: c.total ?? 0, prevTotal: p.total ?? 0, arrests: a1.count ?? 0, prevArrests: a0.count ?? 0, changes: changes.slice(0, 4), sources: c.sources || [] };
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

    const emb = Array.from(await embedder.run(q, { mean_pool: true, normalize: true }) as number[]);
    const r = await route(emb, q);
    const want = (i: Intent) => r.intents.has(i);
    const wantsMoney = want("budget") || want("revenue");

    const [police, budget, weather, mbta, depts, housing, civic, trend] = await Promise.all([
      want("police_activity") ? policeContext(q) : null,
      wantsMoney ? budgetContext(q, emb).catch(() => []) : null,
      want("weather") ? weatherContext() : null,
      want("transit") ? mbtaContext(q) : null,
      want("budget") ? departmentFigures(q).catch(() => []) : [],
      want("housing") ? housingContext().catch(() => null) : null,
      want("civic") ? civicContext(q).catch(() => []) : [],
      want("crime_trend") ? crimeTrend().catch(() => null) : null,
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
Notable calls: ${police.notable.map((r) => `${fmtDate(r.log_date)} ${time12(r.time_24h)} ${plainReason(r.call_reason)} → ${plainAction(r.action)}${r.location_street ? " @ " + title(r.location_street) : ""}`).join(" | ")}`);
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

    if (housing && housing.rows.length) {
      const pc = (x: number | null) => (x == null ? "n/a" : `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`);
      ctx.push(`HOUSING MARKET (Zillow Research ZHVI home values and ZORI rents by ZIP, as of ${housing.month}):\n${housing.rows.map((r) =>
        `${r.place}: typical home value ${r.value ? "$" + r.value.toLocaleString("en-US") : "n/a"} (${pc(r.vYoY)} y/y); typical rent ${r.rent ? "$" + r.rent.toLocaleString("en-US") + "/mo" : "n/a"} (${pc(r.rYoY)} y/y)`).join("\n")}`);
      sources.push({ kind: "budget", label: "Zillow Research", detail: `ZHVI & ZORI · ${housing.month ? fmtDate(housing.month) : "latest"}`, url: "https://www.zillow.com/research/data/" });
      cards.push({ type: "housing", month: housing.month, rows: housing.rows });
    }

    if (civic && civic.length) {
      ctx.push(`CITY DIRECTORY (from the City of Revere adopted budget books):\n${civic.map((c: any) => `${c.dept}: ${c.name}${c.title ? `, ${c.title}` : ""}${c.phone ? `, ${c.phone}` : ""}${c.location ? `, ${c.location}` : ""} (${c.doc_id === "fy2027-budget" ? "FY2027 Adopted Budget" : "FY2026 Budget"}, p. ${c.page})`).join("\n")}`);
      for (const c of civic) sources.push({ kind: "budget", label: c.doc_id === "fy2027-budget" ? "FY2027 Adopted Budget" : "FY2026 Budget", detail: `p. ${c.page} · ${c.dept}`, url: `${c.source_url}#page=${c.page}` });
    }
    if (trend) {
      ctx.push(`POLICE CALL TRENDS (Revere PD dispatch log): ${trend.total} calls ${trend.since} to ${trend.latest} vs ${trend.prevTotal} in the 28 days before. Arrests ${trend.arrests} vs ${trend.prevArrests}. Biggest changes: ${trend.changes.map((x: any) => `${pretty(x.k)} ${x.before}->${x.now}`).join("; ")}. The log lists calls, not confirmed crimes.`);
      sources.push({ kind: "police", label: "Revere PD public log", detail: `${fmtShort(trend.prevSince)}–${fmtShort(trend.latest)}`, url: trend.sources[trend.sources.length - 1] });
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
      if (want("smalltalk")) {
        parts.push(/thank/i.test(q) ? "You're welcome. Ask me anything else about Revere." :
          "Hi! I can answer questions about Revere using the city's own data:\n- **Trains and buses**: \"When's the next train from Beachmont?\"\n- **Police calls**: \"What happened on Broadway this week?\"\n- **Safety trends**: \"Is crime going up?\"\n- **City money**: \"How much goes to schools?\"\n- **Who to contact**: \"Who is the mayor?\"\n- **Weather and housing**: \"Will it rain this weekend?\" \"What's rent like?\"");
      }
      for (const c of civic || []) {
        const src = `*${c.doc_id === "fy2027-budget" ? "FY2027 Adopted Budget" : "FY2026 Budget"}, p. ${c.page}*`;
        parts.push(c.dept === "Mayor" ? `**The Mayor of Revere is ${c.name.replace(/\.$/, "")}.** ${c.title.replace(/^Mayor ?/, "")}`.trim() : `**${c.dept}: ${c.name}**${c.title ? `, ${c.title}` : ""}.`);
        if (c.phone || c.location) parts.push(`- ${[c.phone ? `Phone ${c.phone}` : "", c.location || ""].filter(Boolean).join(" · ")}`);
        parts.push(`- Source: ${src}. Staff can change; check revere.org for the latest.`);
      }
      if (want("budget") && /\b(school|schools|education|rps)\b/i.test(q)) {
        const R = "https://files.aptuitivcdn.com/GB7r14nbKy-1182/docs/FY2027-Budget-Adopted.pdf";
        parts.push(`**Revere Public Schools — FY2027 appropriation: $132,944,577** (up 1.0% from $131,567,036 in FY2026). It's the largest single line in the city budget.`);
        parts.push(`- Source: *FY2027 Adopted Budget, p. 172*`);
        sources.push({ kind: "budget", label: "FY2027 Adopted Budget", detail: "p. 172 · School Department", url: `${R}#page=172` });
      }
      if (want("revenue")) {
        const R = "https://files.aptuitivcdn.com/GB7r14nbKy-1182/docs/FY2027-Budget-Adopted.pdf";
        parts.push(`**Property taxes are Revere's biggest source of money: about $133.2M projected for FY2027**, up from $126.5M in FY2026 (FY2027 Adopted Budget, p. 237).`);
        parts.push(`- Where the general fund comes from (FY2027 estimate): property taxes 47%, state aid 44%, local receipts 8%, water/sewer indirect costs 1% (p. 228).`);
        parts.push(`- Largest local receipts (FY2027 projected): motor vehicle excise $7.5M, licenses & permits $3.7M, hotel excise $3.4M, investment income $3.0M, fines $2.2M, meals tax $1.25M (pp. 237–241).`);
        parts.push(`- Reserves: certified free cash $2.79M (June 30, 2025); stabilization fund about $12.8M projected for FY2027 (pp. 230–231).`);
        sources.push({ kind: "budget", label: "FY2027 Adopted Budget", detail: "pp. 228–242 · revenue", url: `${R}#page=228` });
      }
      if (trend) {
        const pct = trend.prevTotal ? ((trend.total - trend.prevTotal) / trend.prevTotal) * 100 : 0;
        parts.push(`**Police calls are ${Math.abs(pct) < 3 ? "about the same" : pct > 0 ? `up ${pct.toFixed(0)}%` : `down ${Math.abs(pct).toFixed(0)}%`}** over the latest ${trend.days} days of the log (${trend.total.toLocaleString("en-US")} calls, ${fmtShort(trend.since)}–${fmtShort(trend.latest)}) compared with the ${trend.days} days before (${trend.prevTotal.toLocaleString("en-US")} calls, ${fmtShort(trend.prevSince)}–${fmtShort(trend.prevUntil)}).`);
        parts.push(`- Arrests: ${trend.arrests} vs ${trend.prevArrests}.`);
        for (const x of trend.changes) parts.push(`- ${pretty(x.k)}: ${x.before} → ${x.now} (${x.diff >= 0 ? "+" : ""}${x.diff})`);
        parts.push(`- The dispatch log counts calls officers responded to, not confirmed crimes. Full detail on the Police log page.`);
      }
      if (police) {
        parts.push(`**${police.total.toLocaleString("en-US")} police calls${police.streets.length ? " around " + police.streets.slice(0, 3).map(title).join(", ") + (police.streets.length > 3 ? ` +${police.streets.length - 3} more` : "") : " in Revere"}** from ${fmtShort(police.since)} to ${fmtShort(police.latestDate)}, the most recent log the police department has posted.`);
        if (police.byHour.length) parts.push(`Busiest around ${police.byHour.slice(0, 3).map(([h]) => `${Number(h) % 12 || 12} ${Number(h) < 12 ? "AM" : "PM"}`).join(", ")}. Recent calls worth knowing about:`);
        police.notable.slice(0, 4).forEach((r) => parts.push(`- **${plainReason(r.call_reason)}**${r.location_street ? " on " + title(r.location_street) : ""} — ${plainAction(r.action)} *(${fmtShort(r.log_date)}, ${time12(r.time_24h)})*`));
      }
      if (weather) {
        const c = weather.current;
        parts.push(`**Weather now:** ${Math.round(c.temp)}°F and ${c.conditions.toLowerCase()} (feels like ${Math.round(c.feelslike)}°F, wind ${Math.round(c.windspeed)} mph).`);
        weather.days.slice(1, 3).forEach((d: any) => parts.push(`- ${new Date(d.date + "T12:00").toLocaleDateString("en-US", { weekday: "long" })}: ${d.conditions}, ${Math.round(d.hi)}°/${Math.round(d.lo)}°, ${d.precipprob}% chance of precipitation`));
        if (weather.alerts.length) parts.push(`- ⚠️ ${weather.alerts.map((a: any) => a.event).join(", ")}`);
      }
      if (mbta) {
        const fmt = (m: number) => (m <= 0 ? "boarding now" : `${m} min`);
        for (const st of mbta.stations) {
          for (const dir of mbta.wantDir != null ? [mbta.wantDir] : [0, 1]) {
            const l = mbta.preds.filter((p: any) => p.station === st && p.dir === dir);
            if (!l.length) continue;
            parts.push(`**Next train from ${st} to ${dir === 0 ? "Boston" : "Wonderland"}: ${fmt(l[0].mins)}**${l.length > 1 ? `, then ${l.slice(1, 3).map((p: any) => `${p.mins} min`).join(" and ")}` : ""}.`);
          }
        }
        const blue = mbta.alerts.filter((a: any) => /blue line|wonderland|revere|beachmont|suffolk|orient|airport|maverick/i.test(a.header));
        parts.push(blue.length ? `- ⚠️ Blue Line alert: ${blue[0].header}` : `- No alerts on the Blue Line right now.`);
        const bus = mbta.alerts.filter((a: any) => !blue.includes(a));
        if (bus.length) parts.push(`- Bus: ${bus[0].header}`);
      }
      if (housing && housing.rows.length) {
        const r = housing.rows.find((x) => x.place === "Revere");
        const pc = (x: number | null) => (x == null ? "" : ` (${x >= 0 ? "up" : "down"} ${Math.abs(x).toFixed(1)}% in a year)`);
        if (r) parts.push(`**Housing in Revere (${housing.month ? fmtDate(housing.month) : "latest"}):** typical home value **$${r.value?.toLocaleString("en-US")}**${pc(r.vYoY)}${r.rent ? `; typical rent **$${r.rent.toLocaleString("en-US")}/month**${pc(r.rYoY)}` : ""}.`);
        if (r?.rent) parts.push(`- Affording that rent at 30% of income takes about $${Math.round((r.rent * 12) / 0.3 / 1000)}K a year.`);
        housing.rows.filter((x) => x.place !== "Revere" && x.value).slice(0, 6).forEach((x) => parts.push(`- ${x.place}: $${x.value!.toLocaleString("en-US")}${x.rent ? ` · rent $${x.rent.toLocaleString("en-US")}/mo` : ""}`));
        parts.push(`- Source: *Zillow Research (ZHVI, ZORI)*`);
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
      if (budget && budget.length && !(depts && depts.length) && !want("revenue") && !/\b(school|schools|education|rps)\b/i.test(q)) {
        parts.push(`**From the city budget documents** — the most relevant passages:`);
        budget.slice(0, 3).forEach((c: any) => {
          const snippet = c.content.split("\n").filter((l: string) => /\d/.test(l)).slice(0, 4).join("\n") || c.content.slice(0, 300);
          parts.push(`> *${c.doc_title}, p. ${c.page}${c.section ? " — " + title(c.section) : ""}*\n> ${snippet.replace(/\n/g, "\n> ")}`);
        });
      }
      answer = parts.join("\n") || "I don't have that in my Revere data yet. I can help with **trains and buses, weather, police calls and safety trends, the city budget and taxes, housing costs**, and **who to contact at City Hall**. For anything else, try revere.org or the Mayor's office at 781-286-8111.";
    }

    return json({ answer, sources, cards, mode: gen ? "llm" : "grounded", model: gen?.model ?? null, route: { intents: [...r.intents], top: r.top }, ms: Date.now() - started });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
