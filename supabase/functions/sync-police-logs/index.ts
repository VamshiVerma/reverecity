// Supabase Edge Function — Revere police public-log sync.
// Discovers the PD's published dispatch logs, parses every call entry and upserts
// them into `police_logs`. Idempotent: entries upsert on call_number and each
// source PDF is recorded in `police_logs_sync_status`.
//
// Query params: ?force=1 re-processes logs already synced; ?max=N caps PDFs per run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LISTING_URL = "https://reverepolice.org/public-media-log";
const JINA = "https://r.jina.ai/";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};

// Actions the department uses, matched as a suffix of "<reason> <action>".
const ACTIONS = [
  "AMBULANCE TRANSPORT- MASS GEN", "TAKEN/REFERRED TO OTHER AGENCY", "OFFICER SPOKE TO SUBJECT",
  "UNABLE TO LOCATE SUBJECT", "UNABLE TO LOCATE CALLER", "BUILDING CHECKED/SECURED",
  "NO SIGN OF FORCED ENTRY", "TRANSPORTED TO HOSPITAL", "TRANSPORTED TO COURT",
  "CITATION/WARNING ISSUED", "MVA - PAPERS EXCHANGED", "NO VIOLATION OBSERVED",
  "PARKING TICKER ISSUED", "PARKING TICKET ISSUED", "CALL LOG ENTRY ONLY", "NO ACTION REQUIRED",
  "SERVICES RENDERED", "VIOLATION OBSERVED", "AMBULANCE TRANSPORT", "PROTECTIVE CUSTODY",
  "ASSIST OTHER AGENCY", "SUBJECT HAS MOVED", "BE ON THE LOOKOUT", "TOW MOTOR VEHICLE",
  "PAPERWORK SERVED", "REPORT TO FOLLOW", "REFUSED RESPONSE", "MASTER BOX RESET",
  "NO SERVICE MADE", "GONE ON ARRIVAL", "NOTHING SHOWING", "ACCIDENTAL TRIP", "PEACE RESTORED",
  "ARREST(S) MADE", "SUMMONS ISSUED", "VERBAL WARNING", "UNABLE TO LOCATE", "VEHICLE MOVED",
  "SERVICE MADE", "FALSE ALARM", "MEDICAL AID", "INVESTIGATED", "AREA QUIET", "AREA CLEAR",
  "UNFOUNDED", "CANCELLED", "LARCENY", "ADVISED", "CLEARED", "OTHER",
].sort((a, b) => b.length - a.length);

interface DiscoveredLog { pdfUrl: string; title: string; startDate: string | null }

async function fetchMarkdown(url: string): Promise<string> {
  const res = await fetch(JINA + url, { headers: { Accept: "text/markdown", "x-no-cache": "true" } });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return await res.text();
}

function isoFromLongDate(s: string): string | null {
  const m = s.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const mo = MONTHS[m[1].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

// Parse the listing page: "Public Log October 15, 2026 7am to ... (redacted)" followed by its PDF link.
// Also accepts the older single-day "Media Log MMDDYY" entries.
async function discoverLogs(): Promise<DiscoveredLog[]> {
  const md = await fetchMarkdown(LISTING_URL);
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: DiscoveredLog[] = [];
  const seen = new Set<string>();
  let lastTitle = "";
  for (const line of lines) {
    if (/^(Public Log|Media Log)\b/i.test(line)) { lastTitle = line; continue; }
    const link = line.match(/https:\/\/[^\s)"']+\/media-log\/[^\s)"']+\.pdf/i);
    if (!link) continue;
    const pdfUrl = link[0];
    if (/press-release/i.test(pdfUrl) || seen.has(pdfUrl)) continue;
    seen.add(pdfUrl);
    let startDate = lastTitle ? isoFromLongDate(lastTitle) : null;
    if (!startDate) {
      const mmddyy = pdfUrl.match(/media-log-(\d{2})(\d{2})(\d{2})_redacted/i);
      if (mmddyy) startDate = `20${mmddyy[3]}-${mmddyy[1]}-${mmddyy[2]}`;
    }
    out.push({ pdfUrl, title: lastTitle || pdfUrl.split("/").pop()!, startDate });
    lastTitle = "";
  }
  return out;
}

function categorizeCallType(text: string): string {
  const r = (text || "").toUpperCase();
  if (/SHOTS|ASSAULT|STABB|WEAPON|THREAT|ROBBERY|FIGHT/.test(r)) return "VIOLENCE_THREATS";
  if (/DOMESTIC|209 A|E R O/.test(r)) return "DOMESTIC";
  if (/LARCENY|THEFT|SHOPLIFT|BURGLARY|BREAKING|VANDALISM|STOLEN/.test(r)) return "THEFT_PROPERTY";
  if (/ACCIDENT|MVA|HIT & RUN/.test(r)) return "CRASH";
  if (/TRAFFIC|MOTOR VEHICLE|PARKING|TOW/.test(r)) return "TRAFFIC";
  if (/MEDICAL|AMBULANCE|OVERDOSE|SICK|INJUR/.test(r)) return "MEDICAL";
  if (/FIRE|SMOKE|ALARM/.test(r)) return "FIRE_ALARM";
  if (/DISTURBANCE|NOISE|HARRASS|HARASS/.test(r)) return "DISTURBANCE";
  if (/SUSPICIOUS/.test(r)) return "SUSPICIOUS";
  if (/911/.test(r)) return "EMERGENCY_CALL";
  if (/MISSING/.test(r)) return "MISSING_PERSON";
  if (/ASSIST|WELL BEING|CHECK|PATROL|COMMUNITY|COURTESY/.test(r)) return "ASSIST_SERVICE";
  return "OTHER";
}

function categorizeAction(action: string): string {
  const a = (action || "").toUpperCase();
  if (a.includes("ARREST")) return "ARREST";
  if (a.includes("SUMMONS")) return "SUMMONS";
  if (a.includes("REPORT")) return "REPORT";
  if (a.includes("CITATION") || a.includes("WARNING") || a.includes("TICKE")) return "WARNING";
  if (a.includes("SERVICES RENDERED")) return "SERVICES_RENDERED";
  if (a.includes("NO ACTION") || a.includes("LOG ENTRY")) return "NO_ACTION";
  if (a.includes("REFERRED") || a.includes("TRANSFER")) return "REFERRED";
  if (a.includes("HOSPITAL") || a.includes("AMBULANCE") || a.includes("MEDICAL")) return "MEDICAL";
  if (a.includes("UNFOUNDED") || a.includes("NOTHING SHOWING") || a.includes("FALSE")) return "UNFOUNDED";
  if (a.includes("UNABLE TO LOCATE") || a.includes("GONE ON ARRIVAL")) return "UNABLE_TO_LOCATE";
  if (a.includes("PEACE RESTORED") || a.includes("SPOKE TO")) return "RESOLVED";
  return "OTHER";
}

function splitReasonAction(text: string): { reason: string; action: string } {
  const t = text.trim();
  const u = t.toUpperCase();
  for (const a of ACTIONS) {
    if (u.endsWith(" " + a) && u.length > a.length + 1) {
      return { reason: t.slice(0, t.length - a.length).trim().replace(/,$/, ""), action: t.slice(t.length - a.length) };
    }
  }
  const amb = t.match(/^(.*?)\s+(AMBULANCE TRANSPORT.*)$/i);
  if (amb) return { reason: amb[1], action: amb[2] };
  const code = t.match(/^(.*?)\s+(\d{3})$/);
  if (code) return { reason: code[1], action: code[2] };
  return { reason: t, action: "" };
}

// Location lines can carry follow-on detail (incident refs, summons names/addresses/
// charges). Keep only the place itself — never personal details.
function cleanLocation(location: string): string {
  return location
    .replace(/\s*(Original Call #|Refer To|Revere Police Department - Public Log|Summons:|Arrest:|Address:|Age:|Charges:).*$/i, "")
    .trim();
}

function extractStreet(location: string | null): string | null {
  if (!location) return null;
  const s = location.replace(/\[(REV|NEW)\s*\d*\]\s*/i, "").replace(/\s*\+\s*/g, " + ").trim();
  return s || null;
}

function parseEntries(markdown: string, sourceUrl: string) {
  const entries: any[] = [];
  let cur: any = null;
  let currentDate: string | null = null;
  const footer = /\s*Revere Police Department - Public Log Page:\s*\d+\s*$/i;

  for (const raw of markdown.split("\n")) {
    const line = raw.replace(footer, "").trim();
    if (!line) continue;

    const forDate = line.match(/For Date:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (forDate) { currentDate = `${forDate[3]}-${forDate[1]}-${forDate[2]}`; continue; }
    if (!currentDate) {
      const from = line.match(/Dispatch Log From:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
      if (from) currentDate = `${from[3]}-${from[1]}-${from[2]}`;
    }

    const m = line.replace(/^Call Number Time Call Reason Action\s+/i, "")
      .match(/^(\d{2}-\d{4,6})\s+(\d{4})\s+(.+)$/);
    if (m && currentDate) {
      if (cur) entries.push(cur);
      const [, callNumber, time24h, rest] = m;
      const { reason, action } = splitReasonAction(rest);
      const ts = new Date(`${currentDate}T${time24h.slice(0, 2)}:${time24h.slice(2)}:00-04:00`);
      cur = {
        call_number: callNumber,
        log_date: currentDate,
        time_24h: time24h,
        timestamp: isNaN(ts.getTime()) ? `${currentDate}T00:00:00Z` : ts.toISOString(),
        call_reason: reason,
        call_type_category: categorizeCallType(reason),
        action: action || "UNSPECIFIED",
        action_category: categorizeAction(action),
        location_code: null,
        location_address: null,
        location_street: null,
        raw_entry: line,
        source_url: sourceUrl,
      };
      continue;
    }

    const loc = line.match(/^(?:Location\/Address|Location|Vicinity of):\s*(.+)$/i);
    if (loc && cur && !cur.location_address) {
      const l = cleanLocation(loc[1].trim());
      cur.location_address = l;
      cur.location_code = l.match(/\[(REV\s*\d*)\]/)?.[1]?.trim() ?? null;
      cur.location_street = extractStreet(l);
    }
  }
  if (cur) entries.push(cur);

  // De-duplicate call numbers within one PDF (last wins).
  const byCall = new Map<string, any>();
  for (const e of entries) byCall.set(e.call_number, e);
  return [...byCall.values()];
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const max = Math.max(1, Math.min(5, Number(url.searchParams.get("max") || 3)));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const logs = await discoverLogs();
    if (!logs.length) return json({ success: true, message: "No logs listed on source", discovered: 0 });

    const { data: done } = await supabase.from("police_logs_sync_status").select("source_url").eq("status", "success");
    const doneSet = new Set((done || []).map((d: any) => d.source_url));
    const todo = logs.filter((l) => force || !doneSet.has(l.pdfUrl)).slice(0, max);

    const results: any[] = [];
    for (const log of todo) {
      try {
        const md = await fetchMarkdown(log.pdfUrl);
        const entries = parseEntries(md, log.pdfUrl);
        for (let i = 0; i < entries.length; i += 500) {
          const { error } = await supabase.from("police_logs").upsert(entries.slice(i, i + 500), { onConflict: "call_number" });
          if (error) throw error;
        }
        const dates = entries.map((e) => e.log_date).sort();
        await supabase.from("police_logs_sync_status").upsert({
          sync_date: log.startDate || dates[0] || new Date().toISOString().slice(0, 10),
          status: "success",
          records_added: entries.length,
          source_url: log.pdfUrl,
          synced_at: new Date().toISOString(),
        }, { onConflict: "sync_date" });
        results.push({ log: log.title, records: entries.length, from: dates[0], to: dates[dates.length - 1] });
      } catch (e) {
        results.push({ log: log.title, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return json({ success: true, discovered: logs.length, processed: results.length, remaining: logs.filter((l) => !doneSet.has(l.pdfUrl)).length - results.filter((r) => !r.error).length, results });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
