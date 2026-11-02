import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Mic, Search } from "lucide-react";
import LiveLine from "@/components/home/LiveLine";
import WeatherIcon from "@/components/WeatherIcon";
import { PoliceWeek, WeatherField, MoneyBar, HomesCard, AskPostcard } from "@/components/home/Sections";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { usePulse } from "@/lib/usePulse";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co";

type Station = { id: string; name: string; toBowdoin: number | null; toWonderland: number | null };
type Snapshot = {
  weather: { temp: number; feels: number; conditions: string; hi: number; lo: number; alerts: string[]; asOf: string; days?: { date: string; hi: number; lo: number; conditions: string; precipprob: number }[] } | null;
  police: { calls7d: number; prev7d: number; since: string; through: string; topCategory: string | null; daily: { d: string; n: number }[]; byCat?: { k: string; n: number }[] } | null;
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
  const [allDepts, setDepts] = useState<Dept[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const pulse = usePulse();
  const reduce = useReducedMotion();

  useEffect(() => {
    let alive = true;
    const load = () => fetch(`${SUPABASE_URL}/functions/v1/city-snapshot`).then((r) => r.json()).then((j) => alive && setS(j)).catch(() => alive && setErr(true));
    load();
    const id = setInterval(load, 60_000);
    supabase.from("budget_departments" as any).select("name,recommended,prior_adopted,page,source_url").eq("fiscal_year", 2027).order("recommended", { ascending: false })
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
    <DashboardLayout pageTitle="Overview" hero={<Hero s={s} today={today} homes={housing[0]} rb={rb} wow={wow} />}>
      <div className="w-full">
        {err && !s && <p className="mt-6 rounded-[22px] bg-card p-5 text-[15px] text-muted-foreground">The live feeds aren't answering right now. The pages still work; numbers will appear when the connection returns.</p>}

        <div className="mt-4"><LiveLine stations={s?.mbta.stations} alert={s?.mbta.alerts[0]?.header} /></div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <PoliceWeek police={police} wow={wow} calls={calls} />
          <WeatherField w={s?.weather ?? null} />
        </div>

        <MoneyBar depts={allDepts} school={s?.budget.school ?? null} />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <HomesCard housing={housing} />
          <AskPostcard />
        </div>
      </div>
    </DashboardLayout>
  );
}


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
      <div className="figure text-[40px] leading-none text-white md:text-[46px]">{value}</div>
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
    <section className="relative isolate overflow-hidden text-white" aria-label="Revere right now">
      <div className="sunrise" aria-hidden>
        <div className="glow-blue" /><div className="glow-sun" /><div className="streaks" /><div className="horizon" /><div className="grain" />
      </div>

      <div className="relative mx-auto flex max-w-[1280px] flex-col px-4 pb-10 pt-5 md:min-h-[680px] md:px-7 md:pt-8">
        <div className="flex items-center justify-between text-[13px] text-white/70">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight-secondary opacity-70 motion-reduce:hidden" /><span className="relative h-2 w-2 rounded-full bg-highlight-secondary" /></span>
            Live in Revere, Massachusetts
          </span>
          <span className="tnum">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" })}</span>
        </div>

        <div className="relative mt-8 flex flex-1 flex-col items-center text-center md:mt-12">
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
            {today ?? "Reading the city's live feeds…"}
          </motion.p>

          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7 }}
            className="mt-9 flex w-full max-w-[620px] items-center gap-2 rounded-full bg-white/10 p-2 pl-5 ring-1 ring-white/20 backdrop-blur-md transition focus-within:bg-white/15 focus-within:ring-white/40">
            <Search className="h-5 w-5 shrink-0 text-white/70" />
            <form className="flex-1" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q") as string; if (q?.trim()) { ask({ q }); e.currentTarget.reset(); } }}>
              <input name="q" placeholder="Ask anything about Revere…" aria-label="Ask a question about Revere"
                className="h-11 w-full bg-transparent text-[17px] text-white outline-none placeholder:text-white/55" />
            </form>
            <button onClick={() => ask({ voice: true })} aria-label="Ask by voice" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-highlight-secondary text-[#2a0d04] transition-transform hover:scale-105 active:scale-95">
              <Mic className="h-5 w-5" />
            </button>
          </motion.div>

          {/* Live numbers flank the greeting on wide screens, sit below it on phones */}
          <div className="mt-10 grid w-full grid-cols-2 gap-x-6 gap-y-7 text-left lg:absolute lg:inset-x-0 lg:top-[30%] lg:mt-0 lg:flex lg:justify-between">
            <div className="space-y-8 contents lg:block">
              <HeroStat delay={1.0} label="Right now" sub={s?.weather ? `${s.weather.conditions} · feels ${Math.round(s.weather.feels)}°` : ""} value={s?.weather ? <span className="inline-flex items-center gap-3"><CountUp to={Math.round(s.weather.temp)} />°<WeatherIcon conditions={s.weather.conditions} className="h-8 w-8 text-[#ffd79a]" /></span> : "—"} />
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





