// Plain-English wording for Revere PD log entries (mirrors the server's version).
const ACTION_PLAIN: [RegExp, string][] = [
  [/^services rendered/i, "officers helped"], [/^call log entry only/i, "logged only"], [/^report to follow/i, "report filed"],
  [/referred to other agency/i, "referred to another agency"], [/^no action required/i, "no action needed"], [/^tow motor vehicle/i, "vehicle towed"],
  [/^citation\/warning issued/i, "citation or warning"], [/^nothing showing/i, "nothing found"], [/^refused response/i, "help declined"],
  [/^officer spoke to subject/i, "officer spoke with them"], [/^no service made/i, "papers not served"], [/^mva - papers exchanged/i, "drivers swapped info"],
  [/^arrest\(s\) made/i, "arrest made"], [/^(transported to hospital|ambulance transport)/i, "taken to hospital"], [/^building checked/i, "building checked"],
  [/^unable to locate/i, "couldn't locate"], [/^be on the lookout/i, "lookout issued"], [/^(accidental trip|false alarm)/i, "false alarm"],
  [/^medical aid/i, "medical aid given"], [/^parking ticker issued/i, "parking ticket"], [/^no violation observed/i, "no violation"],
  [/^paperwork served/i, "papers served"], [/^transported to court/i, "taken to court"], [/^peace restored/i, "peace restored"],
  [/^verbal warning/i, "verbal warning"], [/^unfounded/i, "unfounded"],
];
export function plainAction(a?: string | null) {
  const s = String(a || "").trim();
  for (const [re, out] of ACTION_PLAIN) if (re.test(s)) return out;
  return s.toLowerCase();
}
export function plainReason(r?: string | null) {
  return String(r || "").replace(/\bMotor Vehicle Accident\b/gi, "Car crash").replace(/^MVA\s*[-,]?\s*/i, "Car crash, ")
    .replace(/Hit & Run/gi, "hit-and-run").replace(/,\s*$/, "").replace(/\s+/g, " ").trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
export function time12(hhmm?: string | null) {
  const m = String(hhmm || "").match(/^(\d{2}):?(\d{2})/);
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
export function street(s?: string | null) {
  return String(s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bVfw\b/, "VFW").replace(/\bMbta\b/, "MBTA");
}
export const CATEGORY: Record<string, { label: string; tone: string }> = {
  VIOLENCE_THREATS: { label: "Violence or threats", tone: "#FC734D" },
  DOMESTIC: { label: "Domestic", tone: "#f4a58a" },
  THEFT_PROPERTY: { label: "Theft & property", tone: "#ffc2ad" },
  CRASH: { label: "Car crashes", tone: "#0297DE" },
  TRAFFIC: { label: "Traffic & parking", tone: "#5cc6ff" },
  MEDICAL: { label: "Medical", tone: "#b9e3fb" },
  FIRE_ALARM: { label: "Fire & alarms", tone: "#d9572f" },
  DISTURBANCE: { label: "Disturbances & noise", tone: "#2f7fb3" },
  SUSPICIOUS: { label: "Suspicious activity", tone: "#8a9ba8" },
  EMERGENCY_CALL: { label: "911 & emergency calls", tone: "#c8d3da" },
  MISSING_PERSON: { label: "Missing person", tone: "#f4a58a" },
  ASSIST_SERVICE: { label: "Help & service requests", tone: "#4b5a66" },
  OTHER: { label: "Other", tone: "#3a4650" },
};
export const catLabel = (k?: string | null) => CATEGORY[k || "OTHER"]?.label ?? "Other";
export const catTone = (k?: string | null) => CATEGORY[k || "OTHER"]?.tone ?? "#3a4650";
