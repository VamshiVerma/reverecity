import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Shared building blocks for the Commuting and Health pages: a DataUSA client and the
// Figure / Panel / bar / trend pieces that match the police log page.

const TESSERACT = "https://api-ts.datausa.io/tesseract/data.jsonrecords";
export const REVERE = "Place:16000US2556585";
export const MASS = "State:04000US25";
export type Row = Record<string, any>;

export async function tesseract(cube: string, drilldowns: string[], measure: string, geo: string): Promise<Row[]> {
  const u = new URL(TESSERACT);
  u.searchParams.set("cube", cube);
  u.searchParams.set("drilldowns", drilldowns.join(","));
  u.searchParams.set("measures", measure);
  u.searchParams.set("include", geo);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`DataUSA ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j?.data) || !j.data.length) throw new Error("DataUSA returned no rows");
  return j.data as Row[];
}

/** Loads once, exposes { data, error, retry }. */
export function useLoad<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ data: null, error: null });
    fn().then((data) => live && setState({ data, error: null }), (e) => live && setState({ data: null, error: String(e?.message || e) }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  const retry = useCallback(() => setN((x) => x + 1), []);
  return { ...state, retry };
}

export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const num = (n: number) => Math.round(n).toLocaleString("en-US");
/** DataUSA labels a 5-year ACS release by its last year. */
export const acsRange = (y: number) => `${y - 4}–${y}`;
export const acsShort = (y: number) => `${y - 4}–${String(y).slice(2)}`;
export const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));
/** "about 2.9 times" when far apart, otherwise "x points higher/lower". */
export function compare(a: number, b: number) {
  if (b > 0 && a / b >= 1.5) return `about ${(a / b).toFixed(1)} times`;
  if (a > 0 && b / a >= 1.5) return `about 1/${(b / a).toFixed(1)} of`;
  const d = (a - b) * 100;
  return `${Math.abs(d).toFixed(1)} points ${d >= 0 ? "above" : "below"}`;
}

export function Figure({ label, value, note, accent, small }: { label: string; value: string | null; note: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="flex min-h-[124px] min-w-0 flex-col rounded-[24px] bg-card p-4 md:p-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {value == null ? <span className="skeleton mt-2 h-8 w-24" /> :
        <span className={cn("figure mt-1 leading-tight", small ? "text-[20px] md:text-[26px]" : "text-[34px] md:text-[42px]", accent ? "text-highlight-secondary" : "text-foreground")}>{value}</span>}
      <span className="mt-auto pt-2 text-[12.5px] leading-snug text-muted-foreground">{note}</span>
    </div>
  );
}

export function Panel({ title, finding, source, question, className, children }: {
  title: string; finding?: React.ReactNode; source?: string; question?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-[24px] bg-card p-4 md:p-6", className)}>
      <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
      {finding !== undefined && (finding ? <p className="mb-4 mt-1 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">{finding}</p> : <span className="skeleton mb-4 mt-2 h-4 w-3/4" />)}
      <div className="min-w-0 flex-1">{children}</div>
      {(source || question) && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {source && <p className="max-w-[60ch] text-[12.5px] leading-snug text-muted-foreground">{source}</p>}
          {question && <AskButton q={question} />}
        </div>
      )}
    </section>
  );
}

export function AskButton({ q, primary }: { q: string; primary?: boolean }) {
  return (
    <button onClick={() => ask(q)} className={cn("h-10 shrink-0 self-start rounded-full px-4 text-[14px] font-medium transition-colors sm:self-auto", primary ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent")}>
      Ask about this
    </button>
  );
}

export function LoadError({ onRetry, what = "this data" }: { onRetry: () => void; what?: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-4 text-[14px] text-foreground">
      Couldn't load {what} right now. The source may be busy.
      <button onClick={onRetry} className="ml-2 font-medium underline underline-offset-4">Try again</button>
    </div>
  );
}

export function Legend({ main = "Revere", other = "Massachusetts" }: { main?: string; other?: string }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-highlight" />{main}</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-3 w-[2px] rounded bg-foreground/60" />{other}</span>
    </div>
  );
}

export type Bar = { key: string; label: string; value: number; compare?: number; count?: number; countLabel?: string; highlight?: boolean; hint?: string };

/** Horizontal bars as shares (0–1). The comparison is a thin tick, never a second hue. */
export function CompareBars({ rows, otherName = "Massachusetts", max }: { rows: Bar[]; otherName?: string; max?: number }) {
  const reduce = useReducedMotion();
  const top = max ?? Math.max(0.0001, ...rows.flatMap((r) => [r.value, r.compare ?? 0]));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key} title={r.hint}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[14px] leading-snug text-foreground">{r.label}</span>
            <span className={cn("figure shrink-0 text-[15px]", r.highlight ? "text-highlight-secondary" : "text-foreground")}>{pct(r.value)}</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-secondary">
            <motion.div className={cn("absolute inset-y-0 left-0 rounded-full", r.highlight ? "bg-highlight-secondary" : "bg-highlight")}
              initial={reduce ? false : { width: 0 }} animate={{ width: `${(r.value / top) * 100}%` }} transition={{ delay: i * 0.04, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            {r.compare != null && <span className="absolute -bottom-1 -top-1 w-[2px] -translate-x-1/2 rounded bg-foreground/60" style={{ left: `${(r.compare / top) * 100}%` }} />}
          </div>
          <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[12.5px] text-muted-foreground">
            <span>{r.count != null ? `${num(r.count)} ${r.countLabel ?? ""}`.trim() : ""}</span>
            {r.compare != null && <span>{otherName} {pct(r.compare)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export type Series = { name: string; main?: boolean; points: { x: number; y: number }[] };

/** Two-series line chart. SVG for the lines, HTML for text so labels stay legible at any width. */
export function TrendLines({ series, format, height = 180, zero = false, xLabel = acsShort }: {
  series: Series[]; format: (y: number) => string; height?: number; zero?: boolean; xLabel?: (x: number) => string;
}) {
  const reduce = useReducedMotion();
  const all = series.flatMap((s) => s.points);
  const xs = Array.from(new Set(all.map((p) => p.x))).sort((a, b) => a - b);
  const x0 = xs[0], x1 = xs[xs.length - 1];
  let lo = Math.min(...all.map((p) => p.y)), hi = Math.max(...all.map((p) => p.y));
  const pad = (hi - lo || hi || 1) * 0.15;
  lo = zero ? 0 : lo - pad; hi = hi + pad;
  const X = (x: number) => (x1 === x0 ? 50 : ((x - x0) / (x1 - x0)) * 100);
  const Y = (y: number) => 100 - ((y - lo) / (hi - lo)) * 100;
  const ticks = [0, 0.5, 1].map((t) => lo + (hi - lo) * t);
  // End labels, nudged apart when the two series finish close together.
  const ends = series.map((s) => ({ s, last: s.points[s.points.length - 1] })).map((e) => ({ ...e, top: Y(e.last.y) }));
  if (ends.length === 2 && Math.abs(ends[0].top - ends[1].top) < 16) {
    const [a, b] = ends[0].top < ends[1].top ? [ends[0], ends[1]] : [ends[1], ends[0]];
    const mid = (a.top + b.top) / 2; a.top = mid - 8; b.top = mid + 8;
  }
  return (
    <div>
      <div className="flex gap-2">
        <div className="relative w-9 shrink-0 text-[11.5px] text-muted-foreground" style={{ height }}>
          {ticks.map((t) => <span key={t} className="figure absolute right-0 -translate-y-1/2" style={{ top: `${Y(t)}%` }}>{format(t)}</span>)}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {ticks.map((t) => <line key={t} x1={0} x2={100} y1={Y(t)} y2={Y(t)} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
            {series.map((s, i) => (
              <motion.path key={s.name} d={s.points.map((p, j) => `${j ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join(" ")} fill="none"
                stroke={s.main ? "hsl(var(--brand))" : "hsl(var(--muted-foreground))"} strokeWidth={s.main ? 2.5 : 1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
            ))}
          </svg>
          {ends.map(({ s, last }) => (
            <span key={s.name} className={cn("absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full", s.main ? "bg-highlight" : "bg-muted-foreground")} style={{ left: `${X(last.x)}%`, top: `${Y(last.y)}%` }} />
          ))}
          {/* Hover targets: one column per year with both values. */}
          <div className="absolute inset-0 flex">
            {xs.map((x) => (
              <span key={x} className="h-full flex-1 hover:bg-foreground/[0.03]" title={`${xLabel(x)}: ${series.map((s) => { const p = s.points.find((q) => q.x === x); return `${s.name} ${p ? format(p.y) : "n/a"}`; }).join(" · ")}`} />
            ))}
          </div>
        </div>
        <div className="relative w-[64px] shrink-0 text-[12px]" style={{ height }}>
          {ends.map(({ s, last, top }) => (
            <span key={s.name} className="absolute left-0 -translate-y-1/2 leading-tight" style={{ top: `${top}%` }}>
              <span className={cn("figure block text-[14px]", s.main ? "text-foreground" : "text-muted-foreground")}>{format(last.y)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-11 pr-[72px] text-[12px] text-muted-foreground">
        <span>{xLabel(x0)}</span>{xs.length > 4 && <span className="hidden sm:inline">{xLabel(xs[Math.floor(xs.length / 2)])}</span>}<span>{xLabel(x1)}</span>
      </div>
    </div>
  );
}

export function SeriesKey({ items }: { items: { name: string; main?: boolean }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
      {items.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5"><span className={cn("h-[3px] w-4 rounded-full", s.main ? "bg-highlight" : "bg-muted-foreground")} />{s.name}</span>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; id: string }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      <div className="inline-flex rounded-full bg-secondary p-1" role="tablist">
        {options.map((o) => (
          <button key={o.id} role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
            className={cn("relative h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-medium transition-colors", value === o.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {value === o.id && <motion.span layoutId={id} className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
