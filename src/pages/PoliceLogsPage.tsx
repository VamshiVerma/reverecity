import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Search, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { catLabel, catTone, plainAction, plainReason, street, time12, CATEGORY } from "@/lib/plain";
import { cn } from "@/lib/utils";

// Only public, non-identifying fields are read: no addresses, names or raw log text.
type Call = { call_number: string; log_date: string; time_24h: string; call_reason: string; action: string; call_type_category: string; location_street: string | null };
type Stats = { total: number; by_category: { k: string; n: number }[]; by_street: { k: string; n: number }[]; by_hour: { k: string; n: number }[]; by_day: { k: string; n: number }[]; sources: string[] };
type Range = "week" | "month" | "year";

const RANGES: { id: Range; label: string; days: number }[] = [
  { id: "week", label: "Latest week", days: 7 },
  { id: "month", label: "30 days", days: 30 },
  { id: "year", label: "This year", days: 0 },
];
const PAGE = 60;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(new Date(s + "T12:00:00").getTime() + n * 864e5));
const fmtDay = (s: string, long = false) => new Date(s + "T12:00:00").toLocaleDateString("en-US", long ? { weekday: "long", month: "long", day: "numeric" } : { month: "short", day: "numeric" });
const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));

export default function PoliceLogsPage() {
  const reduce = useReducedMotion();
  const [latest, setLatest] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("week");
  const [streetSel, setStreetSel] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [prev, setPrev] = useState<number | null>(null);
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    supabase.from("police_logs" as any).select("log_date").order("log_date", { ascending: false }).limit(1)
      .then(({ data }) => setLatest((data as any)?.[0]?.log_date ?? iso(new Date())));
  }, []);

  const win = useMemo(() => {
    if (!latest) return null;
    const r = RANGES.find((x) => x.id === range)!;
    const since = r.days ? addDays(latest, -(r.days - 1)) : `${latest.slice(0, 4)}-01-01`;
    const days = Math.round((new Date(latest).getTime() - new Date(since).getTime()) / 864e5) + 1;
    return { since, until: latest, days, prevSince: addDays(since, -days), prevUntil: addDays(since, -1) };
  }, [latest, range]);

  // Summary for the window, and the same-length stretch before it (an honest comparison).
  useEffect(() => {
    if (!win) return;
    const streets = streetSel ? [streetSel] : null;
    setStats(null); setPrev(null);
    supabase.rpc("police_stats" as any, { since: win.since, until: win.until, streets }).then(({ data }) => setStats(data as unknown as Stats));
    supabase.rpc("police_stats" as any, { since: win.prevSince, until: win.prevUntil, streets }).then(({ data }) => setPrev((data as any)?.total ?? null));
  }, [win, streetSel]);

  useEffect(() => setPage(0), [range, cat, streetSel, q]);

  // The log itself.
  useEffect(() => {
    if (!win) return;
    let qy = supabase.from("police_logs" as any)
      .select("call_number,log_date,time_24h,call_reason,action,call_type_category,location_street")
      .gte("log_date", win.since).lte("log_date", win.until)
      .order("log_date", { ascending: false }).order("time_24h", { ascending: false })
      .range(0, (page + 1) * PAGE);
    if (cat) qy = qy.eq("call_type_category", cat);
    if (streetSel) qy = qy.eq("location_street", streetSel);
    if (q.trim().length > 1) qy = qy.ilike("call_reason", `%${q.trim()}%`);
    const t = setTimeout(() => {
      qy.then(({ data }) => {
        const rows = (data as unknown as Call[]) || [];
        setMore(rows.length > (page + 1) * PAGE);
        setCalls(rows.slice(0, (page + 1) * PAGE));
      });
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [win, cat, streetSel, q, page]);

  // The log ends at 7 AM, so a trailing partial day is dropped from the chart.
  const days = useMemo(() => {
    const d = (stats?.by_day ?? []).slice().sort((a, b) => a.k.localeCompare(b.k));
    const sorted = d.map((x) => x.n).sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] || 0;
    return d.length > 3 && d[d.length - 1].n < med * 0.4 ? d.slice(0, -1) : d;
  }, [stats]);
  const byHour = useMemo(() => {
    const m = new Map((stats?.by_hour ?? []).map((h) => [Number(h.k), h.n]));
    return Array.from({ length: 24 }, (_, h) => m.get(h) ?? 0);
  }, [stats]);
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const change = stats && prev ? ((stats.total - prev) / prev) * 100 : null;
  const cats = (stats?.by_category ?? []).slice(0, 8);
  const catMax = Math.max(1, ...cats.map((c) => c.n));
  const streets = (stats?.by_street ?? []).slice(0, 8);
  const streetMax = Math.max(1, ...streets.map((s) => s.n));
  const dayMax = Math.max(1, ...days.map((d) => d.n));
  const hourMax = Math.max(1, ...byHour);

  const grouped = useMemo(() => {
    const g: { day: string; rows: Call[] }[] = [];
    for (const c of calls ?? []) {
      const last = g[g.length - 1];
      if (last && last.day === c.log_date) last.rows.push(c); else g.push({ day: c.log_date, rows: [c] });
    }
    return g;
  }, [calls]);

  return (
    <DashboardLayout pageTitle="Police log">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-full bg-card p-1" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.id} role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)}
                className={cn("relative h-10 flex-1 rounded-full px-4 text-[14px] font-medium transition-colors lg:flex-none", range === r.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {range === r.id && <motion.span layoutId="pl-range" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{r.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[13px] text-muted-foreground">
            {win ? <>{fmtDay(win.since)} to {fmtDay(win.until)} · the latest day in the department's posted log</> : "Loading…"}
          </p>
        </div>

        {streetSel && (
          <div className="flex items-center gap-2 text-[14px]">
            <span className="text-muted-foreground">Showing only</span>
            <button onClick={() => setStreetSel(null)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-highlight-secondary/15 px-3 font-medium text-highlight-secondary">
              {street(streetSel)} <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Calls" value={stats ? stats.total.toLocaleString("en-US") : null} accent
            note={change != null && win ? `${Math.abs(change).toFixed(0)}% ${change >= 0 ? "more" : "fewer"} than the ${win.days} days before` : " "} />
          <Figure label="Most common" small value={cats[0] ? catLabel(cats[0].k) : null} note={cats[0] ? `${cats[0].n} calls · ${Math.round((cats[0].n / (stats?.total || 1)) * 100)}% of all` : " "} />
          <Figure label="Busiest hour" value={stats ? `${peakHour % 12 || 12} ${peakHour < 12 ? "AM" : "PM"}` : null} note={stats ? `${byHour[peakHour]} calls started then` : " "} />
          <Figure label="Busiest street" small value={streets[0] ? street(streets[0].k) : null} note={streets[0] ? `${streets[0].n} calls` : " "} />
        </section>

        <section className="grid gap-3 lg:grid-cols-12">
          <Panel className="lg:col-span-7" title="Calls each day" sub="Hover or tap a bar for the count">
            <div className="flex h-[170px] items-end gap-[3px] md:gap-1.5">
              {days.map((d, i) => (
                <div key={d.k} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${fmtDay(d.k)}: ${d.n} calls`}>
                  <span className="figure mb-1 text-center text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">{d.n}</span>
                  <motion.div className={cn("w-full rounded-t-[6px]", i === days.length - 1 ? "bg-highlight-secondary" : "bg-highlight/80 group-hover:bg-highlight")}
                    initial={reduce ? false : { height: 0 }} animate={{ height: `${(d.n / dayMax) * 100}%` }} transition={{ delay: Math.min(i, 30) * 0.015, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              ))}
              {!stats && <div className="skeleton h-full w-full" />}
            </div>
            {days.length <= 14 ? (
              <div className="mt-2 flex gap-[3px] text-center text-[12px] text-muted-foreground md:gap-1.5">
                {days.map((d) => <span key={d.k} className="min-w-0 flex-1 truncate">{new Date(d.k + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}</span>)}
              </div>
            ) : (
              <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
                <span>{days[0] ? fmtDay(days[0].k) : ""}</span><span>{days.length ? fmtDay(days[days.length - 1].k) : ""}</span>
              </div>
            )}
          </Panel>

          <Panel className="lg:col-span-5" title="What people called about" sub="Tap one to filter the log below">
            <div className="space-y-1">
              {cats.map((c, i) => (
                <button key={c.k} onClick={() => setCat(cat === c.k ? null : c.k)} className={cn("grid w-full grid-cols-[1fr_auto] items-center gap-x-3 rounded-xl px-2 py-1.5 text-left transition-colors", cat === c.k ? "bg-secondary" : "hover:bg-secondary/60")}>
                  <span className="flex min-w-0 items-center gap-2 text-[14px] text-foreground"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: catTone(c.k) }} /><span className="truncate">{catLabel(c.k)}</span></span>
                  <span className="figure text-[14px] text-foreground">{c.n}</span>
                  <div className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div className="h-full rounded-full" style={{ background: catTone(c.k) }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(c.n / catMax) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6 }} />
                  </div>
                </button>
              ))}
              {!stats && <div className="skeleton h-40" />}
            </div>
          </Panel>

          <Panel className="lg:col-span-7" title="When calls come in" sub="By the hour each call started. Darker bars are nighttime; orange is the busiest hour.">
            <div className="flex h-[190px] items-end gap-[2px] md:gap-1">
              {byHour.map((n, h) => (
                <div key={h} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${hourLabel(h)}: ${n} calls`}>
                  <span className="figure mb-1 text-center text-[10.5px] text-muted-foreground opacity-0 transition group-hover:opacity-100">{n}</span>
                  <motion.div className={cn("w-full rounded-t-[5px]", h === peakHour ? "bg-highlight-secondary" : (h >= 6 && h < 18) ? "bg-highlight/75" : "bg-highlight/40")}
                    initial={reduce ? false : { height: 0 }} animate={{ height: `${Math.max(3, (n / hourMax) * 100)}%` }} transition={{ delay: h * 0.02, duration: 0.6 }} />
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 text-[12px] text-muted-foreground"><span>Midnight</span><span className="text-center">6 AM</span><span className="text-center">Noon</span><span className="text-right">6 PM</span></div>
          </Panel>

          <Panel className="lg:col-span-5" title="Where" sub="Tap a street to see only its calls">
            <div className="space-y-1.5">
              {streets.map((s) => (
                <button key={s.k} onClick={() => setStreetSel(streetSel === s.k ? null : s.k)} className={cn("relative flex h-9 w-full items-center justify-between overflow-hidden rounded-xl px-3 text-left text-[14px] transition-colors", streetSel === s.k ? "ring-2 ring-highlight-secondary" : "hover:bg-secondary/60")}>
                  <motion.span className="absolute inset-y-0 left-0 rounded-xl bg-highlight/20" initial={reduce ? false : { width: 0 }} animate={{ width: `${(s.n / streetMax) * 100}%` }} transition={{ duration: 0.6 }} />
                  <span className="relative truncate text-foreground">{street(s.k)}</span>
                  <span className="figure relative text-foreground">{s.n}</span>
                </button>
              ))}
              {!stats && <div className="skeleton h-40" />}
            </div>
          </Panel>
        </section>

        <section className="rounded-[24px] bg-card p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Every call{cat ? `: ${catLabel(cat).toLowerCase()}` : ""}</h2>
              <p className="text-[13px] text-muted-foreground">Newest first. Times are when the call came in.</p>
            </div>
            <div className="flex gap-2">
              <label className="relative flex-1 md:w-72 md:flex-none">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <span className="sr-only">Search calls</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: noise, theft, crash…"
                  className="h-11 w-full rounded-full bg-background pl-10 pr-4 text-[15px] text-foreground outline-none ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
              </label>
              {(cat || q) && <button onClick={() => { setCat(null); setQ(""); }} className="h-11 rounded-full bg-secondary px-4 text-[14px] text-foreground">Clear</button>}
            </div>
          </div>

          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {Object.keys(CATEGORY).filter((k) => k !== "OTHER").map((k) => (
              <button key={k} onClick={() => setCat(cat === k ? null : k)}
                className={cn("flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] transition-colors", cat === k ? "bg-primary text-primary-foreground" : "bg-background text-foreground ring-1 ring-border hover:bg-secondary")}>
                <span className="h-2 w-2 rounded-full" style={{ background: catTone(k) }} />{catLabel(k)}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-6">
            {grouped.map((g, gi) => (
              <div key={g.day}>
                <h3 className="sticky top-[88px] z-[1] -mx-1 bg-card/95 px-1 py-1.5 text-[14px] font-semibold text-foreground backdrop-blur md:top-[40px]">
                  {fmtDay(g.day, true)} <span className="font-normal text-muted-foreground">· {g.rows.length}{more && gi === grouped.length - 1 ? "+" : ""} calls</span>
                </h3>
                <ul className="mt-1 divide-y divide-border">
                  {g.rows.map((c) => (
                    <li key={c.call_number} className="grid grid-cols-[64px_1fr] gap-3 py-3 md:grid-cols-[84px_1fr_auto] md:items-center">
                      <span className="figure pt-0.5 text-[14px] text-muted-foreground md:pt-0">{time12(c.time_24h)}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: catTone(c.call_type_category) }} />
                          <span className="truncate text-[15px] font-medium text-foreground">{plainReason(c.call_reason)}</span>
                        </div>
                        <div className="mt-0.5 text-[13px] text-muted-foreground">
                          {c.location_street ? <button onClick={() => setStreetSel(c.location_street)} className="hover:text-foreground hover:underline">{street(c.location_street)}</button> : "Location not listed"}
                          <span className="md:hidden"> · {plainAction(c.action)}</span>
                        </div>
                      </div>
                      <span className="hidden rounded-full bg-secondary px-3 py-1 text-[12.5px] text-foreground md:inline-block">{plainAction(c.action)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {calls && !calls.length && <p className="py-10 text-center text-[15px] text-muted-foreground">No calls match. <button className="font-medium text-foreground underline" onClick={() => { setCat(null); setQ(""); setStreetSel(null); }}>Clear filters</button></p>}
            {!calls && <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14" />)}</div>}
          </div>
          {more && <button onClick={() => setPage((p) => p + 1)} className="mt-4 h-12 w-full rounded-full bg-secondary text-[15px] font-medium text-foreground transition-colors hover:bg-accent">Show more calls</button>}
        </section>

        <section className="flex flex-col gap-3 rounded-[24px] bg-card p-4 text-[14px] md:flex-row md:items-center md:justify-between md:p-6">
          <div className="max-w-[720px] text-muted-foreground">
            From the Revere Police Department's public dispatch log. It lists calls officers responded to, not confirmed crimes. Street names only; no personal details are shown.
            <span className="mt-2 flex flex-wrap gap-2">
              {(stats?.sources ?? []).map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[13px] text-foreground hover:bg-accent">
                  Log {decodeURIComponent(u.split("/").pop() || "").replace(/-redacted\.pdf$/i, "").replace(/-0000|-0700|-7am/gi, "").replace(/-to-/, " to ").replace(/-/g, "/")} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </span>
          </div>
          <button onClick={() => ask(streetSel ? `What's been happening on ${street(streetSel)} lately?` : "What were the most serious police calls this week?")}
            className="h-11 shrink-0 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground">Ask about this</button>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Figure({ label, value, note, accent, small }: { label: string; value: string | null; note: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="flex min-h-[124px] flex-col rounded-[24px] bg-card p-4 md:p-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {value == null ? <span className="skeleton mt-2 h-8 w-24" /> :
        <span className={cn("figure mt-1 leading-tight", small ? "text-[20px] md:text-[26px]" : "text-[34px] md:text-[42px]", accent ? "text-highlight-secondary" : "text-foreground")}>{value}</span>}
      <span className="mt-auto pt-2 text-[12.5px] leading-snug text-muted-foreground">{note}</span>
    </div>
  );
}

function Panel({ title, sub, className, children }: { title: string; sub?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-[24px] bg-card p-4 md:p-6", className)}>
      <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
      {sub && <p className="mb-4 text-[13px] text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}
