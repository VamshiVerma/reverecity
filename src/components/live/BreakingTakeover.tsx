import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bus, CloudSun, Megaphone, ShieldCheck, TrainFront } from "lucide-react";
import { usePulse } from "@/lib/usePulse";
import { openPulse } from "@/components/LiveTicker";
import type { PulseItem } from "@/lib/cityApi";
import { cn } from "@/lib/utils";

// Every time the site is opened, the most important thing happening in Revere takes the screen for a moment:
// a breaking item if there is one, otherwise a current alert, otherwise the latest news from the live feed.
const SHOWN = "revere.takeover.session"; // read by LiveToasts so the same item isn't toasted again
const OPEN_DELAY = 3000;
const HOLD = { breaking: 11000, alert: 9500, info: 8000 } as const;
const EASE = [0.76, 0, 0.24, 1] as const;
const SOFT = [0.22, 1, 0.36, 1] as const;
const IN = 1.7;   // seconds for the bands to sweep in
const OUT = 1.25; // seconds for them to sweep out

const remember = (id: string) => {
  try {
    const seen = JSON.parse(sessionStorage.getItem(SHOWN) || "[]");
    sessionStorage.setItem(SHOWN, JSON.stringify([...seen, id].slice(-50)));
  } catch { /* ignore */ }
};

// Bands that wipe the screen, in the site palette; the last one stays as the field.
const BANDS = ["#FC734D", "#02070A", "#0297DE", "#061520", "#02070A"];

const ICON = { mbta: TrainFront, weather: CloudSun, police: ShieldCheck, city: Megaphone } as const;

function pick(items: PulseItem[]) {
  const recent = (i: PulseItem) => !i.at || Date.now() - new Date(i.at).getTime() < 36 * 3600e3;
  return items.find((i) => i.level === "breaking")
    ?? items.find((i) => i.level === "alert" && recent(i))
    // Nothing urgent: lead with the newest police item, then anything else in the feed.
    ?? items.find((i) => i.kind === "police" && i.id !== "pd-fresh")
    ?? items.find((i) => i.id === "pd-fresh")
    ?? items[0]
    ?? null;
}

export default function BreakingTakeover() {
  const items = usePulse();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const done = useRef(false);
  const openedAt = useRef(Date.now());
  const [active, setActive] = useState<PulseItem | null>(null);

  // Once per page load, about three seconds after it opens (or as soon as the feed arrives after that).
  useEffect(() => {
    if (done.current || !items.length) return;
    const wait = Math.max(0, OPEN_DELAY - (Date.now() - openedAt.current));
    const t = setTimeout(() => {
      if (done.current) return;
      const next = pick(items);
      if (!next) return;
      done.current = true;
      remember(next.id);
      setActive(next);
    }, wait);
    return () => clearTimeout(t);
  }, [items]);

  const close = () => setActive(null);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(close, HOLD[active.level] ?? HOLD.info);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [active]);

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
  const time = useMemo(() => {
    const d = new Date(item.at || Date.now());
    const today = d.toDateString() === new Date().toDateString();
    // Police items carry a date only; show the day instead of a misleading midnight time.
    return /^\d{4}-\d{2}-\d{2}$/.test(item.at || "") || !today
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
      : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  }, [item.at]);
  const word = item.level === "breaking" ? "Breaking" : item.level === "alert" ? (item.kind === "weather" ? "Weather alert" : item.kind === "mbta" ? "Heads up" : "Alert") : "Latest";
  const hold = HOLD[item.level] ?? HOLD.info;
  const Icon = item.kind === "mbta" && /\b(route \d+|bus|shuttle)/i.test(item.text) && !/blue line/i.test(item.text) ? Bus : ICON[item.kind] ?? Megaphone;

  if (reduce) {
    return (
      <motion.div role="alertdialog" aria-modal="true" aria-label={`${word}: ${item.text}`} onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.6 } }} exit={{ opacity: 0, transition: { duration: 0.6 } }}
        className="fixed inset-0 z-[100] flex items-center bg-[#02070A] p-6 text-white md:p-16">
        <Content item={item} time={time} word={word} Icon={Icon} onClose={onClose} onOpen={onOpen} reduce />
      </motion.div>
    );
  }

  const contentAt = IN * 0.78; // the headline starts while the last band settles

  return (
    <motion.div role="alertdialog" aria-modal="true" aria-label={`${word}: ${item.text}`} onClick={onClose}
      className="fixed inset-0 z-[100] cursor-pointer overflow-hidden text-white" initial="in" animate="hold" exit="out">
      {/* 1. Bands sweep across slowly and leave the midnight field behind */}
      {BANDS.map((c, i) => (
        <motion.div key={i} className="absolute inset-y-[-20%] left-[-30%] w-[160%] origin-left"
          style={{ background: c, skewX: -12, zIndex: i }}
          variants={{
            in: { x: "-115%" },
            hold: { x: i === BANDS.length - 1 ? "0%" : "115%", transition: { duration: IN - i * 0.12, delay: i * 0.14, ease: EASE } },
            out: { x: i === BANDS.length - 1 ? "115%" : "-115%", transition: { duration: OUT, delay: 0.35 + (BANDS.length - 1 - i) * 0.09, ease: EASE } },
          }} />
      ))}

      {/* 2. The field: slow aurora light, a fine grain and an outlined word drifting far behind */}
      <motion.div className="pointer-events-none absolute inset-0 z-[6]" aria-hidden
        variants={{ in: { opacity: 0 }, hold: { opacity: 1, transition: { delay: IN * 0.6, duration: 1.2 } }, out: { opacity: 0, transition: { duration: 0.6 } } }}>
        <motion.div className="absolute -left-[15%] -top-[20%] h-[85vmin] w-[85vmin] rounded-full bg-[#0297DE]/25 blur-[110px]"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-[25%] -right-[10%] h-[80vmin] w-[80vmin] rounded-full bg-[#FC734D]/20 blur-[120px]"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(2,7,10,0.35)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.6px,transparent_0.6px)] [background-size:4px_4px]" />
        <div className="absolute bottom-[4%] left-0 flex whitespace-nowrap font-serif-display text-[26vh] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.09)]">
          <motion.div className="flex" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className="pr-[6vw]">{item.level === "breaking" ? "Breaking news" : "Revere right now"}</span>)}
          </motion.div>
        </div>
      </motion.div>

      {/* 3. The story */}
      <motion.div className="relative z-[7] flex h-full items-center px-6 md:px-20"
        variants={{ in: { opacity: 1 }, hold: { opacity: 1 }, out: { opacity: 0, y: -24, filter: "blur(6px)", transition: { duration: 0.55, ease: SOFT } } }}>
        <Content item={item} time={time} word={word} Icon={Icon} onClose={onClose} onOpen={onOpen} start={contentAt} />
      </motion.div>

      {/* 4. Time left, as a hairline */}
      <motion.div className="absolute bottom-0 left-0 z-[8] h-[3px] w-full origin-left bg-[#FC734D]"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: hold / 1000 - contentAt, delay: contentAt, ease: "linear" }} />
    </motion.div>
  );
}

function Content({ item, time, word, Icon, onClose, onOpen, reduce, start = 0 }: {
  item: PulseItem; time: string; word: string; Icon: typeof Megaphone; onClose: () => void; onOpen: () => void; reduce?: boolean; start?: number;
}) {
  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 28, filter: "blur(6px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, transition: { delay: start + delay, duration: 0.9, ease: SOFT } });
  return (
    <div className="w-full max-w-[1120px]">
      {/* Meta row */}
      <motion.div {...rise(0)} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] md:text-[15px]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] py-1.5 pl-1.5 pr-3.5 ring-1 ring-white/15 backdrop-blur-md">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FC734D] text-[#02070A]"><Icon className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
          <span className="font-medium">{item.tag}</span>
        </span>
        <span className="text-white/60">{time}</span>
        <span className="ml-auto hidden items-center gap-2 text-white/50 md:flex">
          <span aria-hidden className="inline-block h-5 w-5 bg-white/60 [mask:url(/logo-rider.png)_center/contain_no-repeat] [-webkit-mask:url(/logo-rider.png)_center/contain_no-repeat]" />
          Revere.City
        </span>
      </motion.div>

      {/* The word, revealed letter by letter from behind a mask */}
      <h2 aria-label={word} className={cn("mt-6 flex flex-wrap overflow-hidden pb-[0.08em] font-serif-display leading-[0.92] tracking-[-0.01em] text-[#FC734D]",
        word.length > 9 ? "text-[clamp(56px,10.5vw,176px)]" : "text-[clamp(72px,14vw,216px)]")}>
        {word.split("").map((ch, i) => (
          <motion.span key={i} className={cn("inline-block", ch === " " && "w-[0.25em]")}
            initial={reduce ? false : { y: "110%" }} animate={{ y: "0%" }}
            transition={{ delay: start + 0.15 + i * 0.055, duration: 1.0, ease: EASE }}>{ch}</motion.span>
        ))}
      </h2>

      {/* A hairline draws in under the word */}
      <motion.div className="mt-6 h-px w-full max-w-[900px] origin-left bg-gradient-to-r from-white/50 via-white/20 to-transparent"
        initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: start + 0.6, duration: 1.2, ease: SOFT }} />

      <motion.p {...rise(0.75)} className="mt-6 max-w-[900px] text-balance text-[clamp(24px,3.1vw,44px)] font-medium leading-[1.18] tracking-[-0.015em]">
        {item.text}
      </motion.p>

      <motion.div {...rise(1.0)} className="mt-10 flex flex-wrap items-center gap-3">
        {item.href && (
          <button onClick={(e) => { e.stopPropagation(); onOpen(); }} autoFocus
            className="h-12 rounded-full bg-white px-6 text-[16px] font-semibold text-[#02070A] shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5 active:scale-[0.97]">
            {item.level === "info" ? "Read more" : "See what this means"}
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="h-12 rounded-full px-6 text-[16px] font-medium text-white/90 ring-1 ring-inset ring-white/35 backdrop-blur-sm transition-colors hover:bg-white/10">
          Close
        </button>
        <span className="ml-1 text-[13px] text-white/45">or tap anywhere</span>
      </motion.div>
    </div>
  );
}
