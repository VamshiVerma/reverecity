import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { catLabel, catTone } from "@/lib/plain";
import { cn } from "@/lib/utils";

// Built only from the Revere PD public dispatch log. It lists calls officers responded to, not confirmed crimes.
type Day = { log_date: string; calls: number };
type Stats = { total: number; by_category: { k: string; n: number }[] };
const SERIOUS = ["VIOLENCE_THREATS", "DOMESTIC", "THEFT_PROPERTY"];
const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (s: string, n: number) => iso(new Date(new Date(s + "T12:00:00").getTime() + n * 864e5));
const fmt = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const monthName = (ym: string) => new Date(ym + "-15T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });

export default function CrimePage() {
  const reduce = useReducedMotion();
  const [days, setDays] = useState<Day[] | null>(null);
  const [cur, setCur] = useState<Stats | null>(null);
  const [prev, setPrev] = useState<Stats | null>(null);
  const [arrests, setArrests] = useState<[number, number] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    supabase.rpc("police_daily" as any).then(({ data, error }) => {
      if (error) { setErr(true); return; }
      setDays(((data as any[]) || []).map((d) => ({ log_date: String(d.log_date).slice(0, 10), calls: Number(d.calls) })).sort((a, b) => a.log_date.localeCompare(b.log_date)));
    });
  }, []);

  // Two equal windows that the log actually covers, ending at the latest posted day.
  const win = useMemo(() => {
    if (!days?.length) return null;
    const have = new Set(days.map((d) => d.log_date));
    const latest = days[days.length - 1].log_date;
    let covered = 0;
    for (let i = 0, miss = 0; i < 120; i++) { if (have.has(shift(latest, -i))) { covered = i + 1; miss = 0; } else if (++miss > 2) break; }
    const w = Math.max(7, Math.min(28, Math.floor(covered / 2)));
    return { w, latest, since: shift(latest, -(w - 1)), prevSince: shift(latest, -(2 * w - 1)), prevUntil: shift(latest, -w) };
  }, [days]);

  useEffect(() => {
    if (!win) return;
    const head = (a: string, b: string) => supabase.from("police_logs" as any).select("*", { count: "exact", head: true }).eq("action_category", "ARREST").gte("log_date", a).lte("log_date", b);
    Promise.all([
      supabase.rpc("police_stats" as any, { since: win.since, until: win.latest, streets: null }),
      supabase.rpc("police_stats" as any, { since: win.prevSince, until: win.prevUntil, streets: null }),
      head(win.since, win.latest), head(win.prevSince, win.prevUntil),
    ]).then(([c, p, a1, a0]) => {
      setCur(c.data as unknown as Stats); setPrev(p.data as unknown as Stats);
      setArrests([a1.count ?? 0, a0.count ?? 0]);
    }).catch(() => setErr(true));
  }, [win]);

  // Month by month, with how many days of each month the log covers.
  const months = useMemo(() => {
    const m = new Map<string, { calls: number; days: number }>();
    for (const d of days ?? []) { const k = d.log_date.slice(0, 7); const x = m.get(k) ?? { calls: 0, days: 0 }; x.calls += d.calls; x.days += 1; m.set(k, x); }
    return [...m.entries()].map(([k, v]) => {
      const inMonth = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 0).getDate();
      return { k, calls: v.calls, days: v.days, perDay: v.calls / v.days, partial: v.days < inMonth * 0.8 };
    }).slice(-14);
  }, [days]);
  const perDayMax = Math.max(1, ...months.map((m) => m.perDay));

  const serious = (s: Stats | null) => (s?.by_category ?? []).filter((c) => SERIOUS.includes(c.k)).reduce((a, c) => a + c.n, 0);
  const sNow = serious(cur), sPrev = serious(prev);
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  const change = cur && prev ? pct(cur.total, prev.total) : null;

  const moves = useMemo(() => {
    const p = new Map((prev?.by_category ?? []).map((c) => [c.k, c.n]));
    return (cur?.by_category ?? []).map((c) => ({ k: c.k, now: c.n, before: p.get(c.k) ?? 0 }))
      .filter((x) => x.now + x.before >= 8 && x.k !== "OTHER").map((x) => ({ ...x, diff: x.now - x.before })).sort((a, b) => b.diff - a.diff);
  }, [cur, prev]);
  const moveMax = Math.max(1, ...moves.map((m) => Math.abs(m.diff)));

  const mix = useMemo(() => {
    const total = cur?.total || 1;
    const groups = [
      { label: "Serious: violence, domestic, theft", n: sNow, tone: "#FC734D" },
      { label: "Crashes & traffic", n: (cur?.by_category ?? []).filter((c) => c.k === "CRASH" || c.k === "TRAFFIC").reduce((a, c) => a + c.n, 0), tone: "#0297DE" },
      { label: "Medical, help & 911 calls", n: (cur?.by_category ?? []).filter((c) => ["MEDICAL", "ASSIST_SERVICE", "EMERGENCY_CALL", "MISSING_PERSON", "FIRE_ALARM"].includes(c.k)).reduce((a, c) => a + c.n, 0), tone: "#5cc6ff" },
    ];
    const rest = total - groups.reduce((a, g) => a + g.n, 0);
    return [...groups, { label: "Disturbances, suspicious & other", n: Math.max(0, rest), tone: "#4b5a66" }].map((g) => ({ ...g, share: g.n / total }));
  }, [cur, sNow]);

  const loading = !cur || !prev || !win;

  return (
    <DashboardLayout pageTitle="Safety overview">
      <div className="mx-auto max-w-[1280px] space-y-4">
        {err && <p className="rounded-[24px] bg-card p-5 text-[15px] text-muted-foreground">The police log couldn't be loaded right now. Please try again shortly.</p>}

        <p className="text-[14px] text-muted-foreground">
          {win ? <>Comparing the latest {win.w} days of the posted log ({fmt(win.since)}–{fmt(win.latest)}) with the {win.w} days before ({fmt(win.prevSince)}–{fmt(win.prevUntil)}).</> : "Loading the police log…"}
        </p>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="All police calls" value={cur ? cur.total.toLocaleString("en-US") : null} note={change != null ? `${Math.abs(change).toFixed(0)}% ${change >= 0 ? "more" : "fewer"} than before` : " "} accent />
          <Figure label="Serious calls" value={cur ? sNow.toLocaleString("en-US") : null} note={cur && prev ? `Violence, domestic, theft · ${sPrev ? `${Math.abs(pct(sNow, sPrev)).toFixed(0)}% ${sNow >= sPrev ? "more" : "fewer"}` : "no earlier data"}` : " "} />
          <Figure label="Share that were serious" value={cur ? `${Math.round((sNow / (cur.total || 1)) * 100)}%` : null} note="Most calls are traffic, help requests and medical" />
          <Figure label="Arrests" value={arrests ? String(arrests[0]) : null} note={arrests ? `${arrests[1]} in the ${win?.w} days before` : " "} />
        </section>

        <section className="grid gap-3 lg:grid-cols-12">
          <Panel className="lg:col-span-7" title="Is it getting busier?" sub="Average police calls per day, month by month. Lighter bars are months the posted log only partly covers.">
            <div className="flex h-[190px] items-end gap-1.5">
              {months.map((m, i) => (
                <div key={m.k} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${monthName(m.k)}: ${Math.round(m.perDay)} a day over ${m.days} logged days`}>
                  <span className="figure mb-1 text-center text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">{Math.round(m.perDay)}</span>
                  <motion.div className={cn("w-full rounded-t-[6px]", i === months.length - 1 ? "bg-highlight-secondary" : "bg-highlight", m.partial && "opacity-45")}
                    initial={reduce ? false : { height: 0 }} animate={{ height: `${(m.perDay / perDayMax) * 100}%` }} transition={{ delay: i * 0.03, duration: 0.6 }} />
                  <span className="mt-2 truncate text-center text-[11px] text-muted-foreground">{monthName(m.k)}</span>
                </div>
              ))}
              {!days && <div className="skeleton h-full w-full" />}
            </div>
            {months.length > 1 && (() => {
              const last = months[months.length - 1], earlier = months.slice(0, -1);
              const avg = earlier.reduce((a, m) => a + m.calls, 0) / Math.max(1, earlier.reduce((a, m) => a + m.days, 0));
              const d = ((last.perDay - avg) / avg) * 100;
              return <p className="mt-3 text-[14px] text-foreground">{monthName(last.k)} averages <b className="font-semibold">{Math.round(last.perDay)} calls a day</b>, {Math.abs(d) < 5 ? "about the same as" : d > 0 ? `${Math.round(d)}% more than` : `${Math.round(Math.abs(d))}% fewer than`} the earlier months in the log ({Math.round(avg)} a day).</p>;
            })()}
            <p className="mt-1 text-[13px] text-muted-foreground">The department posts its log in batches and older batches are missing, so only some months appear. Daily averages keep partial months comparable.</p>
          </Panel>

          <Panel className="lg:col-span-5" title="What the calls were" sub={win ? `${fmt(win.since)}–${fmt(win.latest)}` : ""}>
            <div className="flex h-4 overflow-hidden rounded-full">
              {mix.map((g, i) => (
                <motion.div key={g.label} style={{ background: g.tone }} initial={reduce ? false : { width: 0 }} animate={{ width: `${g.share * 100}%` }} transition={{ delay: i * 0.08, duration: 0.6 }} />
              ))}
            </div>
            <ul className="mt-4 space-y-2.5">
              {mix.map((g) => (
                <li key={g.label} className="flex items-center gap-3 text-[14px]">
                  <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: g.tone }} />
                  <span className="min-w-0 flex-1 text-foreground">{g.label}</span>
                  <span className="figure text-foreground">{loading ? "…" : g.n}</span>
                  <span className="w-10 text-right text-[13px] text-muted-foreground">{loading ? "" : `${Math.round(g.share * 100)}%`}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="lg:col-span-12" title="What's rising and what's falling" sub={win ? `Calls by type, latest ${win.w} days compared with the ${win.w} days before` : ""}>
            <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
              {([["Went up", moves.filter((m) => m.diff > 0)], ["Went down", moves.filter((m) => m.diff < 0).reverse()]] as const).map(([title, list]) => (
                <div key={title}>
                  <h3 className="mb-2 text-[14px] font-semibold text-foreground">{title}</h3>
                  {list.map((m, i) => (
                    <div key={m.k} className="grid grid-cols-[minmax(0,1fr)_minmax(60px,140px)_56px] items-center gap-3 py-1.5 text-[14px]">
                      <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: catTone(m.k) }} /><span className="truncate text-foreground">{catLabel(m.k)}</span></span>
                      <div className="h-2.5 rounded-full bg-secondary">
                        <motion.div className={cn("h-full rounded-full", m.diff > 0 ? "bg-highlight-secondary" : "bg-highlight")}
                          initial={reduce ? false : { width: 0 }} animate={{ width: `${(Math.abs(m.diff) / moveMax) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6 }} />
                      </div>
                      <span className="figure text-right text-muted-foreground"><span className={m.diff > 0 ? "text-highlight-secondary" : "text-highlight"}>{m.diff > 0 ? "+" : "−"}{Math.abs(m.diff)}</span></span>
                    </div>
                  ))}
                  {!loading && !list.length && <p className="text-[14px] text-muted-foreground">Nothing changed by much.</p>}
                </div>
              ))}
              {loading && <div className="skeleton h-32 md:col-span-2" />}
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">Changes in number of calls. Short windows swing a lot, so treat small changes as noise.</p>
          </Panel>
        </section>

        <section className="flex flex-col gap-3 rounded-[24px] bg-card p-5 text-[14px] md:flex-row md:items-center md:justify-between md:p-6">
          <p className="max-w-[760px] text-muted-foreground">
            Everything here comes from the Revere Police Department's public dispatch log. It records calls officers responded to, including traffic stops and requests for help, so it is not a count of crimes. For each individual call, street by street, see the <Link to="/police-logs" className="font-medium text-foreground underline underline-offset-4">police log</Link>.
          </p>
          <button onClick={() => ask("Is crime going up in Revere?")} className="h-11 shrink-0 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground">Ask about this</button>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Figure({ label, value, note, accent }: { label: string; value: string | null; note: string; accent?: boolean }) {
  return (
    <div className="flex min-h-[124px] flex-col rounded-[24px] bg-card p-4 md:p-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {value == null ? <span className="skeleton mt-2 h-8 w-24" /> : <span className={cn("figure mt-1 text-[34px] leading-tight md:text-[42px]", accent ? "text-highlight-secondary" : "text-foreground")}>{value}</span>}
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
