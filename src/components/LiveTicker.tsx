import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CloudSun, Radio, ShieldAlert, TrainFront, X } from "lucide-react";
import { getCityPulse, type PulseItem } from "@/lib/cityApi";
import { cn } from "@/lib/utils";

const KIND = {
  mbta: { icon: TrainFront, chip: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  weather: { icon: CloudSun, chip: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  police: { icon: ShieldAlert, chip: "bg-rose-500/15 text-rose-300 ring-rose-400/30" },
  city: { icon: Radio, chip: "bg-white/10 text-slate-200 ring-white/20" },
} as const;

const DISMISS_KEY = "revere.breaking.dismissed";

function useEasternClock() {
  const fmt = () =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 15_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function LiveTicker() {
  const [items, setItems] = useState<PulseItem[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
  });
  const reduce = useReducedMotion();
  const clock = useEasternClock();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const load = () => getCityPulse().then((x) => alive && setItems(x)).catch(() => {});
    load();
    const id = setInterval(load, 120_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const breaking = items.find((i) => i.level === "breaking" && !dismissed.includes(i.id));
  const crawl = useMemo(() => items.filter((i) => i.id !== breaking?.id), [items, breaking]);

  const open = (i: PulseItem) => {
    if (!i.href) return;
    if (i.href.startsWith("/")) navigate(i.href);
    else window.open(i.href, "_blank", "noopener,noreferrer");
  };
  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  if (!items.length) return null;

  return (
    <div className="relative z-10 min-w-0 overflow-hidden" role="region" aria-label="Live city updates">
      <AnimatePresence>
        {breaking && (
          <motion.div
            key={breaking.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="relative flex items-stretch bg-gradient-to-r from-[#b4121b] via-[#d61f2a] to-[#b4121b] text-white shadow-[0_8px_30px_-8px_rgba(214,31,42,0.6)]">
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 24 }}
                className="flex shrink-0 items-center gap-2 bg-black/25 px-4 font-display text-sm font-extrabold uppercase tracking-[0.18em] [clip-path:polygon(0_0,100%_0,calc(100%-14px)_100%,0_100%)] md:pr-8 md:text-base"
              >
                <AlertTriangle className="h-4 w-4 animate-pulse" /> Breaking
              </motion.div>
              <button
                onClick={() => open(breaking)}
                className="min-w-0 flex-1 px-4 py-2.5 text-left text-sm font-semibold leading-snug md:text-[15px]"
              >
                <span className="mr-2 rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">{breaking.tag}</span>
                {breaking.text}
              </button>
              <button
                onClick={() => dismiss(breaking.id)}
                aria-label="Dismiss breaking alert"
                className="grid w-10 shrink-0 place-items-center text-white/80 transition hover:bg-black/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-10 items-stretch border-b border-white/10 bg-[hsl(222_40%_5%/0.92)] backdrop-blur-xl">
        {/* LIVE bug */}
        <div className="flex shrink-0 items-center gap-1.5 bg-[#d61f2a] px-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          Live
        </div>
        <div className="hidden shrink-0 items-center bg-gradient-to-r from-highlight to-[hsl(199_91%_42%)] pl-3 pr-6 font-display text-[12px] font-bold uppercase tracking-[0.16em] text-primary-foreground [clip-path:polygon(0_0,100%_0,calc(100%-12px)_100%,0_100%)] sm:flex">
          Revere Now
        </div>

        <Crawl items={crawl} reduce={!!reduce} onOpen={open} />

        <div className="hidden shrink-0 items-center gap-2 border-l border-white/10 px-4 font-mono text-[12px] font-semibold tabular-nums text-slate-300 md:flex">
          {clock} <span className="text-[10px] font-sans font-medium tracking-wider text-muted-foreground">ET</span>
        </div>
      </div>
    </div>
  );
}

function Crawl({ items, reduce, onOpen }: { items: PulseItem[]; reduce: boolean; onOpen: (i: PulseItem) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(60);
  const [idx, setIdx] = useState(0);

  useLayoutEffect(() => {
    const w = (trackRef.current?.scrollWidth ?? 2000) / 2;
    setDuration(Math.max(30, w / 70)); // ~70px per second, like a broadcast crawl
  }, [items]);

  useEffect(() => {
    if (!reduce || items.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [reduce, items.length]);

  if (!items.length) return <div className="flex-1" />;

  if (reduce) {
    const i = items[idx % items.length];
    return (
      <div className="flex min-w-0 flex-1 items-center px-4">
        <TickerItem item={i} onOpen={onOpen} />
      </div>
    );
  }

  const row = items.map((i) => <TickerItem key={i.id} item={i} onOpen={onOpen} />);
  return (
    <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_3%,#000_97%,transparent)]">
      <div
        ref={trackRef}
        className="ticker-track flex h-full w-max items-center group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex items-center">{row}</div>
        <div className="flex items-center" aria-hidden>{row}</div>
      </div>
    </div>
  );
}

function TickerItem({ item, onOpen }: { item: PulseItem; onOpen: (i: PulseItem) => void }) {
  const k = KIND[item.kind] ?? KIND.city;
  const Icon = k.icon;
  return (
    <button
      onClick={() => onOpen(item)}
      className="flex shrink-0 items-center gap-2.5 whitespace-nowrap px-5 text-[13px] text-slate-200 transition-colors hover:text-white"
    >
      <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ring-1", k.chip, item.level === "alert" && "ring-2")}>
        <Icon className="h-3 w-3" />
        {item.tag}
      </span>
      <span className="font-medium">{item.text}</span>
      <span className="ml-3 text-highlight/60" aria-hidden>◆</span>
    </button>
  );
}
