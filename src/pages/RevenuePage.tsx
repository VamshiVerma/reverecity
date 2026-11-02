import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileText, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { FREE_CASH, GENERAL_FUND_MIX, REVENUE_LINES, REVENUE_SOURCE, STABILIZATION, type Point } from "@/data/revenueFY2027";

const money = (n: number, d = 1) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(d)}M` : `$${Math.round(n / 1e3).toLocaleString()}K`);
const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));
const pageUrl = (p: number) => `${REVENUE_SOURCE.url}#page=${p}`;
const MIX_COLORS = ["bg-highlight", "bg-emerald-400", "bg-amber-400", "bg-slate-400"];

function Bars({ series, height = 180, compact = false }: { series: Point[]; height?: number; compact?: boolean }) {
  const max = Math.max(...series.map((s) => s.v));
  return (
    <div className="flex items-end gap-1.5" style={{ height }} role="img"
      aria-label={series.map((s) => `FY${s.fy} ${money(s.v)}${s.projected ? " projected" : ""}`).join(", ")}>
      {series.map((s, i) => (
        <div key={s.fy} className="group relative flex h-full flex-1 flex-col justify-end">
          {!compact && (
            <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-foreground opacity-0 shadow-lg ring-1 ring-border transition group-hover:opacity-100">
              FY{s.fy}: {money(s.v, 2)}{s.projected ? " (proj.)" : ""}
            </span>
          )}
          <motion.div
            initial={{ height: 0 }} animate={{ height: `${(s.v / max) * 100}%` }}
            transition={{ duration: 0.7, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
            className={cn("w-full rounded-t-[3px]", s.projected
              ? "bg-[repeating-linear-gradient(135deg,hsl(199_91%_56%/0.55)_0_4px,hsl(199_91%_56%/0.2)_4px_8px)] ring-1 ring-inset ring-highlight/50"
              : "bg-gradient-to-t from-highlight/70 to-highlight")}
          />
          {!compact && <span className="mt-1.5 text-center text-[10px] tabular-nums text-muted-foreground">’{String(s.fy).slice(2)}</span>}
        </div>
      ))}
    </div>
  );
}

export default function RevenuePage() {
  const property = REVENUE_LINES.find((l) => l.id === "property")!;
  const local = REVENUE_LINES.filter((l) => l.id !== "property");
  const [sel, setSel] = useState(local[0].id);
  const line = local.find((l) => l.id === sel)!;

  const last = (s: Point[]) => s[s.length - 1];
  const lastActual = (s: Point[]) => [...s].reverse().find((p) => !p.projected)!;
  const p27 = last(property.series), p26 = property.series[property.series.length - 2], p18 = property.series[0];

  const localTotal = useMemo(() => {
    const years = property.series.map((p) => p.fy);
    return years.map((fy) => ({
      fy,
      v: local.filter((l) => l.id !== "otherdept").reduce((s, l) => s + (l.series.find((p) => p.fy === fy)?.v ?? 0), 0),
      projected: fy >= 2026,
    }));
  }, [local, property.series]);

  return (
    <DashboardLayout pageTitle="Revenue">
      <div className="mx-auto max-w-6xl space-y-8 pb-16">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-foreground">
            <FileText className="h-3.5 w-3.5" /> FY2027 Adopted Budget · revenue section, pp. 228–242
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">How Revere pays for it</h1>
          <p className="max-w-2xl text-sm text-foreground/80 md:text-base">
            Nearly all of the city's general fund comes from two places: local property taxes and state aid.
            Here is how each source has moved over ten years, using the city's own figures. Striped bars are the city's projections, not actual collections.
          </p>
        </header>

        {/* Mix */}
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">Where general fund money comes from</h2>
            <a href={pageUrl(GENERAL_FUND_MIX.page)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-highlight">Budget p. {GENERAL_FUND_MIX.page} <ExternalLink className="h-3 w-3" /></a>
          </div>
          {([["FY2027", GENERAL_FUND_MIX.fy2027], ["FY2026", GENERAL_FUND_MIX.fy2026]] as const).map(([label, mix], r) => (
            <div key={label} className="mb-4 last:mb-0">
              <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label} estimate</div>
              <div className="flex h-9 overflow-hidden rounded-lg">
                {mix.map((m, i) => (
                  <motion.div key={m.name} initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 0.8, delay: r * 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("flex items-center overflow-hidden px-2 text-xs font-bold text-slate-950", MIX_COLORS[i], r && "opacity-60")} title={`${m.name}: ${m.pct}%`}>
                    {m.pct >= 8 && `${m.pct}%`}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground/80">
            {GENERAL_FUND_MIX.fy2027.map((m, i) => (
              <span key={m.name} className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-sm", MIX_COLORS[i])} />{m.name} · {m.pct}%</span>
            ))}
          </div>
        </section>

        {/* Property tax + local receipts headline */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Property tax levy · FY2027 projected</div>
            <div className="mt-2 font-display text-4xl font-semibold tabular-nums text-foreground">{money(p27.v)}</div>
            <p className="mt-1 text-sm text-foreground/80">
              <span className="font-semibold text-foreground">+{(((p27.v - p26.v) / p26.v) * 100).toFixed(1)}%</span> over FY2026 ·{" "}
              <span className="font-semibold text-foreground">+{(((p27.v - p18.v) / p18.v) * 100).toFixed(0)}%</span> since FY2018
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Proposition 2½ allows a 2.5% yearly increase plus “new growth” from new construction.</p>
            <div className="mt-5"><Bars series={property.series} /></div>
            <Foot page={property.page} q="How much does Revere collect in property taxes and why is it going up?" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Local receipts · FY2027 projected</div>
            <div className="mt-2 font-display text-4xl font-semibold tabular-nums text-foreground">{money(last(localTotal).v)}</div>
            <p className="mt-1 text-sm text-foreground/80">Car excise, hotel and meals taxes, permits, fines, investment income and fees, added up.</p>
            <p className="mt-1 text-xs text-muted-foreground">Every year leaves out “other department revenue” (about $1.4M), because the budget doesn't project it for FY2027.</p>
            <div className="mt-5"><Bars series={localTotal} /></div>
            <Foot page={237} q="What are Revere's biggest local revenue sources besides property tax?" />
          </div>
        </section>

        {/* Local receipts explorer */}
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Every local revenue source, ten years</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick one to see its full history.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {local.map((l) => {
              const v = last(l.series), a = lastActual(l.series);
              const active = l.id === sel;
              return (
                <button key={l.id} onClick={() => setSel(l.id)} aria-pressed={active}
                  className={cn("rounded-xl border p-3 text-left transition", active ? "border-highlight/60 bg-highlight/10" : "border-border bg-card hover:border-input")}>
                  <div className="truncate text-xs font-medium text-foreground/80">{l.name}</div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <span className="font-display text-lg font-semibold tabular-nums text-foreground">{money(v.v, 2)}</span>
                    <div className="w-16"><Bars series={l.series} height={28} compact /></div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">FY{v.fy}{v.projected ? " proj." : ""} · FY{a.fy} actual {money(a.v, 2)}</div>
                </button>
              );
            })}
          </div>
          <motion.div key={line.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-foreground">{line.name}</h3>
              <span className="text-xs text-muted-foreground">Low {money(Math.min(...line.series.map((s) => s.v)), 2)} · High {money(Math.max(...line.series.map((s) => s.v)), 2)}</span>
            </div>
            <Bars series={line.series} height={200} />
            <Foot page={line.page} q={`How much does Revere get from ${line.name.toLowerCase()} and how has it changed?`} />
          </motion.div>
        </section>

        {/* Reserves */}
        <section className="grid gap-4 lg:grid-cols-2">
          {[
            { t: "Free cash (certified reserves)", d: "Unspent money left over at year end, certified by the state. FY2026 is the amount certified as of June 30, 2025.", s: FREE_CASH, q: "What is free cash and how much does Revere have?" },
            { t: "Stabilization fund balance", d: "The city's rainy-day savings. At least 15% of certified free cash is added each year by ordinance.", s: STABILIZATION, q: "How big is Revere's stabilization (rainy day) fund?" },
          ].map((r) => (
            <div key={r.t} className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{r.t}</div>
              <div className="mt-2 font-display text-3xl font-semibold tabular-nums text-foreground">{money(last(r.s.series).v, 2)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{r.d}</p>
              <div className="mt-5"><Bars series={r.s.series} height={140} /></div>
              <Foot page={r.s.page} q={r.q} />
            </div>
          ))}
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Source: City of Revere, <a className="text-highlight hover:underline" href={REVENUE_SOURCE.url} target="_blank" rel="noreferrer">{REVENUE_SOURCE.title}</a>.
          FY2018–FY2025 are actual figures and FY2026–FY2027 are projections, as labeled in the document. State aid (Cherry Sheet) dollar amounts aren't broken out in this section, so only its share is shown.
        </p>
      </div>
    </DashboardLayout>
  );
}

function Foot({ page, q }: { page: number; q: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <a href={pageUrl(page)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-highlight">Budget p. {page} <ExternalLink className="h-3 w-3" /></a>
      <button onClick={() => ask(q)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-highlight transition hover:bg-highlight/10">
        <Sparkles className="h-3.5 w-3.5" /> Ask about this
      </button>
    </div>
  );
}
