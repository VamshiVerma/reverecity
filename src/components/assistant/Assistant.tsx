import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp, BookOpen, CloudSun, Copy, ExternalLink, Landmark, Mic, MicOff, Plus, ShieldCheck,
  Square, TrainFront, Volume2, VolumeX, X, Check, Radio,
} from "lucide-react";
import { askCity, type AskCard, type AskSource, type ChatTurn } from "@/lib/cityApi";
import { useVoice } from "./useVoice";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AskSource[];
  cards?: AskCard[];
  error?: boolean;
};

const STORE = "revere.assistant.v2";
const SUGGESTIONS = [
  { label: "Near me", q: "What's been happening around Revere Beach Boulevard lately?" },
  { label: "The T", q: "Is the Blue Line running normally right now?" },
  { label: "City money", q: "How much is Revere spending on the police department in FY2027?" },
  { label: "Weather", q: "Do I need an umbrella this week?" },
  { label: "Housing", q: "How much is rent in Revere compared to Chelsea?" },
  { label: "Schools", q: "How did the school budget change from FY2026 to FY2027?" },
];
const THINKING: Record<string, string> = {
  police: "Reading the latest police logs",
  budget: "Searching the FY2026 & FY2027 budgets",
  mbta: "Checking live MBTA data",
  weather: "Pulling the forecast",
};

const uid = () => Math.random().toString(36).slice(2);
const greeting = () => {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
function guessSteps(q: string) {
  const s = q.toLowerCase();
  const steps: string[] = [];
  if (/police|safe|crime|call|incident|happen|going on|street|block|beach|boulevard/.test(s)) steps.push(THINKING.police);
  if (/budget|spend|cost|money|fund|tax|fy|department|school|salar/.test(s)) steps.push(THINKING.budget);
  if (/mbta|train|blue line|bus|transit|commute/.test(s)) steps.push(THINKING.mbta);
  if (/weather|rain|snow|umbrella|forecast|cold|hot|storm/.test(s)) steps.push(THINKING.weather);
  return steps.length ? steps : [THINKING.budget];
}

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORE) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [readAloud, setReadAloud] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handsFreeRef = useRef(false);
  handsFreeRef.current = handsFree;

  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))); } catch { /* ignore */ }
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  }, [msgs, busy]);

  const send = useCallback(async (text: string, viaVoice = false) => {
    const q = text.trim();
    if (!q || busy) return;
    const history: ChatTurn[] = msgs.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { id: uid(), role: "user", content: q }]);
    setInput("");
    setBusy(true);
    setSteps(guessSteps(q));
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await askCity(q, history, ctrl.signal);
      setMsgs((m) => [...m, { id: uid(), role: "assistant", content: res.answer, sources: res.sources, cards: res.cards }]);
      if (readAloud || viaVoice) {
        voice.speak(res.answer, () => { if (handsFreeRef.current) setTimeout(() => voice.startListening(), 350); });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMsgs((m) => [...m, { id: uid(), role: "assistant", content: "I couldn't reach the city data service just now. Please try again in a moment.", error: true }]);
      }
    } finally {
      setBusy(false);
      setSteps([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, msgs, readAloud]);

  const voice = useVoice({ onFinal: (t) => send(t, true) });
  const sendRef = useRef(send);
  sendRef.current = send;
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // Other parts of the app can open the assistant (optionally with a question).
  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true);
      const d = (e as CustomEvent<{ q?: string; voice?: boolean }>).detail;
      if (d?.q) setTimeout(() => sendRef.current?.(d.q!), 350);
      else if (d?.voice) setTimeout(() => voiceRef.current?.startListening(), 400);
    };
    window.addEventListener("revere:ask", onAsk);
    return () => window.removeEventListener("revere:ask", onAsk);
  }, []);

  // Open with "/" or Cmd/Ctrl+K; close with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 250); else { voice.stopSpeaking(); voice.stopListening(); } }, [open]); // eslint-disable-line

  const reset = () => { abortRef.current?.abort(); voice.stopSpeaking(); setMsgs([]); setBusy(false); };
  const orbState = busy ? "busy" : voice.listening ? "listening" : voice.speaking ? "speaking" : "idle";

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setOpen(true)}
            className="group fixed bottom-5 right-5 z-50 flex h-14 items-center gap-3 rounded-full bg-primary pl-2 pr-2 text-primary-foreground shadow-[0_12px_32px_rgba(0,0,0,0.6)] md:pr-5"
            aria-label="Ask Revere"
          >
            <VoiceDot state="idle" className="h-10 w-10" />
            <span className="hidden flex-col items-start leading-tight md:flex">
              <span className="text-[15px] font-semibold">Ask Revere</span>
              <span className="text-[12px] opacity-60">Type or just talk</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.section
              role="dialog"
              aria-label="Ask Revere assistant"
              initial={{ x: 40, opacity: 0, scale: 0.98 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background md:inset-y-3 md:left-auto md:right-3 md:w-[540px] md:rounded-[24px] md:shadow-[0_30px_80px_rgba(0,0,0,0.9)]"
            >

              {/* Header */}
              <header className="relative flex h-16 items-center gap-3 border-b border-border px-5">
                <VoiceDot state={orbState} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-semibold leading-tight text-foreground">Ask Revere</h2>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {orbState === "listening" ? "Listening…" : orbState === "speaking" ? "Speaking…" : orbState === "busy" ? "Looking it up…" : "Every answer links to where it came from"}
                  </p>
                </div>
                <IconBtn label={readAloud ? "Stop reading answers aloud" : "Read answers aloud"} active={readAloud} onClick={() => { setReadAloud((v) => !v); voice.stopSpeaking(); }}>
                  {readAloud ? <Volume2 /> : <VolumeX />}
                </IconBtn>
                <IconBtn label="New conversation" onClick={reset}><Plus /></IconBtn>
                <IconBtn label="Close" onClick={() => setOpen(false)}><X /></IconBtn>
              </header>

              {/* Messages */}
              <div ref={listRef} className="relative flex-1 overflow-y-auto px-5 py-6" aria-live="polite">
                {msgs.length === 0 ? (
                  <EmptyState onPick={(q) => send(q)} />
                ) : (
                  <div className="space-y-7">
                    {msgs.map((m) => (
                      <Message key={m.id} m={m} onSpeak={(t) => voice.speak(t)} speaking={voice.speaking} onStop={voice.stopSpeaking} />
                    ))}
                    {busy && <Thinking steps={steps} />}
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="relative border-t border-border p-4">
                {voice.error && (
                  <div className="mb-2 flex items-center justify-between rounded-2xl bg-secondary px-4 py-2.5 text-[13px] text-warning">
                    {voice.error}
                    <button className="ml-2 opacity-70 hover:opacity-100" onClick={() => voice.setError(null)} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {voice.listening ? (
                    <motion.div key="listen" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="flex min-h-[60px] items-center gap-3 rounded-[28px] bg-card py-2 pl-4 pr-2">
                      <Wave level={voice.level} />
                      <p className="min-w-0 flex-1 truncate text-[16px] text-foreground">{voice.interim || <span className="text-muted-foreground">Listening. Ask your question…</span>}</p>
                      <button onClick={voice.stopListening} className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Stop listening">
                        <Square className="h-4 w-4 fill-current" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form key="type" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      onSubmit={(e) => { e.preventDefault(); send(input); }}
                      className="flex items-end gap-1.5 rounded-[28px] bg-card p-2 pl-3 transition focus-within:bg-secondary">
                      <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={(e) => { setInput(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = Math.min(140, e.currentTarget.scrollHeight) + "px"; }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                        placeholder="Ask anything about Revere"
                        className="max-h-[140px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-[11px] text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
                        aria-label="Your question"
                      />
                      <button type="button" onClick={voice.startListening} disabled={busy}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
                        aria-label="Ask by voice" title={voice.supported ? "Ask by voice" : "Voice input needs Chrome, Edge or Safari"}>
                        {voice.supported ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                      </button>
                      <button type="submit" disabled={!input.trim() || busy}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-95 disabled:bg-secondary disabled:text-muted-foreground"
                        aria-label="Send">
                        <ArrowUp className="h-5 w-5" />
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
                <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[13px] text-muted-foreground">
                  <label className="flex cursor-pointer select-none items-center gap-2.5 whitespace-nowrap">
                    <span className={cn("relative h-5 w-9 rounded-full transition", handsFree ? "bg-highlight" : "bg-secondary")}>
                      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-primary transition-all", handsFree ? "left-[18px]" : "left-0.5")} />
                    </span>
                    <input type="checkbox" className="sr-only" checked={handsFree} onChange={(e) => { setHandsFree(e.target.checked); if (e.target.checked) { setReadAloud(true); voice.startListening(); } }} />
                    Talk back and forth
                  </label>
                  <span className="truncate">Press / anywhere to ask</span>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function IconBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={cn("grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground [&_svg]:h-[18px] [&_svg]:w-[18px]", active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}>
      {children}
    </button>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-7 mt-2">
        <h3 className="text-[30px] font-semibold leading-[1.1] tracking-tight text-foreground">{greeting()}. What would you like to know?</h3>
        <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
          Ask in your own words, or tap the microphone and talk. Answers come from the police log, the city budget, the MBTA, the forecast and housing data.
        </p>
      </motion.div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.q}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPick(s.q)}
            className="rounded-[18px] bg-card p-4 text-left transition-colors hover:bg-secondary"
          >
            <span className="block text-[13px] text-muted-foreground">{s.label}</span>
            <span className="mt-1 block text-[15px] leading-snug text-foreground">{s.q}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Voice state as a solid disc with live bars: idle, thinking, listening or speaking. */
function VoiceDot({ state, className }: { state: string; className?: string }) {
  const moving = state !== "idle";
  return (
    <span className={cn("relative grid shrink-0 place-items-center rounded-full bg-highlight", className)} aria-hidden>
      <span className="flex h-[42%] items-center gap-[2px]">
        {[0.55, 1, 0.75, 0.4].map((h, i) => (
          <motion.span key={i} className="w-[2.5px] rounded-full bg-black"
            animate={moving ? { scaleY: [h, 1, 0.35, h] } : { scaleY: h }}
            transition={moving ? { duration: state === "busy" ? 0.9 : 0.6, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" } : { duration: 0.3 }}
            style={{ height: "100%", originY: 0.5 }} />
        ))}
      </span>
    </span>
  );
}

function Message({ m, onSpeak, speaking, onStop }: { m: Msg; onSpeak: (t: string) => void; speaking: boolean; onStop: () => void }) {
  const [copied, setCopied] = useState(false);
  if (m.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-secondary px-4 py-3 text-[16px] leading-snug text-foreground">
          {m.content}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
      <div className="min-w-0">
        <div className={cn("prose-revere text-[16px] leading-[1.6]", m.error ? "text-warning" : "text-foreground")}>
          <ReactMarkdown>{m.content}</ReactMarkdown>
        </div>
        {m.cards?.map((c, i) => <DataCard key={i} card={c} />)}
        {!!m.sources?.length && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.sources.map((s, i) => <SourceChip key={i} s={s} />)}
          </div>
        )}
        {!m.error && (
          <div className="mt-3 flex gap-1 text-muted-foreground">
            <button onClick={() => (speaking ? onStop() : onSpeak(m.content))} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition hover:bg-secondary hover:text-foreground">
              {speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3.5 w-3.5" />} {speaking ? "Stop" : "Listen"}
            </button>
            <button onClick={() => { navigator.clipboard?.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition hover:bg-secondary hover:text-foreground">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const SRC_ICON: Record<string, typeof BookOpen> = { budget: BookOpen, police: ShieldCheck, mbta: TrainFront, weather: CloudSun };
function SourceChip({ s }: { s: AskSource }) {
  const Icon = SRC_ICON[s.kind] ?? BookOpen;
  const body = (
    <>
      <Icon className="h-3.5 w-3.5 text-highlight" />
      <span className="font-medium text-foreground/90">{s.label}</span>
      {s.detail && <span className="text-muted-foreground">· {s.detail}</span>}
      {s.url && <ExternalLink className="h-3 w-3 opacity-50" />}
    </>
  );
  const cls = "inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-card px-2.5 py-1 text-[11.5px] ring-1 ring-border transition hover:ring-highlight/40";
  return s.url ? <a href={s.url} target={s.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className={cls}>{body}</a> : <span className={cls}>{body}</span>;
}

function DataCard({ card }: { card: AskCard }) {
  const shell = "mt-3 overflow-hidden rounded-2xl border border-border bg-card";
  if (card.type === "weather") {
    return (
      <div className={shell}>
        <div className="flex items-center gap-4 p-3">
          <div className="font-display text-3xl font-semibold tabular-nums text-foreground">{Math.round(card.current.temp)}°</div>
          <div className="text-sm">
            <div className="text-foreground">{card.current.conditions}</div>
            <div className="text-xs text-muted-foreground">Feels {Math.round(card.current.feels)}° · wind {Math.round(card.current.wind)} mph</div>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-border">
          {card.days.map((d) => (
            <div key={d.date} className="p-2 text-center">
              <div className="text-[11px] text-muted-foreground">{new Date(d.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className="text-sm font-medium tabular-nums text-foreground">{Math.round(d.hi)}°<span className="text-muted-foreground">/{Math.round(d.lo)}°</span></div>
              <div className="text-[11px] text-foreground tabular-nums">{d.precipprob}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (card.type === "mbta") {
    const groups: { key: string; station: string; toward: string; mins: number[] }[] = [];
    for (const p of card.preds) {
      const toward = /wonderland/i.test(p.toward) ? "Wonderland" : "Boston";
      const key = `${p.station}|${toward}`;
      const g = groups.find((x) => x.key === key) ?? (groups.push({ key, station: p.station, toward, mins: [] }), groups[groups.length - 1]);
      if (g.mins.length < 3) g.mins.push(p.mins);
    }
    return (
      <div className={shell}>
        {groups.map((g) => (
          <div key={g.key} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <span className={cn("h-9 w-1.5 shrink-0 rounded-full", g.toward === "Boston" ? "bg-highlight-secondary" : "bg-highlight")} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-muted-foreground">{g.station}</div>
              <div className="text-[15px] font-medium text-foreground">To {g.toward}</div>
            </div>
            <div className="text-right">
              <span className={cn("figure text-[30px] leading-none", g.toward === "Boston" ? "text-highlight-secondary" : "text-foreground")}>{g.mins[0] <= 0 ? "Now" : g.mins[0]}</span>
              {g.mins[0] > 0 && <span className="ml-1 text-[13px] text-muted-foreground">min</span>}
              {g.mins.length > 1 && <div className="text-[12px] text-muted-foreground">then {g.mins.slice(1).join(", ")} min</div>}
            </div>
          </div>
        ))}
        {!groups.length && <div className="px-4 py-3 text-[14px] text-muted-foreground">No trains predicted right now.</div>}
        {card.alerts.slice(0, 1).map((a, i) => (
          <div key={i} className="border-t border-border bg-secondary/50 px-4 py-2.5 text-[13px] text-foreground">
            <span className="font-semibold text-warning">{a.effect.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}: </span>{a.header}
          </div>
        ))}
      </div>
    );
  }
  if (card.type === "budget") {
    const rows = card.rows.filter((r) => r.fy === 2027).length ? card.rows.filter((r) => r.fy === 2027) : card.rows;
    return (
      <div className={cn(shell, "divide-y divide-border")}>
        {rows.slice(0, 3).map((r) => {
          const pct = r.prior ? ((Number(r.amount) - r.prior) / r.prior) * 100 : null;
          const payPct = r.amount && r.payroll ? (r.payroll / r.amount) * 100 : null;
          return (
            <div key={r.name + r.fy} className="p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-xs text-muted-foreground">{r.name} · FY{r.fy}</span>
                {pct != null && Math.abs(pct) >= 0.05 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums", pct >= 0 ? "bg-emerald-500/15 text-foreground" : "bg-rose-500/15 text-foreground")}>
                    {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">${Number(r.amount ?? 0).toLocaleString("en-US")}</div>
              {payPct != null && (
                <div className="mt-2">
                  <div className="flex h-2 overflow-hidden rounded-full bg-card">
                    <motion.div className="h-full bg-highlight" initial={{ width: 0 }} animate={{ width: `${payPct}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                    <motion.div className="h-full bg-highlight-secondary" initial={{ width: 0 }} animate={{ width: `${100 - payPct}%` }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-highlight" />Payroll ${Number(r.payroll).toLocaleString("en-US")}</span>
                    <span>Other ${Number(r.nonPayroll ?? 0).toLocaleString("en-US")}<span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-highlight-secondary" /></span>
                  </div>
                </div>
              )}
              <div className="mt-1.5 text-[11px] text-muted-foreground">{r.doc}, p. {r.page}</div>
            </div>
          );
        })}
      </div>
    );
  }
  if (card.type === "housing") {
    const top = Math.max(1, ...card.rows.map((r) => r.value ?? 0));
    return (
      <div className={cn(shell, "p-3")}>
        <div className="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Typical home value</span>
          {card.month && <span>Zillow · {new Date(card.month + "T12:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>}
        </div>
        <div className="space-y-1.5">
          {card.rows.filter((r) => r.value).map((r, i) => (
            <div key={r.place} className="grid grid-cols-[84px_1fr_auto] items-center gap-2 text-xs">
              <span className={cn("truncate", r.place === "Revere" ? "font-semibold text-foreground" : "text-muted-foreground")}>{r.place}</span>
              <div className="h-2 overflow-hidden rounded-full bg-card">
                <motion.div className={cn("h-full rounded-full", r.place === "Revere" ? "bg-highlight" : "bg-secondary")} initial={{ width: 0 }}
                  animate={{ width: `${((r.value ?? 0) / top) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <span className="tabular-nums text-foreground">${Math.round((r.value ?? 0) / 1000)}K{r.rent ? <span className="text-muted-foreground"> · ${r.rent.toLocaleString("en-US")}/mo</span> : null}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const max = Math.max(1, ...card.byCat.map(([, v]) => v));
  return (
    <div className={cn(shell, "p-3")}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Calls {new Date(card.since + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{new Date(card.latestDate + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span className="font-display text-lg font-semibold tabular-nums">{card.total}</span>
      </div>
      <div className="space-y-1.5">
        {card.byCat.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate text-muted-foreground">{k.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-card">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300" initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }} transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <span className="w-8 text-right tabular-nums text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Thinking({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI((x) => x + 1), 1400); return () => clearInterval(id); }, []);
  const label = steps[i % steps.length];
  return (
    <div className="flex gap-3">
      <span className="orb orb-busy mt-0.5 h-7 w-7 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <AnimatePresence mode="wait">
          <motion.p key={label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-sm text-muted-foreground">
            {label}…
          </motion.p>
        </AnimatePresence>
        <div className="skeleton h-3 w-11/12" />
        <div className="skeleton h-3 w-8/12" />
      </div>
    </div>
  );
}

function Wave({ level }: { level: number[] }) {
  const bars = useMemo(() => level, [level]);
  return (
    <div className="flex h-10 items-center gap-[3px]" aria-hidden>
      {bars.map((v, i) => (
        <span key={i} className="w-[3px] rounded-full bg-highlight transition-[height] duration-75" style={{ height: `${Math.max(12, Math.min(100, v * 140))}%`, opacity: 0.5 + v * 0.5 }} />
      ))}
    </div>
  );
}
