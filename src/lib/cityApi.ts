// Client for the city's edge functions (public, read-only endpoints).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co";
const FN = `${SUPABASE_URL}/functions/v1`;

export type PulseItem = {
  id: string;
  kind: "mbta" | "weather" | "police" | "city";
  level: "breaking" | "alert" | "info";
  tag: string;
  text: string;
  at?: string;
  href?: string;
};

export async function getCityPulse(): Promise<PulseItem[]> {
  const r = await fetch(`${FN}/city-pulse`);
  if (!r.ok) throw new Error(`city-pulse ${r.status}`);
  const j = await r.json();
  return j.items ?? [];
}

export type AskSource = { kind: string; label: string; detail?: string; url?: string };
export type AskCard =
  | { type: "weather"; current: { temp: number; feels: number; conditions: string; icon: string; wind: number }; days: { date: string; hi: number; lo: number; conditions: string; precipprob: number }[]; alerts: number }
  | { type: "mbta"; alerts: { effect: string; header: string }[]; preds: { station: string; toward: string; mins: number }[] }
  | { type: "police"; latestDate: string; since: string; total: number; streets: string[]; byCat: [string, number][] }
  | { type: "budget"; rows: { name: string; fy: number; amount: number | null; prior: number | null; payroll: number | null; nonPayroll: number | null; page: number; doc: string }[] }
  | { type: "housing"; month?: string; rows: { place: string; value?: number; vYoY: number | null; rent?: number; rYoY: number | null }[] };
export type AskResponse = { answer: string; sources: AskSource[]; cards: AskCard[]; mode: "llm" | "grounded"; model: string | null; ms: number };
export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function askCity(question: string, history: ChatTurn[], signal?: AbortSignal): Promise<AskResponse> {
  const r = await fetch(`${FN}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history: history.slice(-6) }),
    signal,
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `ask ${r.status}`);
  return j;
}
