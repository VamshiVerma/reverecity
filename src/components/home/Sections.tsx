import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PulseItem } from "@/lib/cityApi";
import { cn } from "@/lib/utils";

const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));
const money = (n: number, d = 1) => (n >= 1e6 ? `$${(n / 1e6).toFixed(d)}M` : `$${Math.round(n / 1e3)}K`);
const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()).replace("Assist service", "Help & service calls").replace("Emergency call", "911 & emergency");
const inView = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } as const;

function Heading({ kicker, title, to, cta }: { kicker: string; title: React.ReactNode; to?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[13px] text-muted-foreground">{kicker}</p>
        <h2 className="mt-1 font-serif-display text-[30px] leading-[1.05] text-foreground md:text-[38px]">{title}</h2>
      </div>
      {to && <Link to={to} className="group flex shrink-0 items-center gap-1 text-[14px] font-medium text-foreground">{cta ?? "Open"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>}
    </div>
  );
}

/* ---------------- Police: the week as a chart, the notable calls as a timeline ---------------- */
type Police = { calls7d: number; prev7d: number; since: string; through: string; daily: { d: string; n: number }[]; byCat?: { k: string; n: number }[] } | null | undefined;

export function PoliceWeek({ police, wow, calls }: { police: Police; wow: number | null; calls: PulseItem[] }) {
  const reduce = useReducedMotion();
  const days = police?.daily ?? [];
  const max = Math.max(1, ...days.map((d) => d.n));
  const cats = (police?.byCat ?? []).filter((c) => c.k !== "OTHER").slice(0, 5);
  const catTotal = cats.reduce((a, c) => a + c.n, 0) || 1;
  const shades = ["bg-highlight-secondary", "bg-highlight", "bg-foreground/70", "bg-foreground/40", "bg-foreground/20"];

  return (
    <motion.section {...inView} className="rounded-[28px] bg-card p-5 md:p-7 lg:col-span-7">
      <Heading kicker={police ? `Revere PD public log · ${fmtDay(police.since)} to ${fmtDay(police.through)}` : "Revere PD public log"}
        title={<>{police ? police.calls7d.toLocaleString("en-US") : "—"} police calls <em className="italic text-muted-foreground">this week</em></>} to="/police-logs" cta="Full log" />
      {wow != null && <p className="mt-2 text-[15px] text-foreground/85">{Math.abs(wow).toFixed(0)}% {wow > 0 ? "more" : "fewer"} than the week before. Most were traffic stops and requests for help, not crimes.</p>}

      <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
        {/* Calls per day */}
        <div>
          <div className="flex h-[150px] items-end gap-2">
            {days.map((d, i) => (
              <div key={d.d} className="group flex h-full flex-1 flex-col justify-end">
                <span className="tnum mb-1 text-center text-[12px] text-muted-foreground opacity-0 transition group-hover:opacity-100">{d.n}</span>
                <motion.div className={cn("w-full rounded-t-[8px] rounded-b-[3px]", i === days.length - 1 ? "bg-highlight-secondary" : "bg-highlight/80")}
                  initial={reduce ? false : { height: 0 }} whileInView={{ height: `${(d.n / max) * 100}%` }} viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                <span className="mt-2 text-center text-[12px] text-muted-foreground">{new Date(d.d + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}</span>
              </div>
            ))}
            {!days.length && <div className="skeleton h-full w-full" />}
          </div>
          {/* What the calls were */}
          <div className="mt-5 flex h-3 overflow-hidden rounded-full">
            {cats.map((c, i) => (
              <motion.div key={c.k} className={shades[i]} initial={reduce ? false : { width: 0 }} whileInView={{ width: `${(c.n / catTotal) * 100}%` }} viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.7 }} title={`${pretty(c.k)}: ${c.n}`} />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            {cats.map((c, i) => (
              <li key={c.k} className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", shades[i])} /><span className="truncate text-foreground/85">{pretty(c.k)}</span><span className="tnum ml-auto text-muted-foreground">{c.n}</span></li>
            ))}
          </ul>
        </div>

        {/* Timeline of notable calls */}
        <ol className="relative space-y-4 border-l border-border pl-5">
          {calls.slice(0, 5).map((c, i) => {
            const [what, ...rest] = c.text.split(" · ");
            const when = rest.pop();
            return (
              <motion.li key={c.id} initial={reduce ? false : { opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.07 }} className="relative">
                <span className={cn("absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card", c.tag === "Public safety" || c.tag === "Arrest" ? "bg-highlight-secondary" : "bg-highlight")} />
                <p className="text-[12px] text-muted-foreground">{when}</p>
                <p className="text-[15px] leading-snug text-foreground">{what}</p>
                {rest.length > 0 && <p className="text-[13px] text-muted-foreground">{rest.join(" · ")}</p>}
              </motion.li>
            );
          })}
          {!calls.length && <li className="text-[14px] text-muted-foreground">Loading the latest calls…</li>}
        </ol>
      </div>
    </motion.section>
  );
}

/* ---------------- Weather: a field coloured by the sky right now ---------------- */
type Weather = { temp: number; feels: number; conditions: string; hi: number; lo: number; alerts: string[]; days?: { date: string; hi: number; lo: number; conditions: string; precipprob: number }[] } | null;

function sky(cond: string) {
  const c = cond.toLowerCase(), h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  if (h < 6 || h >= 19) return { bg: "#0b1b33", glow: "hsl(230 70% 60% / .35)" };
  if (/rain|drizzle|storm|snow/.test(c)) return { bg: "#26394d", glow: "hsl(205 40% 70% / .3)" };
  if (/overcast|cloud|fog/.test(c)) return { bg: "#3a4d60", glow: "hsl(200 30% 80% / .35)" };
  return { bg: "#0a6fb8", glow: "hsl(40 100% 70% / .55)" };
}

export function WeatherField({ w }: { w: Weather }) {
  const reduce = useReducedMotion();
  const sk = sky(w?.conditions ?? "");
  const days = (w?.days ?? []).slice(1, 5);
  const lo = Math.min(...days.map((d) => d.lo), w?.lo ?? 100), hi = Math.max(...days.map((d) => d.hi), w?.hi ?? 0);
  return (
    <motion.section {...inView} className="relative isolate flex flex-col overflow-hidden rounded-[28px] p-5 text-white md:p-7 lg:col-span-5" style={{ background: sk.bg }}>
      <motion.div aria-hidden className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full blur-2xl" style={{ background: sk.glow }}
        animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 7, repeat: Infinity }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-white/75">Revere weather</p>
          <div className="mt-1 font-serif-display text-[88px] leading-[0.85]">{w ? Math.round(w.temp) : "—"}°</div>
          <p className="mt-2 text-[16px]">{w?.conditions ?? "Loading"}{w ? ` · feels ${Math.round(w.feels)}°` : ""}</p>
        </div>
        <Link to="/weather" className="text-[14px] font-medium text-white/90 hover:text-white">Forecast →</Link>
      </div>
      {!!w?.alerts.length && <p className="mt-3 rounded-2xl bg-black/25 px-3 py-2 text-[14px] font-medium">⚠ {w.alerts.join(", ")}</p>}
      <ul className="mt-6 space-y-3">
        {days.map((d, i) => (
          <li key={d.date} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 text-[14px]">
            <span className="text-white/75">{new Date(d.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}</span>
            <div className="relative h-2 rounded-full bg-white/15">
              <motion.div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#9fd8ff] to-[#FC734D]"
                initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6 }}
                style={{ left: `${((d.lo - lo) / Math.max(1, hi - lo)) * 100}%`, right: `${100 - ((d.hi - lo) / Math.max(1, hi - lo)) * 100}%`, originX: 0 }} />
            </div>
            <span className="tnum w-[92px] text-right">{Math.round(d.lo)}° / <b className="font-semibold">{Math.round(d.hi)}°</b>{d.precipprob >= 40 && <span className="ml-1 text-[#9fd8ff]">☂</span>}</span>
          </li>
        ))}
      </ul>
      {days.length > 0 && (() => {
        const best = [...days].sort((a, b) => (b.hi - b.precipprob / 4) - (a.hi - a.precipprob / 4))[0];
        const wet = days.filter((d) => d.precipprob >= 40);
        return (
          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="text-[12px] text-white/70">Best beach day</p>
              <p className="mt-1 font-serif-display text-[26px] leading-none">{new Date(best.date + "T12:00").toLocaleDateString("en-US", { weekday: "long" })}</p>
              <p className="mt-1 text-[13px] text-white/80">{Math.round(best.hi)}°, {best.conditions.toLowerCase()}</p>
            </div>
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="text-[12px] text-white/70">Umbrella?</p>
              <p className="mt-1 font-serif-display text-[26px] leading-none">{wet.length ? "Yes" : "Not needed"}</p>
              <p className="mt-1 text-[13px] text-white/80">{wet.length ? `${wet.map((d) => new Date(d.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" })).join(", ")}: ${Math.max(...wet.map((d) => d.precipprob))}% chance` : "No rain likely in the next 4 days"}</p>
            </div>
          </div>
        );
      })()}
    </motion.section>
  );
}

/* ---------------- Money: the whole department budget as one bar ---------------- */
type Dept = { name: string; recommended: number; prior_adopted: number | null; page: number; source_url: string };
const tidy = (s: string) => s.replace(/^Dept\. of /i, "").replace(/ And /g, " and ").replace("Employee Benefits and Property & Casualty Insurance", "Employee benefits & insurance").replace("Public Works: ", "");
const SEG = ["#FC734D", "#0297DE", "#5cc6ff", "#f4a58a", "#2f7fb3", "#b9e3fb", "#8a9ba8"];

export function MoneyBar({ depts, school }: { depts: Dept[]; school: { amount: number; page: number; url: string } | null }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const total = depts.reduce((a, d) => a + d.recommended, 0);
  const top = depts.slice(0, 6);
  const rest = total - top.reduce((a, d) => a + d.recommended, 0);
  const segs = [...top.map((d) => ({ label: tidy(d.name), v: d.recommended, d })), { label: `${Math.max(0, depts.length - 6)} other departments`, v: rest, d: null as Dept | null }];
  const active = hover != null ? segs[hover] : null;

  return (
    <motion.section {...inView} className="mt-4 rounded-[28px] bg-card p-5 md:p-7">
      <Heading kicker="FY2027 adopted budget · every figure links to its page"
        title={<>Where <em className="italic text-highlight-secondary">{total ? money(total) : "the money"}</em> goes</>} to="/budget" cta="Explore the budget" />
      <p className="mt-2 max-w-[720px] text-[15px] text-foreground/85">
        That's the {depts.length} city department budgets added together. Schools are funded separately: {school ? <a href={`${school.url}`} target="_blank" rel="noreferrer" className="font-medium text-foreground underline decoration-highlight-secondary underline-offset-4">{money(school.amount)} (p. {school.page})</a> : "—"}.
      </p>

      <div className="mt-6 flex h-16 overflow-hidden rounded-2xl" onMouseLeave={() => setHover(null)}>
        {segs.map((sg, i) => (
          <motion.button key={sg.label} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}
            onClick={() => (sg.d ? window.open(`${sg.d.source_url}#page=${sg.d.page}`, "_blank", "noopener") : undefined)}
            className="relative h-full border-r-2 border-card last:border-r-0 transition-opacity" style={{ background: SEG[i % SEG.length], opacity: hover == null || hover === i ? 1 : 0.35 }}
            initial={reduce ? false : { width: 0 }} whileInView={{ width: `${(sg.v / Math.max(1, total)) * 100}%` }} viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} aria-label={`${sg.label}: ${money(sg.v)}`}>
            {sg.v / Math.max(1, total) > 0.09 && <span className="tnum absolute bottom-2 left-3 text-[13px] font-semibold text-[#02070a]">{Math.round((sg.v / total) * 100)}%</span>}
          </motion.button>
        ))}
      </div>
      <p className="mt-3 h-6 text-[15px] text-foreground">
        {active ? <><b className="font-semibold">{active.label}</b> · {money(active.v)} · {Math.round((active.v / total) * 100)}% {active.d && <span className="text-muted-foreground">· budget p. {active.d.page}{active.d.prior_adopted ? ` · ${active.d.recommended >= active.d.prior_adopted ? "+" : "−"}${Math.abs(((active.d.recommended - active.d.prior_adopted) / active.d.prior_adopted) * 100).toFixed(1)}% from FY2026` : ""}</span>}</> : <span className="text-muted-foreground">Hover or tap a block to see the department.</span>}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        {segs.map((sg, i) => (
          <button key={sg.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => ask(`How much does Revere spend on ${sg.label.toLowerCase()} and what changed?`)} className="flex items-start gap-2.5 text-left">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-[4px]" style={{ background: SEG[i % SEG.length] }} />
            <span className="min-w-0"><span className="block truncate text-[14px] text-foreground">{sg.label}</span><span className="tnum block text-[13px] text-muted-foreground">{money(sg.v)}</span></span>
          </button>
        ))}
      </div>
    </motion.section>
  );
}

/* ---------------- Housing: Revere against its neighbours ---------------- */
type HomeRow = { place: string; value?: { value: number; month: string }; rent?: { value: number }; was?: { value: number } };

export function HomesCard({ housing }: { housing: HomeRow[] }) {
  const reduce = useReducedMotion();
  const rows = housing.filter((h) => h.value);
  const max = Math.max(1, ...rows.map((r) => r.value!.value));
  const rv = rows.find((r) => r.place === "Revere");
  return (
    <motion.section {...inView} className="rounded-[28px] bg-card p-5 md:p-7 lg:col-span-7">
      <Heading kicker={rv?.value ? `Zillow estimates · ${new Date(rv.value.month + "T12:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : "Zillow estimates"}
        title={<>A typical Revere home: <em className="italic text-highlight-secondary">{rv?.value ? `$${Math.round(rv.value.value / 1000)}K` : "—"}</em></>} to="/housing" cta="Housing" />
      {rv?.rent && <p className="mt-2 text-[15px] text-foreground/85">Typical rent is ${rv.rent.value.toLocaleString("en-US")} a month. Affording it at 30% of income takes about ${Math.round((rv.rent.value * 12) / 0.3 / 1000)}K a year.</p>}
      <div className="mt-6 space-y-3">
        {rows.map((r, i) => {
          const yoy = r.was ? ((r.value!.value - r.was.value) / r.was.value) * 100 : null;
          const me = r.place === "Revere";
          return (
            <div key={r.place} className="grid grid-cols-[96px_1fr_auto] items-center gap-3">
              <span className={cn("text-[14px]", me ? "font-semibold text-foreground" : "text-muted-foreground")}>{r.place}</span>
              <div className="h-8 overflow-hidden rounded-full bg-secondary">
                <motion.div className={cn("flex h-full items-center justify-end rounded-full pr-3", me ? "bg-highlight-secondary" : "bg-highlight/70")}
                  initial={reduce ? false : { width: 0 }} whileInView={{ width: `${(r.value!.value / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.8 }}>
                  <span className="tnum text-[13px] font-semibold text-[#02070a]">${Math.round(r.value!.value / 1000)}K</span>
                </motion.div>
              </div>
              <span className="tnum w-[110px] text-right text-[13px] text-muted-foreground">{r.rent ? `$${r.rent.value.toLocaleString("en-US")}/mo` : "—"}{yoy != null ? ` · ${yoy >= 0 ? "+" : "−"}${Math.abs(yoy).toFixed(1)}%` : ""}</span>
            </div>
          );
        })}
        {!rows.length && <div className="skeleton h-32" />}
      </div>
    </motion.section>
  );
}

/* ---------------- Ask: over the 1940s Cyclone postcard ---------------- */
export function AskPostcard() {
  const qs = ["Is anything going on near Revere Beach this week?", "When is the next train to Boston from Beachmont?", "How much does the city spend on snow and ice?", "What's rent like compared to Chelsea?"];
  return (
    <motion.section {...inView} className="relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[28px] p-5 text-white md:p-7 lg:col-span-5">
      <motion.img src="/images/the-cyclone-at-revere-beach-mass-82569.jpg" alt="1940s postcard of the Cyclone roller coaster on Revere Beach Boulevard" loading="lazy"
        className="absolute inset-0 -z-20 h-full w-full object-cover" initial={{ scale: 1.08 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: "easeOut" }} />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,7,10,0.15)_0%,rgba(2,7,10,0.65)_45%,rgba(2,7,10,0.95)_100%)]" />
      <p className="text-[13px] text-white/75">The Cyclone, Revere Beach Boulevard, 1940s</p>
      <h2 className="mt-1 font-serif-display text-[34px] leading-[1.05]">Ask the way you'd <em className="italic text-highlight-secondary">ask a neighbor</em></h2>
      <div className="mt-5 grid gap-2">
        {qs.map((q) => (
          <button key={q} onClick={() => ask(q)} className="group flex min-h-[48px] items-center justify-between rounded-2xl bg-white/10 px-4 text-left text-[15px] ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/20">
            <span className="truncate">{q}</span><ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </motion.section>
  );
}
