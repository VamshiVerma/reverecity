import { useCallback, useEffect, useRef, useState } from "react";

// Free, key-less voice: the browser's built-in Web Speech API for recognition
// (Chrome, Edge, Safari) and speech synthesis (all modern browsers), plus a live
// microphone level meter via the Web Audio API.

// deno-lint-ignore no-explicit-any
type AnyRec = any;

const getRecognition = (): AnyRec | null => {
  const w = window as AnyRec;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

export function stripForSpeech(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*|__|\*|_|`|#+\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\(([^)]*p\.\s?\d+[^)]*)\)/g, "") // drop page citations when speaking
    .replace(/[|•◆]/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const en = voices.filter((v) => /^en(-|_)?(US|GB)?/i.test(v.lang));
  const prefs = [/natural/i, /neural/i, /google us english/i, /samantha/i, /aria/i, /jenny/i, /ava/i, /allison/i];
  for (const p of prefs) {
    const v = en.find((x) => p.test(x.name));
    if (v) return v;
  }
  return en[0] ?? voices[0] ?? null;
}

export function useVoice({ onFinal }: { onFinal: (text: string) => void }) {
  const [supported] = useState(() => typeof window !== "undefined" && !!getRecognition());
  const [ttsSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState<number[]>(() => Array(24).fill(0));
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<AnyRec>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stopMeter = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(Array(24).fill(0));
  }, []);

  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 64;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(buf);
        const bars = Array.from({ length: 24 }, (_, i) => (buf[Math.min(buf.length - 1, i + 1)] ?? 0) / 255);
        setLevel(bars);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* meter is decorative; recognition can still work */
    }
  }, []);

  const stopListening = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const startListening = useCallback(() => {
    if (!supported) {
      setError("Voice input isn't available in this browser. Try Chrome, Edge or Safari.");
      return;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setError(null);
    const rec = getRecognition();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalRef.current = "";
    rec.onresult = (e: AnyRec) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim((finalRef.current + " " + interimText).trim());
    };
    rec.onerror = (e: AnyRec) => {
      if (e.error === "not-allowed") setError("Microphone permission was blocked. Allow it in your browser to talk.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError("Couldn't hear that clearly — try again.");
    };
    rec.onend = () => {
      setListening(false);
      stopMeter();
      const text = finalRef.current.trim();
      setInterim("");
      if (text) onFinalRef.current(text);
    };
    try {
      rec.start();
      setListening(true);
      startMeter();
    } catch {
      setError("Couldn't start the microphone.");
    }
  }, [supported, startMeter, stopMeter]);

  const speak = useCallback((markdown: string, onDone?: () => void) => {
    if (!ttsSupported) { onDone?.(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const text = stripForSpeech(markdown);
    // Chrome cuts long utterances; speak sentence-sized pieces.
    const parts = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    const voice = pickVoice();
    setSpeaking(true);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (voice) u.voice = voice;
      u.rate = 1.02;
      u.pitch = 1;
      if (i === parts.length - 1) u.onend = () => { setSpeaking(false); onDone?.(); };
      u.onerror = () => { if (i === parts.length - 1) { setSpeaking(false); onDone?.(); } };
      synth.speak(u);
    });
  }, [ttsSupported]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    // Voices load asynchronously in Chrome.
    window.speechSynthesis?.getVoices();
    return () => { stopMeter(); try { recRef.current?.abort(); } catch { /* ignore */ } window.speechSynthesis?.cancel(); };
  }, [stopMeter]);

  return { supported, ttsSupported, listening, interim, speaking, level, error, setError, startListening, stopListening, speak, stopSpeaking };
}
