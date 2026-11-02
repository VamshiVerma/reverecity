import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bus, CloudSun, Megaphone, ShieldCheck, TrainFront, X } from "lucide-react";
import { usePulse } from "@/lib/usePulse";
import { openPulse } from "@/components/LiveTicker";
import type { PulseItem } from "@/lib/cityApi";
import { cn } from "@/lib/utils";

// Every time the site is opened, the most important thing happening in Revere takes the screen for a moment:
// a breaking item if there is one, otherwise a current alert, otherwise the latest news from the live feed.
const SHOWN = "revere.takeover.session"; // read by LiveToasts so the same item isn't toasted again
const OPEN_DELAY = 3000;
// How long the story stays readable once it has appeared, before it sweeps away.
const HOLD = { breaking: 3500, alert: 3000, info: 3000 } as const;
const EASE = [0.76, 0, 0.24, 1] as const;
const SOFT = [0.22, 1, 0.36, 1] as const;
const IN = 1.7;   // seconds for the bands to sweep in
const OUT = 1.25; // seconds for them to sweep out
const CONTENT_AT = IN * 0.78; // the headline starts while the last band settles

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
    const t = setTimeout(close, CONTENT_AT * 1000 + 900 + (HOLD[active.level] ?? HOLD.info));
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

  const contentAt = CONTENT_AT;
  const narrow = typeof window !== "undefined" && window.innerWidth < 768;

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

      {/* 2. The field: slow aurora light, a fine grain and Paul Revere riding in behind the story */}
      <motion.div className="pointer-events-none absolute inset-0 z-[6]" aria-hidden
        variants={{ in: { opacity: 0 }, hold: { opacity: 1, transition: { delay: IN * 0.6, duration: 1.2 } }, out: { opacity: 0, transition: { duration: 0.6 } } }}>
        <motion.div className="absolute -left-[15%] -top-[20%] h-[85vmin] w-[85vmin] rounded-full bg-[#0297DE]/25 blur-[110px]"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-[25%] -right-[10%] h-[80vmin] w-[80vmin] rounded-full bg-[#FC734D]/20 blur-[120px]"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(2,7,10,0.35)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.6px,transparent_0.6px)] [background-size:4px_4px]" />
        {/* Paul Revere gallops across behind the story, in faint cantaloupe light, with a soft trail */}
        <motion.div className="absolute bottom-[3%] left-0 flex h-[38vh] items-center md:bottom-[2%] md:h-[60vh]"
          initial={{ x: narrow ? "-125vw" : "-75vw" }}
          animate={{ x: narrow ? "70vw" : "105vw", transition: { delay: IN * 0.35, duration: narrow ? 5.6 : 7.5, ease: narrow ? "linear" : [0.3, 0.1, 0.4, 1] } }}>
          <div className="h-[18%] w-[45vw] rounded-full bg-gradient-to-r from-transparent via-[#FC734D]/10 to-[#FC734D]/25 blur-2xl" />
          <motion.div className="-ml-[6vw] aspect-square h-full opacity-60 md:opacity-100"
            animate={{ y: [0, -14, 0], rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(100deg, rgba(252,115,77,0.18) 0%, rgba(252,115,77,0.42) 100%)",
              WebkitMaskImage: "url(/logo-rider.png)", maskImage: "url(/logo-rider.png)",
              WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
              WebkitMaskPosition: "center", maskPosition: "center",
            }} />
        </motion.div>
      </motion.div>

      {/* 3. The story */}
      <motion.div className="relative z-[7] flex h-full items-center px-6 md:px-20"
        variants={{ in: { opacity: 1 }, hold: { opacity: 1 }, out: { opacity: 0, y: -24, filter: "blur(6px)", transition: { duration: 0.55, ease: SOFT } } }}>
        <Content item={item} time={time} word={word} Icon={Icon} onClose={onClose} onOpen={onOpen} start={contentAt} />
      </motion.div>

      {/* 4. Time left, as a hairline */}
      <motion.div className="absolute bottom-0 left-0 z-[8] h-[3px] w-full origin-left bg-[#FC734D]"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.9 + hold / 1000, delay: contentAt, ease: "linear" }} />
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
        <span className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-2 text-white/50 md:flex">
            <span aria-hidden className="inline-block h-5 w-5 bg-white/60 [mask:url(/logo-rider.png)_center/contain_no-repeat] [-webkit-mask:url(/logo-rider.png)_center/contain_no-repeat]" />
            Revere.City
          </span>
          {/* Icon-only close: tapping anywhere also closes it */}
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close"
            className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08] text-white/80 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15 hover:text-white">
            <X className="h-5 w-5" />
          </button>
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

      {/* The headline is the link: tap it (or the arrow) for the full story */}
      <motion.div {...rise(0.75)} className="mt-6 max-w-[920px]">
        {item.href ? (
          <button onClick={(e) => { e.stopPropagation(); onOpen(); }} autoFocus aria-label={`${item.text}. Open the full story`}
            className="group text-left text-balance text-[clamp(24px,3.1vw,44px)] font-medium leading-[1.18] tracking-[-0.015em] outline-none">
            {item.text}
            <span aria-hidden className="ml-3 inline-grid h-[1.1em] w-[1.1em] translate-y-[0.12em] place-items-center rounded-full bg-[#FC734D] align-baseline text-[#02070A] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-white">
              <ArrowUpRight className="h-[0.62em] w-[0.62em]" strokeWidth={2.6} />
            </span>
          </button>
        ) : (
          <p className="text-balance text-[clamp(24px,3.1vw,44px)] font-medium leading-[1.18] tracking-[-0.015em]">{item.text}</p>
        )}
      </motion.div>
    </div>
  );
}
