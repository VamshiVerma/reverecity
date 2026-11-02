import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { pct } from "./kit";
import type { Bin } from "./data";

/** One column per Census travel-time band. Bands of an hour or more are the highlighted value. */
export default function TimeHistogram({ revere, mass, height = 190 }: { revere: { bins: Bin[]; total: number }; mass: { bins: Bin[]; total: number }; height?: number }) {
  const reduce = useReducedMotion();
  const share = revere.bins.map((b) => b.n / revere.total);
  const maShare = mass.bins.map((b) => b.n / mass.total);
  const top = Math.max(...share, ...maShare) * 1.08;
  const long = (b: Bin) => /^(60|90)/.test(b.short);
  return (
    <div>
      <div className="flex items-end gap-[3px] sm:gap-1.5" style={{ height }}>
        {revere.bins.map((b, i) => (
          <div key={b.label} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${b.label}: ${pct(share[i])} of Revere commuters (${b.n.toLocaleString("en-US")}) · Massachusetts ${pct(maShare[i])}`}>
            <span className="figure mb-1 text-center text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">{Math.round(share[i] * 100)}%</span>
            <motion.div className={cn("w-full rounded-t-[6px]", long(b) ? "bg-highlight-secondary" : "bg-highlight/80 group-hover:bg-highlight")}
              initial={reduce ? false : { height: 0 }} animate={{ height: `${(share[i] / top) * 100}%` }} transition={{ delay: i * 0.03, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            {maShare[i] != null && <span className="pointer-events-none absolute inset-x-0 h-[2px] rounded bg-foreground/60" style={{ bottom: `${(maShare[i] / top) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-center text-[11px] leading-tight text-muted-foreground sm:gap-1.5 sm:text-[12px]">
        {revere.bins.map((b) => <span key={b.label} className="min-w-0 flex-1">{b.short.replace("-", "–")}</span>)}
      </div>
      <p className="mt-1 text-right text-[12px] text-muted-foreground">Minutes, one way. Bands past 45 minutes are wider.</p>
    </div>
  );
}
