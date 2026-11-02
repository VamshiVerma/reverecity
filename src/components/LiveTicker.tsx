import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { PulseItem } from "@/lib/cityApi";
import { usePulse } from "@/lib/usePulse";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "revere.breaking.dismissed";

export function openPulse(i: PulseItem, navigate: (p: string) => void) {
  if (!i.href) return;
  if (i.href.startsWith("/")) navigate(i.href);
  else window.open(i.href, "_blank", "noopener,noreferrer");
}

/** The calm, always-on strip. Breaking items get a red bar above it after the full-screen takeover. */
export default function LiveTicker() {
  const items = usePulse();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
  });
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const breaking = items.find((i) => i.level === "breaking" && !dismissed.includes(i.id));
  const crawl = useMemo(() => items.filter((i) => i.id !== breaking?.id), [items, breaking]);
  const open = (i: PulseItem) => openPulse(i, navigate);
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
          <motion.div key={breaking.id} initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="overflow-hidden">
            <div className="flex items-stretch bg-[#FC734D] text-[#02070A]">
              <span className="flex shrink-0 items-center gap-2 px-4 text-[13px] font-semibold md:px-7">
                <span className="h-2 w-2 rounded-full bg-[#02070A]" /> Breaking
              </span>
              <button onClick={() => open(breaking)} className="min-w-0 flex-1 py-2.5 pr-2 text-left text-[14px] font-medium leading-snug md:text-[15px]">
                <span className="opacity-80">{breaking.tag} · </span>{breaking.text}
              </button>
              <button onClick={() => dismiss(breaking.id)} aria-label="Dismiss breaking alert" className="grid w-11 shrink-0 place-items-center opacity-80 transition hover:bg-black/15 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-10 items-stretch border-b border-border bg-background">
        <div className="flex shrink-0 items-center gap-2 pl-4 pr-3 text-[13px] font-semibold text-foreground md:pl-7">
          <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FC734D]" />
          </span>
          Live
        </div>
        <Crawl items={crawl} reduce={!!reduce} onOpen={open} />
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
    setDuration(Math.max(30, w / 60));
  }, [items]);

  useEffect(() => {
    if (!reduce || items.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [reduce, items.length]);

  if (!items.length) return <div className="flex-1" />;
  if (reduce) return <div className="flex min-w-0 flex-1 items-center"><Item item={items[idx % items.length]} onOpen={onOpen} /></div>;

  const row = items.map((i) => <Item key={i.id} item={i} onOpen={onOpen} />);
  return (
    <div className="group relative min-w-0 flex-1 overflow-hidden">
      <div ref={trackRef} className="ticker-track flex h-full w-max items-center group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]" style={{ animationDuration: `${duration}s` }}>
        <div className="flex items-center">{row}</div>
        <div className="flex items-center" aria-hidden>{row}</div>
      </div>
    </div>
  );
}

function Item({ item, onOpen }: { item: PulseItem; onOpen: (i: PulseItem) => void }) {
  return (
    <button onClick={() => onOpen(item)} className="flex shrink-0 items-center gap-2 whitespace-nowrap px-5 text-[14px] transition-colors hover:text-foreground">
      <span className={cn("font-medium", item.level === "alert" ? "text-destructive" : "text-muted-foreground")}>{item.tag}</span>
      <span className="text-foreground">{item.text}</span>
    </button>
  );
}
