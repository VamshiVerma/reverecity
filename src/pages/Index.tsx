import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Mic } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { usePulse } from "@/lib/usePulse";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co";

type Station = { id: string; name: string; toBowdoin: number | null; toWonderland: number | null };
type Snapshot = {
  weather: { temp: number; feels: number; conditions: string; hi: number; lo: number; alerts: string[]; asOf: string; days?: { date: string; hi: number; lo: number; conditions: string; precipprob: number }[] } | null;
  police: { calls7d: number; prev7d: number; since: string; through: string; topCategory: string | null; daily: { d: string; n: number }[] } | null;
  mbta: { status: string; alerts: { effect: string; header: string }[]; stations?: Station[]; asOf: string };
  budget: Record<string, { name: string; amount: number; prior: number; page: number; url: string } | null>;
};
type Dept = { name: string; recommended: number; prior_adopted: number | null; page: number; source_url: string };
type Home = { place: string; metric: string; value: number; month: string };

const ask = (detail?: { q?: string; voice?: boolean }) => window.dispatchEvent(new CustomEvent("revere:ask", { detail }));
const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);
const mins = (m: number | null) => (m == null ? "—" : m <= 0 ? "Now" : `${m} min`);
const tidy = (s: string) => s.replace(/^Dept\. of /i, "").replace(/ And /g, " and ");

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Index() {
  const [s, setS] = useState<Snapshot | null>(null);
  const [err, setErr] = useState(false);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const pulse = usePulse();
  const reduce = useReducedMotion();

  useEffect(() => {
    let alive = true;
    const load = () => fetch(`${SUPABASE_URL}/functions/v1/city-snapshot`).then((r) => r.json()).then((j) => alive && setS(j)).catch(() => alive && setErr(true));
    load();
    const id = setInterval(load, 60_000);
    supabase.from("budget_departments" as any).select("name,recommended,prior_adopted,page,source_url").eq("fiscal_year", 2027).order("recommended", { ascending: false }).limit(6)
      .then(({ data }) => alive && setDepts((data as unknown as Dept[]) || []));
    const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
    supabase.from("housing_market" as any).select("place,metric,value,month").in("place", ["Revere", "Chelsea", "East Boston", "Everett"]).gte("month", since).order("month")
      .then(({ data }) => alive && setHomes((data as unknown as Home[]) || []));
    return () => { alive = false; clearInterval(id); };
  }, []);

  const police = s?.police;
  const wow = police && police.prev7d ? ((police.calls7d - police.prev7d) / police.prev7d) * 100 : null;
  const calls = pulse.filter((p) => p.kind === "police").slice(0, 5);
  const rb = s?.mbta.stations?.find((x) => x.id === "place-rbmnl");

  // The one sentence under the greeting, built from today's data.
  const today = useMemo(() => {
    if (!s) return null;
    const parts: string[] = [];
    if (s.weather) parts.push(`${Math.round(s.weather.temp)}° and ${s.weather.conditions.toLowerCase()}`);
    parts.push(s.mbta.alerts.length ? `the Blue Line has ${s.mbta.alerts.length === 1 ? "an alert" : `${s.mbta.alerts.length} alerts`}` : "Blue Line trains are running normally");
    if (s.weather?.alerts.length) parts.push(`a ${s.weather.alerts[0]} is in effect`);
    const t = parts.join(", ");
    return t.charAt(0).toUpperCase() + t.slice(1) + ".";
  }, [s]);

  const housing = useMemo(() => {
    const series = (place: string, metric: string) => homes.filter((h) => h.place === place && h.metric === metric);
    return ["Revere", "East Boston", "Everett", "Chelsea"].map((p) => {
      const v = series(p, "zhvi"), r = series(p, "zori");
      return { place: p, value: v.at(-1), rent: r.at(-1), was: v.length > 12 ? v[v.length - 13] : undefined };
    });
  }, [homes]);

  const rise = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] } });

  return (
    <DashboardLayout pageTitle="Overview">
      <Hero s={s} today={today} homes={housing[0]} rb={rb} wow={wow} />
      <div className="mx-auto w-full max-w-[1100px] pt-2">
        {err && !s && <p className="mt-6 rounded-[22px] bg-card p-5 text-[15px] text-muted-foreground">The live feeds aren't answering right now. The pages still work; numbers will appear when the connection returns.</p>}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <motion.section {...rise(5)} className="relative overflow-hidden rounded-[22px] bg-[#0297DE] p-5 text-white [--foreground:0_0%_100%] [--muted-foreground:199_80%_92%] [--brand:0_0%_100%] [--card:199_98%_44%] [--background:201_100%_30%] [--success:152_70%_75%] md:p-6 lg:col-span-9">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-foreground">The Blue Line through Revere</h2>
              <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", s?.mbta.alerts.length ? "bg-warning" : "bg-success")} />
                {s ? `${s.mbta.status} · updated ${fmtTime(s.mbta.asOf)}` : "Loading"}
              </span>
            </div>
            <BlueLine stations={s?.mbta.stations} />
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] bg-background px-4 py-3 text-[14px]">
              <span className="text-muted-foreground">Buses through Revere</span>
              {["110", "116", "117", "119", "411", "426", "450"].map((r) => <span key={r} className="tnum font-medium text-foreground">{r}</span>)}
              <Link to="/mbta" className="ml-auto text-[13px] text-muted-foreground hover:text-foreground">Live times</Link>
            </div>
            {!!s?.mbta.alerts.length && <p className="mt-5 rounded-[14px] bg-background px-4 py-3 text-[14px] text-foreground">{s.mbta.alerts[0].header}</p>}
          </motion.section>

          <motion.section {...rise(6)} className="rounded-[22px] bg-card p-5 lg:col-span-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[16px] font-semibold text-foreground">This week</h2>
              <Link to="/weather" className="text-[13px] text-muted-foreground hover:text-foreground">Forecast</Link>
            </div>
            <ul className="mt-3 space-y-1">
              {(s?.weather?.days ?? []).slice(1, 5).map((d) => (
                <li key={d.date} className="flex items-center justify-between py-2 text-[15px]">
                  <span className="w-11 text-muted-foreground">{new Date(d.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className="min-w-0 flex-1 truncate px-2 text-foreground">{d.precipprob >= 40 ? `${d.precipprob}% rain` : d.conditions}</span>
                  <span className="tnum text-foreground">{Math.round(d.hi)}°<span className="text-muted-foreground"> {Math.round(d.lo)}°</span></span>
                </li>
              ))}
              {!s && [0, 1, 2, 3].map((i) => <li key={i} className="skeleton h-9" />)}
            </ul>
          </motion.section>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel i={7} rise={rise} title="From the police log" meta={police ? `Notable calls · latest log runs through ${fmtDay(police.through)}` : ""} to="/police-logs" span="lg:col-span-6">
            {calls.map((c) => (
              <Row key={c.id} to="/police-logs" left={c.text.split(" · ")[0]} sub={c.text.split(" · ").slice(1).join(" · ")} right={c.tag} muted />
            ))}
            {!calls.length && <Empty text="No notable calls in the latest log." />}
          </Panel>
          <Panel i={8} rise={rise} title="Where the money goes" meta="FY2027 adopted budget · largest departments" to="/budget" span="lg:col-span-6">
            {depts.slice(0, 5).map((d) => {
              const ch = d.prior_adopted ? ((d.recommended - d.prior_adopted) / d.prior_adopted) * 100 : null;
              return <Row key={d.name} href={`${d.source_url}#page=${d.page}`} left={tidy(d.name)} sub={`Budget p. ${d.page}${ch != null ? ` · ${ch >= 0 ? "+" : "−"}${Math.abs(ch).toFixed(1)}% from FY2026` : ""}`} right={money(d.recommended)} />;
            })}
            {!depts.length && <Empty text="Loading the budget…" />}
          </Panel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel i={9} rise={rise} title="What homes cost" meta={housing[0]?.value ? `Zillow estimates · ${new Date(housing[0].value.month + "T12:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : ""} to="/housing" span="lg:col-span-6">
            {housing.filter((h) => h.value).map((h) => {
              const yoy = h.was ? ((h.value!.value - h.was.value) / h.was.value) * 100 : null;
              return <Row key={h.place} to="/housing" left={h.place} sub={`${h.rent ? `Rent $${h.rent.value.toLocaleString("en-US")}/mo` : "No rent index"}${yoy != null ? ` · ${yoy >= 0 ? "+" : "−"}${Math.abs(yoy).toFixed(1)}% in a year` : ""}`} right={`$${Math.round(h.value!.value / 1000)}K`} />;
            })}
            {!homes.length && <Empty text="Loading housing data…" />}
          </Panel>
          <motion.section {...rise(10)} className="rounded-[22px] bg-card p-5 lg:col-span-6">
            <h2 className="text-[16px] font-semibold text-foreground">Ask it the way you'd ask a neighbor</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Type or talk. Every answer shows where the facts came from.</p>
            <div className="mt-3 grid gap-2">
              {["Is anything going on near Revere Beach this week?", "When is the next train to Boston from Beachmont?", "How much does the city spend on snow and ice?", "What's the rent like compared to Chelsea?"].map((q) => (
                <button key={q} onClick={() => ask({ q })} className="group flex min-h-[52px] items-center justify-between rounded-[14px] bg-background px-4 text-left text-[15px] text-foreground transition-colors hover:bg-secondary">
                  <span className="truncate">{q}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </DashboardLayout>
  );
}

type RiseFn = (i: number) => object;

function CountUp({ to, format = (v: number) => Math.round(v).toLocaleString("en-US") }: { to: number; format?: (v: number) => string }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) { setV(to); return; }
    const c = animate(0, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [to, reduce]);
  return <>{format(v)}</>;
}

function HeroStat({ label, value, sub, align = "left", delay }: { label: string; value: React.ReactNode; sub?: string; align?: "left" | "right"; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: align === "left" ? -24 : 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn("min-w-0", align === "right" && "lg:text-right")}>
      <div className="font-serif-display text-[40px] leading-none text-white md:text-[46px]">{value}</div>
      <div className="mt-1.5 text-[13px] font-medium text-white/85">{label}</div>
      {sub && <div className="text-[12px] text-white/55">{sub}</div>}
    </motion.div>
  );
}

/** Sunrise over Revere Beach: the beach faces due east, so the light comes up out of the Atlantic. */
function Hero({ s, today, homes, rb, wow }: { s: Snapshot | null; today: string | null; homes?: { value?: Home }; rb?: Station; wow: number | null }) {
  const reduce = useReducedMotion();
  const words = `${greeting()},`.split(" ");
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] text-white" aria-label="Revere right now">
      <div className="sunrise" aria-hidden>
        <div className="glow-blue" /><div className="glow-sun" /><div className="streaks" /><div className="horizon" /><div className="grain" />
      </div>

      <div className="relative flex min-h-[640px] flex-col px-5 pb-6 pt-6 md:min-h-[700px] md:px-10 md:pt-8">
        <div className="flex items-center justify-between text-[13px] text-white/70">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight-secondary opacity-70 motion-reduce:hidden" /><span className="relative h-2 w-2 rounded-full bg-highlight-secondary" /></span>
            Live in Revere, Massachusetts
          </span>
          <span className="tnum">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" })}</span>
        </div>

        <div className="relative mt-10 flex flex-1 flex-col items-center text-center md:mt-14">
          <h1 className="font-serif-display text-[clamp(52px,8vw,112px)] leading-[0.95] tracking-[-0.02em]">
            <span className="block">
              {words.map((w, i) => (
                <motion.span key={i} className="mr-[0.22em] inline-block" initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.1 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>{w}</motion.span>
              ))}
            </span>
            <motion.em className="block italic text-highlight-secondary" initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>Revere.</motion.em>
          </h1>
          <motion.p initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }}
            className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-white/80 md:text-[19px]">
            {today ?? "Reading the city's live feeds…"} Ask anything about the city, out loud or by typing.
          </motion.p>

          <motion.button onClick={() => ask({ voice: true })} initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.85, type: "spring", stiffness: 220, damping: 18 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
            className="voice-orb relative mt-9 grid h-[104px] w-[104px] place-items-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur-md" aria-label="Talk to Revere">
            <span className="flex flex-col items-center gap-1 text-[12px] font-medium text-white/90"><Mic className="h-6 w-6" />Talk</span>
          </motion.button>

          {/* Live numbers flank the greeting on wide screens, sit below it on phones */}
          <div className="mt-10 grid w-full grid-cols-2 gap-x-6 gap-y-7 text-left lg:absolute lg:inset-x-0 lg:top-[34%] lg:mt-0 lg:flex lg:justify-between">
            <div className="space-y-8 contents lg:block">
              <HeroStat delay={1.0} label="Right now" sub={s?.weather ? `${s.weather.conditions} · feels ${Math.round(s.weather.feels)}°` : ""} value={s?.weather ? <><CountUp to={Math.round(s.weather.temp)} />°</> : "—"} />
              <HeroStat delay={1.1} label="Next train, Revere Beach" sub="Toward Boston" value={s ? mins(rb?.toBowdoin ?? null) : "—"} />
            </div>
            <div className="space-y-8 contents lg:block">
              <HeroStat align="right" delay={1.0} label="Police calls, 7 days" sub={wow != null ? `${Math.abs(wow).toFixed(0)}% ${wow > 0 ? "more" : "fewer"} than the week before` : ""} value={s?.police ? <CountUp to={s.police.calls7d} /> : "—"} />
              <HeroStat align="right" delay={1.1} label="Typical home value" sub="Zillow, ZIP 02151" value={homes?.value ? <>$<CountUp to={Math.round(homes.value.value / 1000)} />K</> : "—"} />
            </div>
          </div>
        </div>

        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25, duration: 0.7 }}
          className="relative mt-10 flex flex-wrap justify-center gap-2">
          {["Is the Blue Line on time?", "What happened near the beach this week?", "How much goes to schools?", "Will it rain this weekend?"].map((q) => (
            <button key={q} onClick={() => ask({ q })} className="rounded-full bg-white/10 px-4 py-2 text-[14px] text-white/90 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/20">{q}</button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Tile({ i, rise, to, label, value, caption }: { i: number; rise: RiseFn; to: string; label: string; value: string | null; caption: string }) {
  return (
    <motion.div {...rise(i)} className="lg:col-span-3">
      <Link to={to} className="flex h-[132px] flex-col rounded-[22px] bg-card p-4 transition-colors hover:bg-secondary">
        <span className="text-[14px] text-muted-foreground">{label}</span>
        {value == null ? <span className="skeleton mt-2 h-9 w-24" /> : <span className="tnum mt-1 text-[32px] leading-tight text-foreground">{value}</span>}
        <span className="mt-auto line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{caption}</span>
      </Link>
    </motion.div>
  );
}

function Panel({ i, rise, title, meta, to, span, children }: { i: number; rise: RiseFn; title: string; meta: string; to: string; span: string; children: React.ReactNode }) {
  return (
    <motion.section {...rise(i)} className={cn("rounded-[22px] bg-card p-5", span)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
        <Link to={to} className="shrink-0 text-[13px] text-muted-foreground hover:text-foreground">View all</Link>
      </div>
      {meta && <p className="mt-0.5 text-[13px] text-muted-foreground">{meta}</p>}
      <div className="mt-3 space-y-2">{children}</div>
    </motion.section>
  );
}

function Row({ left, sub, right, to, href, muted }: { left: string; sub?: string; right: string; to?: string; href?: string; muted?: boolean }) {
  const inner = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-[15px] text-foreground">{left}</span>
        {sub && <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>}
      </span>
      <span className={cn("tnum shrink-0 pl-3 text-right", muted ? "text-[13px] text-muted-foreground" : "text-[15px] text-foreground")}>{right}</span>
    </>
  );
  const cls = "flex min-h-[63px] items-center justify-between rounded-[14px] bg-background px-4 py-2 transition-colors hover:bg-secondary";
  return href ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <Link to={to || "/"} className={cls}>{inner}</Link>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[14px] bg-background px-4 py-5 text-[14px] text-muted-foreground">{text}</p>;
}

/** Revere's four Blue Line stations, north to south, with the next train each way. */
function BlueLine({ stations }: { stations?: Station[] }) {
  const list = stations ?? ["Wonderland", "Revere Beach", "Beachmont", "Suffolk Downs"].map((name) => ({ id: name, name, toBowdoin: null, toWonderland: null }));
  return (
    <div className="mt-7">
      <div className="relative grid grid-cols-4">
        <div className="absolute left-[12.5%] right-[12.5%] top-[9px] h-[6px] rounded-full bg-highlight" aria-hidden>
          <motion.span className="absolute top-1/2 h-[14px] w-9 -translate-y-1/2 rounded-full bg-highlight-secondary shadow-[0_0_18px_hsl(13_97%_64%/0.9)]"
            animate={{ left: ["0%", "calc(100% - 36px)", "0%"] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        {list.map((st, i) => (
          <div key={st.id} className="relative flex flex-col items-center px-1 text-center">
            <motion.span className="relative z-[2] block h-6 w-6 rounded-full border-[5px] border-highlight bg-card"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 420, damping: 18 }} />
            <span className="mt-3 text-[15px] font-medium leading-tight text-foreground">{st.name}</span>
            <dl className="mt-2 space-y-0.5 text-[13px]">
              <div className="flex flex-wrap justify-center gap-x-1.5"><dt className="text-muted-foreground">To Boston</dt><dd className="tnum font-medium text-foreground">{stations ? mins(st.toBowdoin) : "…"}</dd></div>
              <div className="flex flex-wrap justify-center gap-x-1.5"><dt className="text-muted-foreground">{i === 0 ? "Arriving" : "Northbound"}</dt><dd className="tnum font-medium text-foreground">{stations ? mins(st.toWonderland) : "…"}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
