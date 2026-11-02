import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared pieces for the Schools and Safety overview pages, matching the police log page.

export const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));

export function Figure({ label, value, note, accent, small }: { label: string; value: string | null; note: React.ReactNode; accent?: boolean; small?: boolean }) {
  return (
    <div className="flex min-h-[124px] min-w-0 flex-col rounded-[24px] bg-card p-4 md:p-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {value == null ? <span className="skeleton mt-2 h-8 w-24" /> :
        <span className={cn("figure mt-1 leading-tight", small ? "text-[20px] md:text-[26px]" : "text-[34px] md:text-[40px]", accent ? "text-highlight-secondary" : "text-foreground")}>{value}</span>}
      <span className="mt-auto pt-2 text-[12.5px] leading-snug text-muted-foreground">{note}</span>
    </div>
  );
}

export function Panel({ title, sub, className, children }: { title: string; sub?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-[24px] bg-card p-4 md:p-6", className)}>
      <h3 className="text-[17px] font-semibold text-foreground">{title}</h3>
      {sub && <p className="mb-4 text-[13px] text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}

/** One resident question per section: the heading asks it, the sentence answers it from the data. */
export function Section({ title, finding, q, source, children }: { title: string; finding: React.ReactNode | null; q?: string; source?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pt-4">
      <div className="flex flex-col gap-2 px-1 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="max-w-[760px]">
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[26px]">{title}</h2>
          {finding == null ? <span className="skeleton mt-2 block h-5 w-72 max-w-full" /> : <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{finding}</p>}
        </div>
        {q && <AskButton q={q} />}
      </div>
      {children}
      {source && <p className="px-1 text-[12.5px] text-muted-foreground">{source}</p>}
    </section>
  );
}

export function AskButton({ q, primary }: { q: string; primary?: boolean }) {
  return (
    <button onClick={() => ask(q)}
      className={cn("h-10 shrink-0 self-start rounded-full px-4 text-[14px] font-medium transition-colors md:self-auto", primary ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-secondary")}>
      Ask about this
    </button>
  );
}

export function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground">
      {children} <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[24px] bg-card p-4 text-[14px] text-muted-foreground md:p-6">{children}</div>;
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />{i.label}
        </span>
      ))}
    </div>
  );
}

export type Series = { name: string; color: string; values: (number | null)[]; strong?: boolean };

/** A plain line chart: thin lines, hairline grid, end labels, a hover readout. */
export function LineChart({ xs, xLabel, series, yTicks, fmt, height = 220 }: { xs: string[]; xLabel: (x: string) => string; series: Series[]; yTicks: number[]; fmt: (n: number) => string; height?: number }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const lo = Math.min(...yTicks), hi = Math.max(...yTicks);
  const X = (i: number) => (xs.length < 2 ? 50 : (i / (xs.length - 1)) * 100);
  const Y = (v: number) => 100 - ((v - lo) / (hi - lo || 1)) * 100;
  const segs = (vals: (number | null)[]) => {
    const out: string[] = []; let cur: string[] = [];
    vals.forEach((v, i) => { if (v == null) { if (cur.length) out.push(cur.join(" ")); cur = []; } else cur.push(`${X(i)},${Y(v)}`); });
    if (cur.length) out.push(cur.join(" "));
    return out;
  };
  const lastIdx = (vals: (number | null)[]) => { for (let i = vals.length - 1; i >= 0; i--) if (vals[i] != null) return i; return -1; };
  const step = Math.max(1, Math.ceil(xs.length / 6));
  return (
    <div className="select-none">
      <div className="relative ml-9 mr-12" style={{ height }} onMouseLeave={() => setHover(null)}>
        {yTicks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-border" style={{ top: `${Y(t)}%` }}>
            <span className="figure absolute -left-9 -translate-y-1/2 text-[11px] text-muted-foreground">{fmt(t)}</span>
          </div>
        ))}
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {series.map((s) => segs(s.values).map((pts, k) => (
            <motion.polyline key={s.name + k} points={pts} fill="none" stroke={s.color} strokeWidth={s.strong ? 2.5 : 2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          )))}
        </svg>
        {series.map((s) => {
          const i = lastIdx(s.values); if (i < 0) return null;
          return (
            <div key={s.name} className="pointer-events-none absolute" style={{ left: `${X(i)}%`, top: `${Y(s.values[i]!)}%` }}>
              <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card" style={{ background: s.color }} />
              <span className="figure absolute left-2.5 -translate-y-1/2 whitespace-nowrap text-[12.5px] text-foreground">{fmt(s.values[i]!)}</span>
            </div>
          );
        })}
        {hover != null && (
          <>
            <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25" style={{ left: `${X(hover)}%` }} />
            {series.map((s) => s.values[hover] != null && (
              <span key={s.name} className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card" style={{ left: `${X(hover)}%`, top: `${Y(s.values[hover]!)}%`, background: s.color }} />
            ))}
            <div className={cn("pointer-events-none absolute top-0 z-10 rounded-xl bg-background px-3 py-2 text-[12.5px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] ring-1 ring-border", X(hover) > 60 ? "-translate-x-[calc(100%+10px)]" : "translate-x-[10px]")} style={{ left: `${X(hover)}%` }}>
              <div className="font-medium text-foreground">{xLabel(xs[hover])}</div>
              {series.map((s) => (
                <div key={s.name} className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}
                  <span className="figure ml-auto pl-3 text-foreground">{s.values[hover] == null ? "no data" : fmt(s.values[hover]!)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="absolute inset-0 flex">
          {xs.map((x, i) => <div key={x} className="h-full flex-1" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />)}
        </div>
      </div>
      <div className="relative ml-9 mr-12 mt-2 h-4 text-[12px] text-muted-foreground">
        {xs.map((x, i) => (i % step === 0 || i === xs.length - 1) && (i === xs.length - 1 || xs.length - 1 - i >= step / 2) && (
          <span key={x} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${X(i)}%` }}>{xLabel(x)}</span>
        ))}
      </div>
    </div>
  );
}

/** Paired horizontal bars: Revere (blue) against a neutral comparison. */
export function PairBars({ rows, fmt, max, aName = "Revere", bName = "Massachusetts" }: { rows: { label: string; a: number | null; b: number | null }[]; fmt: (n: number) => string; max: number; aName?: string; bName?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-4">
      <Legend items={[{ label: aName, color: "hsl(var(--brand))" }, { label: bName, color: "hsl(var(--muted-foreground) / 0.45)" }]} />
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1.5 text-[14px] text-foreground">{r.label}</div>
          {([["a", r.a, "bg-highlight"], ["b", r.b, "bg-muted-foreground/45"]] as const).map(([k, v, c]) => (
            <div key={k} className="mb-1 grid grid-cols-[1fr_52px] items-center gap-3">
              <div className="h-3 overflow-hidden rounded-r-[4px]">
                <motion.div className={cn("h-full rounded-r-[4px]", c)} initial={reduce ? false : { width: 0 }} animate={{ width: `${((v ?? 0) / max) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <span className={cn("figure text-right text-[14px]", k === "a" ? "text-foreground" : "text-muted-foreground")}>{v == null ? "n/a" : fmt(v)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
