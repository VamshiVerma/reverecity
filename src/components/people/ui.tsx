import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { acsLabel, ask } from "./acs";

/** A label and a number, as on the police log page. */
export function Figure({ label, value, note, accent, small }: { label: string; value: string | null; note: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="flex min-h-[124px] min-w-0 flex-col rounded-[24px] bg-card p-4 md:p-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {value == null ? <span className="skeleton mt-2 h-8 w-24" /> :
        <span className={cn("figure mt-1 leading-tight", small ? "text-[20px] md:text-[26px]" : "text-[32px] md:text-[40px]", accent ? "text-highlight-secondary" : "text-foreground")}>{value}</span>}
      <span className="mt-auto pt-2 text-[12.5px] leading-snug text-muted-foreground">{note}</span>
    </div>
  );
}

type Src = { table: string; year: number } | null | undefined;

/** One panel = one resident question. The finding is a sentence computed from the data. */
export function Section({ title, finding, source, question, loading, error, retry, className, children }: {
  title: string; finding?: React.ReactNode; source?: Src; question?: string; loading?: boolean; error?: unknown; retry?: () => void; className?: string; children?: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-[24px] bg-card p-4 md:p-6", className)}>
      <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
      {error ? (
        <div className="mt-3 rounded-2xl bg-secondary p-4 text-[14px] text-muted-foreground">
          The Census figures for this section didn't load. Data USA, which serves them, may be busy.
          {retry && <button onClick={retry} className="ml-2 font-medium text-foreground underline underline-offset-2">Try again</button>}
        </div>
      ) : loading ? (
        <div className="mt-3 space-y-3"><div className="skeleton h-5 w-4/5" /><div className="skeleton h-40" /></div>
      ) : (
        <>
          {finding && <p className="mt-1 max-w-[62ch] text-[15px] leading-snug text-foreground/85">{finding}</p>}
          <div className="mt-5 min-w-0 flex-1">{children}</div>
        </>
      )}
      {(source || question) && !error && !loading && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3">
          {source && <span className="text-[12px] leading-snug text-muted-foreground">U.S. Census Bureau, {acsLabel(source.year)}{source.table ? `, table ${source.table}` : ""}</span>}
          {question && <button onClick={() => ask(question)} className="h-9 shrink-0 rounded-full bg-secondary px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-accent">Ask about this</button>}
        </div>
      )}
    </section>
  );
}

export function Legend({ items }: { items: { label: string; tone: Tone; tick?: boolean }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.tick ? <span className="h-3.5 w-[2px] bg-foreground/70" /> : <span className={cn("h-2.5 w-2.5 rounded-full", TONE[i.tone])} />}{i.label}
        </span>
      ))}
    </div>
  );
}

export type Tone = "main" | "accent" | "n1" | "n2";
export const TONE: Record<Tone, string> = { main: "bg-highlight", accent: "bg-highlight-secondary", n1: "bg-foreground/40", n2: "bg-foreground/15" };
const STROKE: Record<Tone, string> = { main: "hsl(var(--brand))", accent: "hsl(var(--brand-2))", n1: "hsl(var(--foreground) / 0.45)", n2: "hsl(var(--foreground) / 0.2)" };

export type BarItem = { label: string; value: number; display: string; compare?: number; compareDisplay?: string; tone?: Tone; sub?: string };

/** Horizontal bars. `compare` draws a thin tick at the Massachusetts value on the same scale. */
export function Bars({ items, max, compareName = "Massachusetts" }: { items: BarItem[]; max?: number; compareName?: string }) {
  const reduce = useReducedMotion();
  const top = max ?? Math.max(1e-9, ...items.map((i) => Math.max(i.value, i.compare ?? 0)));
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={it.label} title={it.compareDisplay ? `${it.label}: ${it.display} in Revere, ${it.compareDisplay} in ${compareName}` : `${it.label}: ${it.display}`}>
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="min-w-0 text-foreground">{it.label}{it.sub && <span className="text-muted-foreground"> · {it.sub}</span>}</span>
            <span className="figure shrink-0 text-foreground">{it.display}{it.compareDisplay && <span className="ml-1.5 text-[12.5px] text-muted-foreground">MA {it.compareDisplay}</span>}</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-secondary">
            <motion.div className={cn("h-full rounded-full", TONE[it.tone ?? "main"])} initial={reduce ? false : { width: 0 }} animate={{ width: `${(it.value / top) * 100}%` }} transition={{ delay: i * 0.04, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            {it.compare != null && <span className="absolute -top-1 h-4 w-[2px] rounded-full bg-foreground/70" style={{ left: `calc(${Math.min(100, (it.compare / top) * 100)}% - 1px)` }} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One tall bar split into at most four parts, with a 2px gap between parts. */
export function Stack({ parts, fmt }: { parts: { label: string; value: number; tone: Tone }[]; fmt: (v: number, share: number) => string }) {
  const reduce = useReducedMotion();
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-10 gap-[2px] overflow-hidden rounded-xl">
        {parts.map((p, i) => (
          <motion.div key={p.label} title={`${p.label}: ${fmt(p.value, p.value / total)}`} className={cn("h-full first:rounded-l-xl last:rounded-r-xl", TONE[p.tone])}
            initial={reduce ? false : { width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }} transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
        ))}
      </div>
      <ul className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="flex min-w-0 items-center gap-2 text-foreground"><span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TONE[p.tone])} />{p.label}</span>
            <span className="figure shrink-0 text-foreground">{fmt(p.value, p.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type Series = { name: string; tone: Tone; points: { x: number; y: number }[] };

/** Lines over the estimate years. One y-scale; hover or tap a year to read both values. */
export function Trend({ series, fmt, xLabel, zero, height = 180 }: { series: Series[]; fmt: (v: number) => string; xLabel: (x: number) => string; zero?: boolean; height?: number }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  let lo = zero ? 0 : Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo) * 0.12 || 1; hi += pad; if (!zero) lo -= pad;
  const X = (x: number) => (xs.length < 2 ? 50 : ((x - xs[0]) / (xs[xs.length - 1] - xs[0])) * 100);
  const Y = (y: number) => 100 - ((y - lo) / (hi - lo)) * 100;
  const hx = hover == null ? null : xs[hover];
  return (
    <div>
      <Legend items={series.map((s) => ({ label: `${s.name} ${fmt(s.points[s.points.length - 1]?.y ?? 0)}`, tone: s.tone }))} />
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {[0, 50, 100].map((g) => <line key={g} x1={0} x2={100} y1={g} y2={g} stroke="hsl(var(--border))" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
          {hx != null && <line x1={X(hx)} x2={X(hx)} y1={0} y2={100} stroke="hsl(var(--foreground) / 0.3)" vectorEffect="non-scaling-stroke" />}
          {series.map((s) => (
            <motion.path key={s.name} d={s.points.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join(" ")} fill="none" stroke={STROKE[s.tone]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          ))}
        </svg>
        {series.map((s) => {
          const p = (hx != null ? s.points.find((q) => q.x === hx) : null) ?? s.points[s.points.length - 1];
          return p ? <span key={s.name} className={cn("pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card", TONE[s.tone])} style={{ left: `${X(p.x)}%`, top: `${Y(p.y)}%` }} /> : null;
        })}
        <div className="absolute inset-0 flex">
          {xs.map((x, i) => <button key={x} aria-label={`${xLabel(x)}`} className="h-full flex-1" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} />)}
        </div>
        {hx != null && (
          <div className={cn("pointer-events-none absolute top-0 z-10 rounded-xl bg-popover px-3 py-2 text-[12.5px] shadow-md ring-1 ring-border", X(hx) > 55 ? "-translate-x-[calc(100%+10px)]" : "translate-x-[10px]")} style={{ left: `${X(hx)}%` }}>
            <div className="mb-1 whitespace-nowrap text-muted-foreground">{xLabel(hx)}</div>
            {series.map((s) => { const p = s.points.find((q) => q.x === hx); return p ? <div key={s.name} className="flex items-center gap-2 whitespace-nowrap text-foreground"><span className={cn("h-2 w-2 rounded-full", TONE[s.tone])} />{s.name} <span className="figure ml-auto pl-3">{fmt(p.y)}</span></div> : null; })}
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
        <span>{xs.length ? xLabel(xs[0]) : ""}</span><span>{xs.length ? xLabel(xs[xs.length - 1]) : ""}</span>
      </div>
    </div>
  );
}

/** Vertical columns over the estimate years; the latest is cantaloupe. */
export function Columns({ points, fmt, xLabel, height = 170 }: { points: { x: number; y: number }[]; fmt: (v: number) => string; xLabel: (x: number) => string; height?: number }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...points.map((p) => p.y));
  return (
    <div>
      <div className="flex items-end gap-[3px] md:gap-1.5" style={{ height }}>
        {points.map((p, i) => (
          <div key={p.x} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${xLabel(p.x)}: ${fmt(p.y)}`}>
            <span className="figure mb-1 hidden text-center text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100 md:block">{fmt(p.y)}</span>
            <motion.div className={cn("w-full rounded-t-[6px]", i === points.length - 1 ? "bg-highlight-secondary" : "bg-highlight/75 group-hover:bg-highlight")}
              initial={reduce ? false : { height: 0 }} animate={{ height: `${(p.y / max) * 100}%` }} transition={{ delay: i * 0.03, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
        <span>{points[0] ? xLabel(points[0].x) : ""}</span><span>{points.length ? xLabel(points[points.length - 1].x) : ""}</span>
      </div>
    </div>
  );
}

/** Closing note shared by the people pages. */
export function SourceNote({ q }: { q: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-[24px] bg-card p-4 text-[14px] md:flex-row md:items-center md:justify-between md:p-6">
      <div className="max-w-[720px] text-muted-foreground">
        Every figure on this page is a U.S. Census Bureau American Community Survey 5-year estimate, read live from Data USA. Five-year estimates pool survey answers across five years, so each one describes a period, not a single year, and small groups carry wide margins of error.
        <span className="mt-2 flex flex-wrap gap-2">
          <a href="https://datausa.io/profile/geo/revere-ma" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[13px] text-foreground hover:bg-accent">Revere on Data USA <ExternalLink className="h-3 w-3" /></a>
          <a href="https://www.census.gov/programs-surveys/acs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[13px] text-foreground hover:bg-accent">About the survey <ExternalLink className="h-3 w-3" /></a>
        </span>
      </div>
      <button onClick={() => ask(q)} className="h-11 shrink-0 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground">Ask about this</button>
    </section>
  );
}
