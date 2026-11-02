import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePulse } from "@/lib/usePulse";
import { openPulse } from "@/components/LiveTicker";
import type { PulseItem } from "@/lib/cityApi";

const SEEN = "revere.takeover.seen";
const HOLD_MS = 11000;
const EASE = [0.76, 0, 0.24, 1] as const;

const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN) || "[]"); } catch { return []; } };
const markSeen = (id: string) => {
  if (id.startsWith("demo")) return; // demos replay on every visit with ?breaking=demo
  try { localStorage.setItem(SEEN, JSON.stringify([...readSeen(), id].slice(-100))); } catch { /* ignore */ }
};

// Bands that wipe the screen: red, ink, red, ink, red. Drawn flat; the motion is the effect.
const BANDS = ["#c8261c", "#0b0b0b", "#e0362b", "#151515", "#b41f16"];

/** Full-screen "breaking news" moment for genuinely urgent items (Blue Line suspensions, NWS severe warnings). */
export default function BreakingTakeover() {
  const items = usePulse();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const shownThisLoad = useRef(new Set<string>());
  const [active, setActive] = useState<PulseItem | null>(null);

  useEffect(() => {
    if (active) return;
    const seen = readSeen();
    const next = items.find((i) => i.level === "breaking" && !seen.includes(i.id) && !shownThisLoad.current.has(i.id));
    if (next) { shownThisLoad.current.add(next.id); setActive(next); }
  }, [items, active]);

  const close = () => { if (active) markSeen(active.id); setActive(null); };

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(close, HOLD_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {active && (
        <Takeover key={active.id} item={active} reduce={!!reduce}
          onClose={close}
          onOpen={() => { close(); openPulse(active, navigate); }} />
      )}
    </AnimatePresence>
  );
}

function Takeover({ item, reduce, onClose, onOpen }: { item: PulseItem; reduce: boolean; onClose: () => void; onOpen: () => void }) {
  const time = useMemo(() => new Date(item.at || Date.now()).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }), [item.at]);
  const word = "Breaking";

  if (reduce) {
    return (
      <motion.div role="alertdialog" aria-modal="true" aria-label={`Breaking: ${item.text}`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center bg-[#b41f16] p-6 text-white md:p-16">
        <Content item={item} time={time} word={word} onClose={onClose} onOpen={onOpen} reduce />
      </motion.div>
    );
  }

  return (
    <motion.div role="alertdialog" aria-modal="true" aria-label={`Breaking: ${item.text}`} className="fixed inset-0 z-[100] overflow-hidden text-white" initial="in" animate="hold" exit="out">
      {/* 1. Bands sweep across and leave the red field behind them */}
      {BANDS.map((c, i) => (
        <motion.div key={i} className="absolute inset-y-[-20%] left-[-30%] w-[160%] origin-left"
          style={{ background: c, skewX: -14, zIndex: i }}
          variants={{
            in: { x: "-110%" },
            hold: { x: i === BANDS.length - 1 ? "0%" : "110%", transition: { duration: 0.95, delay: i * 0.08, ease: EASE } },
            out: { x: i === BANDS.length - 1 ? "110%" : "-110%", transition: { duration: 0.7, delay: (BANDS.length - 1 - i) * 0.05, ease: EASE } },
          }} />
      ))}

      {/* 2. Abstract field: radar rings from the headline and a giant word drifting behind it */}
      <motion.div className="absolute inset-0 z-[6]" variants={{ in: { opacity: 0 }, hold: { opacity: 1, transition: { delay: 0.7, duration: 0.5 } }, out: { opacity: 0, transition: { duration: 0.25 } } }}>
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {[0, 1, 2, 3].map((r) => (
            <motion.span key={r} className="absolute left-[18%] top-[46%] block h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-white/25"
              animate={{ scale: [0.2, 3.4], opacity: [0.7, 0] }} transition={{ duration: 3.6, repeat: Infinity, delay: r * 0.9, ease: "easeOut" }} />
          ))}
          <div className="absolute bottom-[6%] left-0 flex whitespace-nowrap font-serif-display text-[28vh] leading-none text-white/[0.07]">
            <motion.div className="flex" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}>
              {Array.from({ length: 6 }).map((_, i) => <span key={i} className="pr-[6vw]">Breaking news</span>)}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 3. The headline */}
      <motion.div className="relative z-[7] flex h-full items-center px-6 md:px-16"
        variants={{ in: { opacity: 1 }, hold: { opacity: 1 }, out: { opacity: 0, scale: 0.96, y: -30, transition: { duration: 0.35, ease: EASE } } }}>
        <Content item={item} time={time} word={word} onClose={onClose} onOpen={onOpen} />
      </motion.div>

      {/* 4. Countdown */}
      <motion.div className="absolute bottom-0 left-0 z-[8] h-1.5 bg-white" initial={{ width: "0%" }} animate={{ width: "100%" }}
        transition={{ duration: HOLD_MS / 1000 - 0.9, delay: 0.9, ease: "linear" }} />
    </motion.div>
  );
}

function Content({ item, time, word, onClose, onOpen, reduce }: { item: PulseItem; time: string; word: string; onClose: () => void; onOpen: () => void; reduce?: boolean }) {
  const d = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.6, ease: EASE } });
  return (
    <div className="w-full max-w-[1100px]">
      <div className="flex items-center gap-3 text-[15px] font-semibold md:text-[17px]">
        <motion.span {...d(0.75)} className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[#b41f16]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#b41f16]" /> Live
        </motion.span>
        <motion.span {...d(0.85)}>{item.tag} · {time}</motion.span>
      </div>

      <h2 aria-label={word} className="mt-4 flex overflow-hidden font-serif-display text-[clamp(72px,15vw,220px)] leading-[0.9]">
        {word.split("").map((ch, i) => (
          <motion.span key={i} className="inline-block"
            initial={reduce ? false : { y: "105%" }} animate={{ y: "0%" }}
            transition={{ delay: 0.8 + i * 0.045, duration: 0.7, ease: EASE }}>{ch}</motion.span>
        ))}
      </h2>

      <motion.p {...d(1.25)} className="mt-6 max-w-[900px] text-[clamp(24px,3.2vw,44px)] font-medium leading-[1.15] tracking-tight">
        {item.text}
      </motion.p>

      <motion.div {...d(1.45)} className="mt-10 flex flex-wrap gap-3">
        {item.href && (
          <button onClick={onOpen} autoFocus className="h-12 rounded-full bg-white px-6 text-[16px] font-semibold text-[#111] transition-transform active:scale-[0.97]">
            See what this means
          </button>
        )}
        <button onClick={onClose} className="h-12 rounded-full px-6 text-[16px] font-medium text-white ring-2 ring-inset ring-white/60 transition-colors hover:bg-white/10">
          Dismiss
        </button>
      </motion.div>
    </div>
  );
}
