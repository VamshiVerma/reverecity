import { useCallback, useEffect, useRef, useState } from "react";

// Voice for the assistant.
// Listening: record with MediaRecorder and transcribe on the server with Whisper (accurate, every browser).
//   Falls back to the browser's Web Speech recognition if recording or the server isn't available.
// Speaking: natural server voice (Orpheus) when enabled, otherwise the browser's speech synthesis.
//
// Reliability rules learned the hard way:
// - Only ever one microphone stream. Never run Web Speech recognition and a recording stream together.
// - Start the microphone synchronously inside the tap (Safari requires it).
// - iOS only plays audio/speech that was "unlocked" by a tap; unlock on the first tap and reuse one <audio>.

// deno-lint-ignore no-explicit-any
type AnyRec = any;
const FN = `${import.meta.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co"}/functions/v1/voice`;

const RecCtor = (): AnyRec | null => {
  if (typeof window === "undefined") return null;
  const w = window as AnyRec;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};
const canRecord = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof (window as AnyRec).MediaRecorder !== "undefined";
const pickMime = () => {
  const MR = (window as AnyRec).MediaRecorder;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MR?.isTypeSupported?.(m)) return m;
  return "";
};

export function stripForSpeech(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\u2011/g, "-")
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
  for (const p of [/natural/i, /neural/i, /google us english/i, /samantha/i, /aria/i, /jenny/i, /ava/i, /allison/i]) {
    const v = en.find((x) => p.test(x.name));
    if (v) return (cachedVoice = v);
  }
  return (cachedVoice = en[0] ?? voices[0] ?? null);
}

// One shared audio element, unlocked by the first tap, so iOS will play answers that arrive later.
let player: HTMLAudioElement | null = null;
let unlocked = false;
let serverTts: boolean | null = null; // null = unknown, false = unavailable this session
export function unlockSpeech() {
  if (typeof window === "undefined") return;
  if (!player) { player = new Audio(); player.preload = "auto"; }
  if (unlocked) return;
  unlocked = true;
  try {
    player.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    player.play().catch(() => {});
  } catch { /* ignore */ }
  try { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(""); u.volume = 0; window.speechSynthesis.speak(u); } } catch { /* ignore */ }
}

export function useVoice({ onFinal }: { onFinal: (text: string) => void }) {
  const [supported] = useState(() => canRecord() || !!RecCtor());
  const [ttsSupported] = useState(() => typeof window !== "undefined");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState<number[]>(() => Array(24).fill(0));
  const [error, setError] = useState<string | null>(null);

  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  // Bumped whenever speech is stopped or restarted, so stale chunks never play.
  const speechRun = useRef(0);
  const stopRef = useRef<() => void>(() => {});
  const cleanupRef = useRef<() => void>(() => {});

  /* ---------- fallback: the browser's own recognition ---------- */
  const startBrowserRecognition = useCallback(() => {
    const Ctor = RecCtor();
    if (!Ctor) { setError("Voice input isn't available in this browser. You can still type."); return; }
    const rec = new Ctor();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let finalText = "";
    rec.onspeechstart = () => setHearing(true);
    rec.onresult = (e: AnyRec) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += (finalText ? " " : "") + r[0].transcript.trim(); else interimText += r[0].transcript;
      }
      setInterim((finalText + " " + interimText).trim());
    };
    rec.onerror = (e: AnyRec) => {
      const m: Record<string, string> = {
        "not-allowed": "Microphone access is blocked. Allow the microphone for this site, then tap the mic again.",
        "service-not-allowed": "Microphone access is blocked. Allow the microphone for this site, then tap the mic again.",
        "audio-capture": "No microphone was found on this device.",
        network: "Voice needs an internet connection.",
        "no-speech": "I didn't hear anything. Tap the mic and start talking.",
      };
      if (e.error !== "aborted") setError(m[e.error] ?? "Something interrupted the microphone. Tap the mic to try again.");
    };
    rec.onend = () => { setListening(false); setHearing(false); setInterim(""); if (finalText.trim()) onFinalRef.current(finalText.trim()); };
    stopRef.current = () => { try { rec.stop(); } catch { /* ignore */ } };
    cleanupRef.current = () => { try { rec.abort(); } catch { /* ignore */ } };
    try { rec.start(); setListening(true); } catch { setError("Couldn't start the microphone. Tap the mic to try again."); }
  }, []);

  /* ---------- main path: record, then transcribe with Whisper ---------- */
  const startListening = useCallback(() => {
    unlockSpeech();
    speechRun.current++;
    try { window.speechSynthesis?.cancel(); player?.pause(); } catch { /* ignore */ }
    setSpeaking(false);
    setError(null);
    cleanupRef.current();
    if (!canRecord()) { startBrowserRecognition(); return; }

    setListening(true);
    setInterim("");
    // getUserMedia is called synchronously from the tap; everything else follows from its promise.
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then((stream) => {
      const mime = pickMime();
      const MR = (window as AnyRec).MediaRecorder;
      const recorder = mime ? new MR(stream, { mimeType: mime }) : new MR(stream);
      const chunks: Blob[] = [];
      const AC = (window as AnyRec).AudioContext || (window as AnyRec).webkitAudioContext;
      const ctx: AudioContext = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tbuf = new Uint8Array(an.fftSize);
      const started = performance.now();
      let lastVoice = 0, spoke = false, raf = 0, stopped = false;

      const finish = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(raf);
        try { recorder.state !== "inactive" && recorder.stop(); } catch { /* ignore */ }
      };
      const release = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        setLevel(Array(24).fill(0));
        setHearing(false);
      };
      stopRef.current = finish;
      cleanupRef.current = () => { stopped = true; try { recorder.stop(); } catch { /* ignore */ } release(); };

      const tick = () => {
        an.getByteFrequencyData(buf);
        an.getByteTimeDomainData(tbuf);
        let sum = 0;
        for (let i = 0; i < tbuf.length; i++) { const v = (tbuf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / tbuf.length);
        const t = performance.now();
        const loud = rms > 0.035;
        if (loud) { lastVoice = t; if (!spoke) { spoke = true; setHearing(true); } }
        setLevel(Array.from({ length: 24 }, (_, i) => Math.min(1, (buf[2 + i * 3] ?? 0) / 200)));
        // Stop after ~1.5s of quiet once they've spoken; give up after 7s of nothing; cap at 20s.
        if ((spoke && t - lastVoice > 1500) || (!spoke && t - started > 7000) || t - started > 20000) { finish(); return; }
        raf = requestAnimationFrame(tick);
      };

      recorder.ondataavailable = (e: AnyRec) => { if (e.data?.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        release();
        setListening(false);
        if (!spoke) { setError("I didn't hear anything. Tap the mic and start talking."); return; }
        const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
        setTranscribing(true);
        try {
          const r = await fetch(`${FN}?mode=stt`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || "transcription failed");
          if (j.text) onFinalRef.current(j.text);
          else setError("I couldn't make that out. Tap the mic and try again.");
        } catch {
          setError("Voice is having trouble right now. Tap the mic to try again, or type your question.");
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start(250);
      raf = requestAnimationFrame(tick);
    }).catch((err: AnyRec) => {
      setListening(false);
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") setError("Microphone access is blocked. Allow the microphone for this site in your browser settings, then tap the mic again.");
      else if (err?.name === "NotFoundError") setError("No microphone was found on this device.");
      else startBrowserRecognition();
    });
  }, [startBrowserRecognition]);

  const stopListening = useCallback(() => stopRef.current(), []);

  /* ---------- speaking ---------- */
  const speakBrowser = useCallback((text: string, done: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth) { done(); return; }
    synth.cancel();
    const parts = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    const voice = pickVoice();
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "en-US";
      if (i === parts.length - 1) u.onend = done;
      u.onerror = (ev: AnyRec) => { if (ev?.error !== "interrupted" && ev?.error !== "canceled") done(); };
      synth.speak(u);
    });
  }, []);

  const speak = useCallback(async (markdown: string, onDone?: () => void) => {
    const text = stripForSpeech(markdown);
    if (!text) { onDone?.(); return; }
    const run = ++speechRun.current;
    let finished = false;
    const done = () => { if (finished || run !== speechRun.current) return; finished = true; setSpeaking(false); onDone?.(); };
    setSpeaking(true);

    if (serverTts !== false && player) {
      // Split into short chunks: the first starts playing in about a second while the rest are prepared.
      const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
      const chunks: string[] = [];
      for (const sen of sentences) {
        const last = chunks[chunks.length - 1];
        if (last && last.length + sen.length < (chunks.length === 1 ? 90 : 240)) chunks[chunks.length - 1] = `${last} ${sen}`;
        else chunks.push(sen);
      }
      const fetchChunk = (t: string) => fetch(`${FN}?mode=tts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t.slice(0, 900) }) })
        .then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return URL.createObjectURL(await r.blob()); });
      const pending = chunks.slice(0, 12).map((c, i) => (i < 2 ? fetchChunk(c) : null));
      try {
        for (let i = 0; i < pending.length; i++) {
          if (run !== speechRun.current) return;
          const url = await (pending[i] ?? (pending[i] = fetchChunk(chunks[i])));
          if (i + 2 < pending.length && !pending[i + 2]) pending[i + 2] = fetchChunk(chunks[i + 2]);
          serverTts = true;
          if (run !== speechRun.current) { URL.revokeObjectURL(url); return; }
          await new Promise<void>((resolve, reject) => {
            player!.src = url;
            player!.onended = () => { URL.revokeObjectURL(url); resolve(); };
            player!.onerror = () => { URL.revokeObjectURL(url); reject(new Error("playback")); };
            player!.play().catch(reject);
          });
        }
        done();
        return;
      } catch {
        if (run !== speechRun.current) return;
        if (serverTts !== true) serverTts = false;
      }
    }
    speakBrowser(text, done);
  }, [speakBrowser]);

  const stopSpeaking = useCallback(() => {
    speechRun.current++;
    try { player?.pause(); } catch { /* ignore */ }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const onVoices = () => { cachedVoice = null; pickVoice(); };
    synth?.addEventListener?.("voiceschanged", onVoices);
    return () => { synth?.removeEventListener?.("voiceschanged", onVoices); cleanupRef.current(); synth?.cancel(); try { player?.pause(); } catch { /* ignore */ } };
  }, []);

  return { supported, ttsSupported, listening, transcribing, hearing, interim, speaking, level, error, setError, startListening, stopListening, speak, stopSpeaking };
}
