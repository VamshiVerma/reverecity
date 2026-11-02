// Voice for the Revere assistant, on Groq's free tier.
//   POST ?mode=stt  body: recorded audio (webm/mp4/ogg/wav)  -> { text }      (Whisper large v3 turbo)
//   POST ?mode=tts  body: { text }                          -> audio/wav     (Orpheus; 409 if unavailable)
// The key stays on the server. Requests are size-limited and rate-limited per client.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const hits = new Map<string, number[]>();
function limited(ip: string, max = 40, windowMs = 10 * 60e3) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!KEY) return json({ error: "voice not configured", fallback: true }, 503);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  if (limited(ip)) return json({ error: "Too many voice requests. Try again in a few minutes.", fallback: true }, 429);
  const mode = new URL(req.url).searchParams.get("mode");

  if (mode === "stt") {
    const type = req.headers.get("content-type") || "audio/webm";
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength < 800) return json({ text: "" });
    if (buf.byteLength > 4_000_000) return json({ error: "Recording too long" }, 413);
    const ext = type.includes("mp4") || type.includes("m4a") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
    const form = new FormData();
    form.append("file", new Blob([buf], { type }), `speech.${ext}`);
    form.append("model", "whisper-large-v3-turbo");
    form.append("language", "en");
    form.append("response_format", "json");
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form });
    if (!r.ok) return json({ error: "transcription failed", fallback: true }, 502);
    const j = await r.json();
    const text = String(j.text ?? "").trim();
    // Whisper prints punctuation or stock phrases on silence; treat those as nothing heard.
    const empty = !text || /^[\s.,!?]*$/.test(text) || /^(thank you\.?|thanks for watching!?|you)$/i.test(text);
    return json({ text: empty ? "" : text });
  }

  if (mode === "tts") {
    const { text = "", voice = "hannah" } = await req.json().catch(() => ({}));
    const input = String(text).slice(0, 900).trim();
    if (!input) return json({ error: "empty text" }, 400);
    const r = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "canopylabs/orpheus-v1-english", voice, input, response_format: "wav" }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return json({ error: e?.error?.code || "tts unavailable", fallback: true }, 409);
    }
    return new Response(r.body, { headers: { ...cors, "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  }

  return json({ error: "mode must be stt or tts" }, 400);
});
