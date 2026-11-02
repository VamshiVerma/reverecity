import { useCallback, useEffect, useRef, useState } from "react";
import { neuralReady, neuralSpeech, neuralStored, warmNeural } from "./neuralVoice";

// Voice for the assistant.
// Listening: record with MediaRecorder and transcribe on the server with Whisper (accurate, every browser).
//   Falls back to the browser's Web Speech recognition if recording or the server isn't available.
// Speaking, best first:
//   1. Orpheus on the server (natural; cached, at most two requests per answer to stretch the free allowance)
//   2. Piper, a neural voice that runs in the browser (natural, unlimited, ~60 MB one-time download)
//   3. The device's own voice, choosing its best "enhanced"/"natural" voice
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
  // Novelty voices on Apple devices sound broken; never pick them.
  const novelty = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|fred|junior|ralph|kathy|grandpa|grandma|eddy|flo|reed|rocko|sandy|shelley/i;
  const en = voices.filter((v) => /^en[-_]/i.test(v.lang) && !novelty.test(v.name));
  const score = (v: SpeechSynthesisVoice) => {
    let n = 0;
    if (/premium/i.test(v.name)) n += 60;
    if (/enhanced|neural|natural/i.test(v.name)) n += 50;
    if (/online/i.test(v.name)) n += 30;
    if (/siri/i.test(v.name)) n += 40;
    if (/google/i.test(v.name)) n += 35;
    if (/ava|zoe|allison|susan|samantha|aria|jenny|emma|michelle/i.test(v.name)) n += 10;
    if (/en[-_]US/i.test(v.lang)) n += 8;
    if (/compact/i.test(v.voiceURI)) n -= 30;
    if (v.localService === false) n += 5;
    return n;
  };
  return (cachedVoice = en.sort((a, b) => score(b) - score(a))[0] ?? voices[0] ?? null);
}

// What gets read aloud: the first few sentences, which is where answers put the answer.
// The full answer stays on screen. Short speech keeps the natural voice within its daily allowance.
function spokenPart(text: string, max = 320) {
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
  let out = "";
  for (const sen of sentences) {
    if (out && out.length + sen.length > max) break;
    out = out ? `${out} ${sen}` : sen;
  }
  return out.length > max + 120 ? `${out.slice(0, max).replace(/[,;:\s]+\S*$/, "")}.` : out;
}

// One shared audio element, unlocked by the first tap, so iOS will play answers that arrive later.
let player: HTMLAudioElement | null = null;
let unlocked = false;
// After a server failure, wait a bit before trying it again (never give up for the whole session).
let serverDownUntil = 0;
const ensurePlayer = () => { if (!player) { player = new Audio(); player.preload = "auto"; } return player; };
export function unlockSpeech() {
  if (typeof window === "undefined") return;
  ensurePlayer();
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
  const [caption, setCaption] = useState("");
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
      // Live words while you talk: re-transcribe what's been said so far every few seconds
      // (Whisper's free tier is rate-limited, so at most a handful per question, never overlapping).
      let partialAt = 0, partials = 0, partialBusy = false, partialOff = false;
      const partial = () => {
        if (partialBusy || partialOff || partials >= 6 || !chunks.length) return;
        partialBusy = true; partials++;
        const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
        fetch(`${FN}?mode=stt&partial=1`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob })
          .then(async (r) => { if (r.status === 429) { partialOff = true; return; } const j = await r.json(); if (j.text && !stopped) setInterim(j.text); })
          .catch(() => { partialOff = true; })
          .finally(() => { partialBusy = false; });
      };

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
        if (loud) { lastVoice = t; if (!spoke) { spoke = true; setHearing(true); partialAt = t + 1200; } }
        if (spoke && t >= partialAt) { partialAt = t + 2200; partial(); }
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
          if (j.text) { setInterim(j.text); onFinalRef.current(j.text); }
          else setError("I couldn't make that out. Tap the mic and try again.");
        } catch {
          setError("Voice is having trouble right now. Tap the mic to try again, or type your question.");
        } finally {
          setTranscribing(false);
          setInterim("");
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
      u.onstart = () => setCaption(p);
      if (i === parts.length - 1) u.onend = done;
      u.onerror = (ev: AnyRec) => { if (ev?.error !== "interrupted" && ev?.error !== "canceled") done(); };
      synth.speak(u);
    });
  }, []);

  const play = (url: string, run: number, words?: string) => new Promise<void>((resolve, reject) => {
    if (run !== speechRun.current) { URL.revokeObjectURL(url); resolve(); return; }
    if (words) setCaption(words);
    const p = ensurePlayer();
    p.src = url;
    p.onended = () => { URL.revokeObjectURL(url); resolve(); };
    p.onerror = () => { URL.revokeObjectURL(url); reject(new Error("playback")); };
    p.play().catch(reject);
  });

  // Neural (in-browser) if it's ready or already downloaded, otherwise the device voice.
  // A first-time download starts in the background so the next answer sounds natural.
  const speakFallback = useCallback(async (text: string, run: number, done: () => void) => {
    if (!neuralReady()) {
      const have = await neuralStored();
      if (!have) {
        const conn = (navigator as AnyRec).connection;
        if (!conn?.saveData) warmNeural();
        if (run === speechRun.current) speakBrowser(text, done);
        return;
      }
    }
    try {
      const parts = (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((x) => x.trim()).filter(Boolean);
      // Synthesize sentence by sentence, one ahead, so speech starts quickly.
      let next = neuralSpeech(parts[0]);
      for (let i = 0; i < parts.length; i++) {
        const url = await next;
        if (i + 1 < parts.length) next = neuralSpeech(parts[i + 1]);
        if (run !== speechRun.current) { URL.revokeObjectURL(url); return; }
        await play(url, run, parts[i]);
      }
      done();
    } catch {
      if (run === speechRun.current) speakBrowser(text, done);
    }
  }, [speakBrowser]);

  const speak = useCallback(async (markdown: string, onDone?: () => void) => {
    const text = spokenPart(stripForSpeech(markdown));
    if (!text) { onDone?.(); return; }
    const run = ++speechRun.current;
    let finished = false;
    const done = () => { if (finished || run !== speechRun.current) return; finished = true; setSpeaking(false); setCaption(""); onDone?.(); };
    setSpeaking(true);
    setCaption(text);

    if (Date.now() < serverDownUntil) { speakFallback(text, run, done); return; }

    // At most two requests: a short opening so speech starts in about a second, then the rest.
    const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
    let first = sentences[0];
    let i = 1;
    while (i < sentences.length && first.length + sentences[i].length < 110) first = `${first} ${sentences[i++]}`;
    const rest = sentences.slice(i).join(" ");
    const fetchChunk = (t: string) => fetch(`${FN}?mode=tts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) })
      .then(async (r) => {
        const left = Number(r.headers.get("x-tts-remaining") ?? NaN);
        if (left < 15) warmNeural(); // the allowance is nearly used up; get the in-browser voice ready
        if (!r.ok) throw new Error(String(r.status));
        return URL.createObjectURL(await r.blob());
      });
    const a = fetchChunk(first);
    const b = rest ? fetchChunk(rest) : null;
    b?.catch(() => {});
    try {
      await play(await a, run, first);
    } catch {
      if (run !== speechRun.current) return;
      serverDownUntil = Date.now() + 5 * 60e3;
      b?.then((u) => URL.revokeObjectURL(u)).catch(() => {});
      speakFallback(text, run, done);
      return;
    }
    if (!b || run !== speechRun.current) { done(); return; }
    try {
      await play(await b, run, rest);
      done();
    } catch {
      if (run !== speechRun.current) return;
      serverDownUntil = Date.now() + 5 * 60e3;
      speakFallback(rest, run, done); // only what hasn't been said yet
    }
  }, [speakFallback]);

  const stopSpeaking = useCallback(() => {
    speechRun.current++;
    try { player?.pause(); } catch { /* ignore */ }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setCaption("");
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const onVoices = () => { cachedVoice = null; pickVoice(); };
    synth?.addEventListener?.("voiceschanged", onVoices);
    return () => { synth?.removeEventListener?.("voiceschanged", onVoices); cleanupRef.current(); synth?.cancel(); try { player?.pause(); } catch { /* ignore */ } };
  }, []);

  return { supported, ttsSupported, listening, transcribing, hearing, interim, speaking, caption, level, error, setError, startListening, stopListening, speak, stopSpeaking };
}
