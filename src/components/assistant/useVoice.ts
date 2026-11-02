import { useCallback, useEffect, useRef, useState } from "react";

// Free, key-less voice using the browser's Web Speech API: recognition (Chrome, Edge, Safari)
// and speech synthesis (all modern browsers).
//
// Reliability notes, learned the hard way:
// - Never open a second microphone stream (getUserMedia) while recognition runs. On Android Chrome
//   and iOS Safari that makes recognition stop at once or hear nothing, and on iOS it can mute speech
//   output. The level meter is therefore driven by recognition events, not by the raw audio.
// - iOS only lets speech synthesis start from a user gesture. We "unlock" it on the first tap.
// - Recognition must be started synchronously inside the tap handler (no setTimeout) for Safari.
// - Desktop Chrome ends a non-continuous session after a short pause; we keep the session open and stop
//   after ~1.6s of silence instead. Mobile browsers handle continuous mode poorly, so they stay one-shot.

// deno-lint-ignore no-explicit-any
type AnyRec = any;

const RecCtor = (): AnyRec | null => {
  if (typeof window === "undefined") return null;
  const w = window as AnyRec;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};
const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function stripForSpeech(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*|__|\*|_|`|#+\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\(([^)]*p\.\s?\d+[^)]*)\)/g, "")
    .replace(/Source:.*$/gim, "")
    .replace(/→/g, " to ")
    .replace(/[|•◆]/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

let cachedVoice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const en = voices.filter((v) => /^en(-|_)?(US|GB)?/i.test(v.lang));
  const prefs = [/natural/i, /neural/i, /google us english/i, /samantha/i, /aria/i, /jenny/i, /ava/i, /allison/i];
  for (const p of prefs) {
    const v = en.find((x) => p.test(x.name));
    if (v) return (cachedVoice = v);
  }
  return (cachedVoice = en[0] ?? voices[0] ?? null);
}

let unlocked = false;
/** Call from any user tap: lets iOS speak later (after an answer arrives). */
export function unlockSpeech() {
  if (unlocked || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try { const u = new SpeechSynthesisUtterance(""); u.volume = 0; window.speechSynthesis.speak(u); unlocked = true; } catch { /* ignore */ }
}

export function useVoice({ onFinal }: { onFinal: (text: string) => void }) {
  const [supported] = useState(() => !!RecCtor());
  const [ttsSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [listening, setListening] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState<number[]>(() => Array(24).fill(0));
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<AnyRec>(null);
  const finalRef = useRef("");
  const silenceRef = useRef<ReturnType<typeof setTimeout>>();
  const gotAnything = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  // Level bars driven by recognition state: calm while waiting, lively while speech is detected.
  useEffect(() => {
    if (!listening) { setLevel(Array(24).fill(0)); return; }
    let raf = 0, t = 0;
    const tick = () => {
      t += 1;
      setLevel(Array.from({ length: 24 }, (_, i) => {
        const base = hearing ? 0.35 + 0.55 * Math.abs(Math.sin(t / 6 + i * 0.7)) * (0.6 + 0.4 * Math.sin(t / 11 + i)) : 0.08 + 0.06 * Math.abs(Math.sin(t / 14 + i * 0.5));
        return Math.max(0, Math.min(1, base));
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening, hearing]);

  const stopListening = useCallback(() => {
    clearTimeout(silenceRef.current);
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const startListening = useCallback(() => {
    if (!supported) {
      setError("Voice input isn't available in this browser. Chrome, Edge and Safari support it; you can still type.");
      return;
    }
    unlockSpeech();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setError(null);
    try { recRef.current?.abort(); } catch { /* ignore */ }

    const Ctor = RecCtor();
    const rec = new Ctor();
    recRef.current = rec;
    const continuous = !isMobile();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = continuous;
    rec.maxAlternatives = 1;
    finalRef.current = "";
    gotAnything.current = false;

    const armSilence = () => {
      if (!continuous) return;
      clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } }, 1600);
    };

    rec.onspeechstart = () => setHearing(true);
    rec.onspeechend = () => setHearing(false);
    rec.onresult = (e: AnyRec) => {
      gotAnything.current = true;
      setHearing(true);
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += (finalRef.current ? " " : "") + r[0].transcript.trim();
        else interimText += r[0].transcript;
      }
      setInterim((finalRef.current + " " + interimText).trim());
      armSilence();
    };
    rec.onerror = (e: AnyRec) => {
      const m: Record<string, string> = {
        "not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then tap the mic again.",
        "service-not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then tap the mic again.",
        "audio-capture": "No microphone was found on this device.",
        "network": "Voice needs an internet connection. Check your connection and try again.",
        "no-speech": "I didn't hear anything. Tap the mic and start talking.",
        "language-not-supported": "Voice isn't available for this language in your browser.",
      };
      if (e.error !== "aborted") setError(m[e.error] ?? "Something interrupted the microphone. Tap the mic to try again.");
    };
    rec.onend = () => {
      clearTimeout(silenceRef.current);
      setListening(false);
      setHearing(false);
      const text = (finalRef.current || "").trim() || (gotAnything.current ? interimRef.current.trim() : "");
      setInterim("");
      if (text) onFinalRef.current(text);
    };
    try {
      rec.start();
      setListening(true);
      // If nothing at all is heard for a while, end the session gently (desktop continuous mode).
      if (continuous) silenceRef.current = setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } }, 7000);
    } catch {
      setError("Couldn't start the microphone. Tap the mic to try again.");
    }
  }, [supported]);

  // Keep the latest interim text for the end-of-session fallback.
  const interimRef = useRef("");
  interimRef.current = interim;

  const speak = useCallback((markdown: string, onDone?: () => void) => {
    if (!ttsSupported) { onDone?.(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const text = stripForSpeech(markdown);
    if (!text) { onDone?.(); return; }
    // Chrome drops long utterances; speak sentence-sized pieces in order.
    const parts = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    const voice = pickVoice();
    setSpeaking(true);
    let finished = false;
    const done = () => { if (finished) return; finished = true; setSpeaking(false); onDone?.(); };
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "en-US";
      u.rate = 1.0;
      if (i === parts.length - 1) u.onend = done;
      u.onerror = (ev: AnyRec) => { if (ev?.error !== "interrupted" && ev?.error !== "canceled") done(); };
      synth.speak(u);
    });
    // Chrome can stall the queue in background tabs; resume nudges it.
    const keepAlive = setInterval(() => { if (!synth.speaking) { clearInterval(keepAlive); return; } synth.resume(); }, 5000);
  }, [ttsSupported]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (synth) {
      pickVoice();
      const onVoices = () => { cachedVoice = null; pickVoice(); };
      synth.addEventListener?.("voiceschanged", onVoices);
      return () => { synth.removeEventListener?.("voiceschanged", onVoices); try { recRef.current?.abort(); } catch { /* ignore */ } synth.cancel(); };
    }
    return () => { try { recRef.current?.abort(); } catch { /* ignore */ } };
  }, []);

  return { supported, ttsSupported, listening, hearing, interim, speaking, level, error, setError, startListening, stopListening, speak, stopSpeaking };
}
