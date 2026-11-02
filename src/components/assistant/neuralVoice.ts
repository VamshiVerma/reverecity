// A natural neural voice that runs entirely in the browser (Piper), used when the server voice is
// unavailable (Groq's free tier allows about 100 spoken answers a day for the whole site).
// The model (~60 MB) downloads once and is kept in the browser's private storage (OPFS),
// so after the first time it works offline and costs nothing.
const VOICE = "en_US-hfc_female-medium" as const;

// deno-lint-ignore no-explicit-any
type Session = { predict: (t: string) => Promise<Blob> } & Record<string, any>;
let session: Promise<Session> | null = null;
let ready = false;

const supported = () =>
  typeof window !== "undefined" && typeof WebAssembly !== "undefined" && !!navigator.storage?.getDirectory;

/** True when the model is already in this browser, so speaking can start without a download. */
export async function neuralStored(): Promise<boolean> {
  if (!supported()) return false;
  try {
    const { stored } = await import("@mintplex-labs/piper-tts-web");
    return (await stored()).includes(VOICE);
  } catch { return false; }
}

/** Start (or reuse) loading the model. Safe to call many times. */
export function warmNeural(onProgress?: (pct: number) => void): Promise<Session> | null {
  if (!supported()) return null;
  if (!session) {
    session = import("@mintplex-labs/piper-tts-web").then(async (m) => {
      const s = (await m.TtsSession.create({
        voiceId: VOICE,
        // Must match the onnxruntime-web version in package-lock (the library's default points at an older one).
        wasmPaths: {
          onnxWasm: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/",
          piperData: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data",
          piperWasm: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm",
        },
        progress: (p: { loaded: number; total: number }) => p.total && onProgress?.(Math.round((p.loaded / p.total) * 100)),
      })) as unknown as Session;
      ready = true;
      return s;
    });
    session.catch(() => { session = null; });
  }
  return session;
}

export const neuralReady = () => ready;

/** Synthesize to a playable object URL. */
export async function neuralSpeech(text: string): Promise<string> {
  const s = await (warmNeural() ?? Promise.reject(new Error("unsupported")));
  const blob = await s.predict(text);
  return URL.createObjectURL(blob);
}
