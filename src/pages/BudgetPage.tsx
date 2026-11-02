import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ExternalLink, FileText, Search, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Every figure on this page is read from the city's adopted budget documents
// (extracted into the `budget_departments` table) and links to its source page.

type Dept = {
  doc_id: string;
  doc_title: string;
  fiscal_year: number;
  code: string | null;
  name: string;
  page: number;
  source_url: string;
  prior_adopted: number | null;
  dept_request: number | null;
  recommended: number;
  payroll: number | null;
  non_payroll: number | null;
};

// The School Department appropriation is a single line in the summary (p. 172), not a department page.
const SCHOOL = {
  2027: { amount: 132944577, prior: 131567036, page: 172, url: "https://files.aptuitivcdn.com/GB7r14nbKy-1182/docs/FY2027-Budget-Adopted.pdf" },
} as Record<number, { amount: number; prior: number; page: number; url: string } | undefined>;

const money = (n: number, digits = 1) =>
  Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(digits)}M` : Math.abs(n) >= 1e3 ? `$${Math.round(n / 1e3).toLocaleString()}K` : `$${Math.round(n).toLocaleString()}`;
const full = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (a: number, b: number | null) => (b ? ((a - b) / b) * 100 : null);
const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));
const tidy = (s: string) => s.replace(/^Dept\. of /i, "").replace(/\s+/g, " ").trim();

type Sort = "amount" | "change" | "name";
type Filter = "all" | "up" | "down";

export default function BudgetPage() {
  const [rows, setRows] = useState<Dept[] | null>(null);
  const [error, setError] = useState(false);
  const [year, setYear] = useState(2027);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("amount");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("budget_departments" as any)
      .select("doc_id,doc_title,fiscal_year,code,name,page,source_url,prior_adopted,dept_request,recommended,payroll,non_payroll")
      .then(({ data, error }) => {
        if (error || !data) setError(true);
        else setRows(data as unknown as Dept[]);
      });
  }, []);

  const years = useMemo(() => [...new Set((rows || []).map((r) => r.fiscal_year))].sort((a, b) => b - a), [rows]);
  const yearRows = useMemo(() => (rows || []).filter((r) => r.fiscal_year === year), [rows, year]);
  const doc = yearRows[0];
  const school = SCHOOL[year];

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let l = yearRows.filter((r) => !needle || r.name.toLowerCase().includes(needle) || (r.code || "").includes(needle));
    if (filter === "up") l = l.filter((r) => (pct(r.recommended, r.prior_adopted) ?? 0) > 0.05);
    if (filter === "down") l = l.filter((r) => (pct(r.recommended, r.prior_adopted) ?? 0) < -0.05);
    return [...l].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name)
      : sort === "change" ? (b.recommended - (b.prior_adopted ?? b.recommended)) - (a.recommended - (a.prior_adopted ?? a.recommended))
      : b.recommended - a.recommended,
    );
  }, [yearRows, q, sort, filter]);

  const max = Math.max(1, ...yearRows.map((r) => Math.max(r.recommended, r.prior_adopted ?? 0)));
  const total = yearRows.reduce((s, r) => s + r.recommended, 0);
  const totalPrior = yearRows.reduce((s, r) => s + (r.prior_adopted ?? 0), 0);
  const byDelta = [...yearRows].filter((r) => r.prior_adopted).sort((a, b) => (b.recommended - b.prior_adopted!) - (a.recommended - a.prior_adopted!));
  const biggestUp = byDelta[0];
  const biggestDown = byDelta[byDelta.length - 1];

  return (
    <DashboardLayout pageTitle="Budget">
      <div className="mx-auto max-w-6xl space-y-8 pb-16">
        {/* Header */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <FileText className="h-3.5 w-3.5" /> From the adopted budget · every number links to its page
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">Where Revere's money goes</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
                Search any department, see how much it gets this year, how that compares to last year, and open the exact page in the city's budget document.
              </p>
            </div>
            {years.length > 1 && (
              <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1" role="tablist" aria-label="Fiscal year">
                {years.map((y) => (
                  <button key={y} role="tab" aria-selected={y === year} onClick={() => { setYear(y); setOpen(null); }}
                    className={cn("relative rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", y === year ? "text-white" : "text-slate-400 hover:text-slate-200")}>
                    {y === year && <motion.span layoutId="fy" className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/15" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <span className="relative">FY{y}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">Budget data couldn't be loaded right now. Please try again shortly.</p>}

        {/* Summary */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {!rows && !error && [0, 1, 2, 3].map((i) => <div key={i} className="h-[120px] rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="skeleton mb-3 h-3 w-24" /><div className="skeleton h-8 w-32" /></div>)}
          {rows && (
            <>
              {school ? (
                <Stat i={0} label="Schools" value={money(school.amount)} sub={<Delta a={school.amount} b={school.prior} suffix={`vs FY${year - 1}`} />}
                  href={`${school.url}#page=${school.page}`} page={school.page} />
              ) : (
                <Stat i={0} label="Schools" value="—" sub={<span>Not broken out in this document</span>} />
              )}
              <Stat i={1} label={`${yearRows.length} city departments`} value={money(total)} sub={<Delta a={total} b={totalPrior} suffix={`vs FY${year - 1}`} />}
                note="Sum of the department pages below" />
              {biggestUp && (
                <Stat i={2} label="Biggest increase" value={`+${money(biggestUp.recommended - biggestUp.prior_adopted!)}`}
                  sub={<span className="text-slate-300">{tidy(biggestUp.name)}</span>} href={`${biggestUp.source_url}#page=${biggestUp.page}`} page={biggestUp.page} />
              )}
              {biggestDown && biggestDown.recommended < (biggestDown.prior_adopted ?? 0) && (
                <Stat i={3} label="Biggest cut" value={`−${money(biggestDown.prior_adopted! - biggestDown.recommended)}`}
                  sub={<span className="text-slate-300">{tidy(biggestDown.name)}</span>} href={`${biggestDown.source_url}#page=${biggestDown.page}`} page={biggestDown.page} />
              )}
            </>
          )}
        </section>

        {/* Controls */}
        {rows && (
          <section className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <span className="sr-only">Search departments</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — police, library, snow, water…"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-10 pr-4 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-highlight/60 focus:ring-2 focus:ring-highlight/30" />
              </label>
              <Segmented<Filter> value={filter} onChange={setFilter} options={[["all", "All"], ["up", "Increases"], ["down", "Cuts"]] as [Filter, string][]} id="filter" />
              <Segmented<Sort> value={sort} onChange={setSort} options={[["amount", "Largest"], ["change", "Change"], ["name", "A–Z"]] as [Sort, string][]} id="sort" />
            </div>
            {doc && (
              <p className="text-xs text-slate-400">
                {list.length} of {yearRows.length} departments · source:{" "}
                <a href={doc.source_url} target="_blank" rel="noreferrer" className="text-highlight hover:underline">{doc.doc_title} (PDF) ↗</a>
              </p>
            )}
          </section>
        )}

        {/* Department list */}
        {rows && (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="hidden grid-cols-[1fr_120px_110px_88px] gap-4 border-b border-white/10 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:grid">
              <span>Department</span><span className="text-right">FY{year}</span><span className="text-right">vs FY{year - 1}</span><span className="text-right">Source</span>
            </div>
            <motion.ul layout className="divide-y divide-white/[0.06]">
              <AnimatePresence initial={false}>
                {list.map((r, i) => {
                  const key = `${r.doc_id}-${r.code}-${r.name}`;
                  const isOpen = open === key;
                  const ch = pct(r.recommended, r.prior_adopted);
                  const split = r.payroll != null && r.non_payroll != null && Math.abs(r.payroll + r.non_payroll - r.recommended) / r.recommended < 0.01;
                  return (
                    <motion.li key={key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.015 }}>
                      <button onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}
                        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04] md:grid-cols-[1fr_120px_110px_88px]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                            <span className="truncate font-medium text-white">{tidy(r.name)}</span>
                            {r.code && <span className="hidden shrink-0 font-mono text-[11px] text-slate-500 sm:inline">#{r.code}</span>}
                          </div>
                          <div className="relative ml-6 mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            {r.prior_adopted != null && <div className="absolute inset-y-0 left-0 rounded-full bg-white/15" style={{ width: `${(r.prior_adopted / max) * 100}%` }} />}
                            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-highlight to-emerald-400"
                              initial={{ width: 0 }} animate={{ width: `${(r.recommended / max) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                          </div>
                        </div>
                        <span className="text-right font-display text-base font-semibold tabular-nums text-white">{money(r.recommended, 2)}</span>
                        <span className="col-start-2 text-right md:col-start-auto">{ch != null ? <Delta a={r.recommended} b={r.prior_adopted!} /> : <span className="text-xs text-slate-500">new</span>}</span>
                        <a href={`${r.source_url}#page=${r.page}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                          className="hidden items-center justify-end gap-1 text-xs text-slate-400 hover:text-highlight md:flex">
                          p. {r.page} <ExternalLink className="h-3 w-3" />
                        </a>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="overflow-hidden">
                            <div className="grid gap-4 px-5 pb-5 pl-11 md:grid-cols-[1fr_auto]">
                              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                                <Fact k={`FY${year} adopted`} v={full(r.recommended)} />
                                <Fact k={`FY${year - 1} adopted`} v={r.prior_adopted != null ? full(r.prior_adopted) : "—"} />
                                <Fact k="Department asked for" v={r.dept_request != null ? full(r.dept_request) : "—"} />
                                <Fact k="Change" v={r.prior_adopted != null ? `${r.recommended >= r.prior_adopted ? "+" : "−"}${full(Math.abs(r.recommended - r.prior_adopted))}` : "—"} />
                                {split && (
                                  <div className="col-span-2 sm:col-span-4">
                                    <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                                      <span>Salaries & wages {money(r.payroll!)}</span><span>Everything else {money(r.non_payroll!)}</span>
                                    </div>
                                    <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                      <div className="bg-highlight" style={{ width: `${(r.payroll! / r.recommended) * 100}%` }} />
                                      <div className="bg-amber-400/80" style={{ width: `${(r.non_payroll! / r.recommended) * 100}%` }} />
                                    </div>
                                  </div>
                                )}
                              </dl>
                              <div className="flex flex-wrap items-start gap-2 md:flex-col md:items-stretch">
                                <button onClick={() => ask(`What is the ${tidy(r.name)} budget for FY${year} and what changed?`)}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-highlight px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
                                  <Sparkles className="h-4 w-4" /> Ask about this
                                </button>
                                <a href={`${r.source_url}#page=${r.page}`} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5">
                                  Open page {r.page} <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
            {!list.length && (
              <div className="p-10 text-center text-sm text-slate-400">
                No department matches “{q}”.{" "}
                <button onClick={() => ask(`Where in the FY${year} budget is ${q}?`)} className="font-semibold text-highlight hover:underline">Ask Revere instead →</button>
              </div>
            )}
          </section>
        )}

        <p className="text-xs leading-relaxed text-slate-500">
          Amounts are the adopted appropriations printed on each department's page. Grey bars show last year's amount for comparison.
          Revenue, state assessments and school spending details live in other sections of the same document. Spot something wrong? Open the cited page and compare.
        </p>
      </div>
    </DashboardLayout>
  );
}

function Stat({ i, label, value, sub, href, page, note }: { i: number; label: string; value: string; sub: React.ReactNode; href?: string; page?: number; note?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 26 }}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="mt-2 font-display text-3xl font-semibold tabular-nums text-white">{value}</span>
      <span className="mt-1 text-xs">{sub}</span>
      <span className="mt-auto pt-2 text-[11px] text-slate-500">
        {href ? <a href={href} target="_blank" rel="noreferrer" className="hover:text-highlight">Budget p. {page} ↗</a> : note}
      </span>
    </motion.div>
  );
}

function Delta({ a, b, suffix }: { a: number; b: number; suffix?: string }) {
  const p = pct(a, b);
  if (p == null) return null;
  if (Math.abs(p) < 0.05) return <span className="text-xs text-slate-400">unchanged{suffix ? ` ${suffix}` : ""}</span>;
  const up = p > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums", up ? "text-amber-300" : "text-emerald-300")}>
      <Icon className="h-3.5 w-3.5" />{Math.abs(p).toFixed(1)}%{suffix && <span className="ml-1 font-normal text-slate-400">{suffix}</span>}
    </span>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-slate-100">{v}</dd>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: [T, string][]; id: string }) {
  return (
    <div className="flex shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-1">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={v === value}
          className={cn("relative rounded-lg px-3 py-2 text-sm font-medium transition-colors", v === value ? "text-white" : "text-slate-400 hover:text-slate-200")}>
          {v === value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/15" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  );
}
