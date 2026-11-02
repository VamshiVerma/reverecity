import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePulse } from "@/lib/usePulse";
import { openPulse } from "@/components/LiveTicker";
import type { PulseItem } from "@/lib/cityApi";
import { cn } from "@/lib/utils";

const SEEN = "revere.toast.seen";
const LIFE_MS = 9000;
const key = (i: PulseItem) => (i.id === "pd-fresh" ? `${i.id}:${i.text}` : i.id);
const worthTelling = (i: PulseItem) => i.level === "alert" || i.id === "pd-fresh";

/** Real notifications: a new MBTA or weather alert, or a newly posted police log. Never on first visit, never repeated. */
export default function LiveToasts() {
  const items = usePulse();
  const navigate = useNavigate();
  const [stack, setStack] = useState<PulseItem[]>([]);
  const ready = useRef(false);

  useEffect(() => {
    if (!items.length) return;
    let seen: string[] | null = null;
    try { seen = JSON.parse(localStorage.getItem(SEEN) || "null"); } catch { /* ignore */ }
    const candidates = items.filter(worthTelling);
    const save = (ids: string[]) => { try { localStorage.setItem(SEEN, JSON.stringify(ids.slice(-200))); } catch { /* ignore */ } };

    if (!seen) { // first visit: learn what exists, announce nothing
      save(candidates.filter((i) => !i.id.startsWith("demo")).map(key));
      seen = candidates.filter((i) => !i.id.startsWith("demo")).map(key);
    }
    // Skip whatever the full-screen takeover already showed this visit.
    let flashed: string[] = [];
    try { flashed = JSON.parse(sessionStorage.getItem("revere.takeover.session") || "[]"); } catch { /* ignore */ }
    const fresh = candidates.filter((i) => !seen!.includes(key(i)) && !flashed.includes(i.id) && !stack.some((s) => s.id === i.id));
    if (fresh.length) {
      setStack((s) => [...fresh.slice(0, 3), ...s].slice(0, 3));
      save([...seen, ...fresh.filter((i) => !i.id.startsWith("demo")).map(key)]);
    }
    ready.current = true;
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const drop = (id: string) => setStack((s) => s.filter((x) => x.id !== id));

  return (
    <div className="pointer-events-none fixed bottom-24 left-4 right-4 z-[90] flex flex-col gap-2 md:bottom-6 md:left-auto md:right-6 md:w-[400px]" aria-live="polite">
      <AnimatePresence initial={false}>
        {stack.map((t) => (
          <Toast key={t.id} t={t} onClose={() => drop(t.id)} onOpen={() => { drop(t.id); openPulse(t, navigate); }} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ t, onClose, onOpen }: { t: PulseItem; onClose: () => void; onOpen: () => void }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(LIFE_MS);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const id = setTimeout(onClose, left.current);
    return () => { clearTimeout(id); left.current -= Date.now() - started; };
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const alert = t.level !== "info";
  return (
    <motion.div layout
      initial={{ opacity: 0, x: 60, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto relative overflow-hidden rounded-[18px] bg-popover text-popover-foreground shadow-[0_18px_48px_-12px_rgba(0,0,0,0.45)] ring-1 ring-border"
      role="status">
      <div className={cn("absolute inset-y-0 left-0 w-1", alert ? "bg-destructive" : "bg-highlight")} />
      <button onClick={onOpen} className="block w-full py-3.5 pl-5 pr-11 text-left">
        <span className={cn("block text-[13px] font-semibold", alert ? "text-destructive" : "text-muted-foreground")}>{t.tag}</span>
        <span className="mt-0.5 block text-[15px] leading-snug">{t.text}</span>
      </button>
      <button onClick={onClose} aria-label="Dismiss" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <motion.div className="absolute bottom-0 left-0 h-[2px] bg-foreground/25" initial={{ width: "100%" }} animate={{ width: paused ? undefined : "0%" }}
        transition={{ duration: LIFE_MS / 1000, ease: "linear" }} />
    </motion.div>
  );
}
