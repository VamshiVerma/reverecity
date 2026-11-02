import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useReducedMotion } from "framer-motion";
import { CloudSun, Landmark, ShieldCheck, TrainFront } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co";

type Snapshot = {
  weather: { temp: number; feels: number; conditions: string; hi: number; lo: number; alerts: string[]; asOf: string } | null;
  police: { calls7d: number; prev7d: number; since: string; through: string; topCategory: string | null; topCount: number; daily: { d: string; n: number }[] } | null;
  mbta: { status: string; alerts: { effect: string; header: string }[]; next: { toward: string; mins: number }[]; asOf: string };
  budget: Record<string, { name: string; amount: number; prior: number; page: number; doc: string; url: string } | null>;
};

const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function CountUp({ value, format = (v: number) => Math.round(v).toLocaleString("en-US") }: { value: number; format?: (v: number) => string }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setV(value); return; }
    const c = animate(0, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [value, reduce]);
  return <>{format(v)}</>;
}

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points), min = Math.min(...points);
  const w = 120, h = 34;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - ((p - min) / Math.max(1, max - min)) * (h - 4) - 2]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="spk" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(350 90% 65%)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(350 90% 65%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#spk)" />
      <motion.path d={d} fill="none" stroke="hsl(350 90% 68%)" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

function Card({ i, icon: Icon, tone, label, children, foot, to }: { i: number; icon: typeof CloudSun; tone: string; label: string; children: React.ReactNode; foot: React.ReactNode; to?: string }) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * i, type: "spring", stiffness: 240, damping: 26 }}
      whileHover={{ y: -3 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 backdrop-blur-md transition-colors hover:border-input hover:bg-secondary"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1", tone)}><Icon className="h-4 w-4" /></span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
      <div className="mt-3 text-[11px] text-foreground/55">{foot}</div>
    </motion.div>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

export default function LiveSnapshot() {
  const [s, setS] = useState<Snapshot | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetch(`${SUPABASE_URL}/functions/v1/city-snapshot`).then((r) => r.json()).then((j) => alive && setS(j)).catch(() => alive && setErr(true));
    load();
    const id = setInterval(load, 120_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!s) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[148px] rounded-2xl border border-border bg-card p-4">
            {!err && <><div className="skeleton mb-4 h-4 w-24" /><div className="skeleton mb-2 h-8 w-32" /><div className="skeleton h-3 w-40" /></>}
            {err && <p className="text-xs text-foreground/60">Live data is temporarily unavailable.</p>}
          </div>
        ))}
      </div>
    );
  }

  const { weather, police, mbta, budget } = s;
  const wow = police && police.prev7d ? ((police.calls7d - police.prev7d) / police.prev7d) * 100 : null;
  const school = budget.school, pol = budget.police, fire = budget.fire;
  const schoolPct = school ? ((school.amount - school.prior) / school.prior) * 100 : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card i={0} icon={CloudSun} tone="bg-amber-400/15 text-foreground ring-amber-300/30" label="Weather now" to="/weather"
        foot={weather ? <>Open-Meteo · updated {fmtTime(weather.asOf)}</> : "Weather unavailable"}>
        {weather && (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold tabular-nums text-foreground"><CountUp value={weather.temp} />°</span>
              <span className="text-sm text-foreground/80">{weather.conditions}</span>
            </div>
            <div className="mt-1 text-xs text-foreground/65">High {Math.round(weather.hi)}° · Low {Math.round(weather.lo)}° · feels {Math.round(weather.feels)}°</div>
            {!!weather.alerts.length && <div className="mt-2 rounded-md bg-red-500/20 px-2 py-1 text-[11px] font-semibold text-red-100">⚠ {weather.alerts.join(", ")}</div>}
          </>
        )}
      </Card>

      <Card i={1} icon={TrainFront} tone="bg-sky-400/15 text-foreground ring-sky-300/30" label="Blue Line" to="/mbta"
        foot={<>MBTA live · {fmtTime(mbta.asOf)}</>}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {!mbta.alerts.length && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />}
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", mbta.alerts.length ? "bg-amber-400" : "bg-emerald-400")} />
          </span>
          <span className="font-display text-xl font-semibold text-foreground">{mbta.status}</span>
        </div>
        {mbta.alerts.length ? (
          <p className="mt-2 line-clamp-2 text-xs text-foreground/90">{mbta.alerts[0].header}</p>
        ) : mbta.next.length ? (
          <p className="mt-2 text-xs text-foreground/70">Revere Beach: {mbta.next.slice(0, 2).map((n) => `${n.toward} ${n.mins <= 0 ? "now" : n.mins + " min"}`).join(" · ")}</p>
        ) : (
          <p className="mt-2 text-xs text-foreground/60">No active alerts on the Blue Line.</p>
        )}
      </Card>

      <Card i={2} icon={ShieldCheck} tone="bg-rose-400/15 text-foreground ring-rose-300/30" label="Police log · 7 days" to="/police-logs"
        foot={police ? <>Revere PD public log · {fmtDay(police.since)}–{fmtDay(police.through)}</> : "No log data"}>
        {police && (
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-4xl font-semibold tabular-nums text-foreground"><CountUp value={police.calls7d} /></div>
              <div className="mt-1 text-xs text-foreground/65">
                calls{wow != null && <> · <span className={wow > 0 ? "text-foreground" : "text-foreground"}>{wow > 0 ? "▲" : "▼"} {Math.abs(wow).toFixed(0)}% vs prior week</span></>}
              </div>
              {police.topCategory && <div className="mt-0.5 text-[11px] text-foreground/55">Most common: {pretty(police.topCategory)}</div>}
            </div>
            <Spark points={police.daily.map((x) => x.n)} />
          </div>
        )}
      </Card>

      <Card i={3} icon={Landmark} tone="bg-emerald-400/15 text-foreground ring-emerald-300/30" label="FY2027 budget" to="/budget"
        foot={school ? <a href={school.url} target="_blank" rel="noreferrer" className="hover:text-foreground" onClick={(e) => e.stopPropagation()}>Adopted budget, p. {school.page}{pol ? ` · p. ${pol.page}` : ""} ↗</a> : null}>
        {school && (
          <>
            <div className="font-display text-3xl font-semibold tabular-nums text-foreground">
              $<CountUp value={school.amount / 1e6} format={(v) => v.toFixed(1)} />M
            </div>
            <div className="mt-1 text-xs text-foreground/65">Schools{schoolPct != null && <> · {schoolPct >= 0 ? "+" : ""}{schoolPct.toFixed(1)}% vs FY26</>}</div>
            <div className="mt-0.5 text-[11px] text-foreground/55">
              {pol && <>Police ${(pol.amount / 1e6).toFixed(1)}M</>}{fire && <> · Fire ${(fire.amount / 1e6).toFixed(1)}M</>}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
