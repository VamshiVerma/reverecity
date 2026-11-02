import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Home, KeyRound, Sparkles } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Row = { zip: string; place: string; metric: "zhvi" | "zori"; month: string; value: number };

const PLACES = ["Revere", "East Boston", "Chelsea", "Everett", "Winthrop", "Malden", "Lynn"];
const COLORS: Record<string, string> = {
  Revere: "hsl(199 91% 56%)", "East Boston": "hsl(38 92% 60%)", Chelsea: "hsl(152 60% 52%)", Everett: "hsl(280 70% 70%)",
  Winthrop: "hsl(350 85% 66%)", Malden: "hsl(170 50% 60%)", Lynn: "hsl(220 15% 65%)",
};
const ZIP: Record<string, string> = { Revere: "02151", "East Boston": "02128", Chelsea: "02150", Everett: "02149", Winthrop: "02152", Malden: "02148", Lynn: "01902" };
const ZILLOW = "https://www.zillow.com/research/data/";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usdK = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`);
const monthLabel = (m: string, long = false) => new Date(m + "T12:00:00").toLocaleDateString("en-US", long ? { month: "long", year: "numeric" } : { month: "short", year: "2-digit" });
const ask = (q: string) => window.dispatchEvent(new CustomEvent("revere:ask", { detail: { q } }));

function change(series: { month: string; value: number }[], months: number) {
  if (series.length <= months) return null;
  const a = series[series.length - 1].value, b = series[series.length - 1 - months].value;
  return ((a - b) / b) * 100;
}

export default function HousingPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<"zhvi" | "zori">("zhvi");
  const [shown, setShown] = useState<string[]>(["Revere", "East Boston", "Chelsea"]);
  const [range, setRange] = useState<5 | 10>(5);

  useEffect(() => {
    // One request per metric, limited to ~10.5 years: the REST API caps a single read at 1000 rows.
    const since = new Date(Date.now() - 10.6 * 365.25 * 864e5).toISOString().slice(0, 10);
    Promise.all(["zhvi", "zori"].map((m) =>
      supabase.from("housing_market" as any).select("zip,place,metric,month,value").eq("metric", m).gte("month", since).order("month").limit(1000),
    )).then((res) => {
      if (res.some((r) => r.error)) setError(true);
      else setRows(res.flatMap((r) => (r.data as unknown as Row[]) || []));
    });
  }, []);

  const by = useMemo(() => {
    const m: Record<string, Record<string, { month: string; value: number }[]>> = { zhvi: {}, zori: {} };
    for (const r of rows || []) (m[r.metric][r.place] ||= []).push({ month: r.month, value: r.value });
    return m;
  }, [rows]);

  const rv = by.zhvi.Revere || [], rr = by.zori.Revere || [];
  const latest = rv[rv.length - 1];
  const latestRent = rr[rr.length - 1];

  const chart = useMemo(() => {
    const series = by[metric];
    const months = [...new Set(Object.values(series).flatMap((s) => s.map((p) => p.month)))].sort();
    const cutoff = months.length ? new Date(new Date(months[months.length - 1]).getTime() - range * 365.25 * 864e5).toISOString().slice(0, 10) : "";
    return months.filter((m) => m >= cutoff).map((m) => {
      const o: Record<string, any> = { month: m };
      for (const p of shown) o[p] = series[p]?.find((x) => x.month === m)?.value;
      return o;
    });
  }, [by, metric, shown, range]);

  const table = PLACES.map((p) => {
    const v = by.zhvi[p] || [], r = by.zori[p] || [];
    return { place: p, value: v.at(-1)?.value, vYoY: change(v, 12), rent: r.at(-1)?.value, rYoY: change(r, 12), rentMonth: r.at(-1)?.month };
  });

  return (
    <DashboardLayout pageTitle="Housing">
      <div className="mx-auto max-w-6xl space-y-8 pb-16">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" /> Zillow Research data{latest ? ` · through ${monthLabel(latest.month, true)}` : ""} · refreshed monthly
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">What it costs to live in Revere</h1>
          <p className="max-w-2xl text-sm text-slate-300 md:text-base">
            Typical home values and rents for Revere (ZIP 02151), compared with neighboring communities. These are Zillow's market-wide estimates, not individual listings.
          </p>
        </header>

        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">Housing data couldn't be loaded right now.</p>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {!rows && !error && [0, 1, 2, 3].map((i) => <div key={i} className="h-[128px] rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="skeleton mb-3 h-3 w-24" /><div className="skeleton h-8 w-32" /></div>)}
          {rows && latest && (
            <>
              <Stat i={0} icon={Home} label="Typical home value" value={usd(latest.value)} delta={change(rv, 12)} sub="vs a year ago" note={monthLabel(latest.month, true)} />
              <Stat i={1} icon={Home} label="5-year change" value={`${(change(rv, 60) ?? 0) >= 0 ? "+" : ""}${(change(rv, 60) ?? 0).toFixed(0)}%`} sub={rv.length > 60 ? `from ${usdK(rv[rv.length - 61].value)}` : ""} note="Home value" />
              {latestRent && <Stat i={2} icon={KeyRound} label="Typical rent" value={`${usd(latestRent.value)}/mo`} delta={change(rr, 12)} sub="vs a year ago" note={monthLabel(latestRent.month, true)} />}
              {latestRent && (
                <Stat i={3} icon={KeyRound} label="Income to afford rent" value={`${usdK(latestRent.value * 12 / 0.3)}/yr`} sub="at the 30%-of-income guideline" note="Derived from typical rent" />
              )}
            </>
          )}
        </section>

        {rows && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
                {([["zhvi", "Home values"], ["zori", "Rents"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setMetric(k)} aria-pressed={metric === k}
                    className={cn("relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors", metric === k ? "text-white" : "text-slate-400 hover:text-slate-200")}>
                    {metric === k && <motion.span layoutId="hm" className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/15" />}
                    <span className="relative">{l}</span>
                  </button>
                ))}
              </div>
              <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
                {([5, 10] as const).map((y) => (
                  <button key={y} onClick={() => setRange(y)} aria-pressed={range === y}
                    className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", range === y ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200")}>{y} yrs</button>
                ))}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {PLACES.map((p) => {
                const on = shown.includes(p);
                return (
                  <button key={p} onClick={() => setShown(on ? shown.filter((x) => x !== p) : [...shown, p])} aria-pressed={on}
                    disabled={p === "Revere"}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                      on ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-slate-400 hover:text-slate-200", p === "Revere" && "cursor-default")}>
                    <span className="h-2 w-2 rounded-full" style={{ background: on ? COLORS[p] : "transparent", boxShadow: `inset 0 0 0 1.5px ${COLORS[p]}` }} />{p}
                  </button>
                );
              })}
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(220 20% 100% / 0.06)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis tickFormatter={(v) => (metric === "zhvi" ? usdK(v) : `$${(v / 1e3).toFixed(1)}K`)} tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "hsl(222 40% 8%)", border: "1px solid hsl(0 0% 100% / 0.12)", borderRadius: 12, fontSize: 12 }}
                    labelFormatter={(m) => monthLabel(String(m), true)}
                    formatter={(v: number, n: string) => [metric === "zhvi" ? usd(v) : `${usd(v)}/mo`, n]}
                  />
                  {shown.map((p) => (
                    <Line key={p} type="monotone" dataKey={p} stroke={COLORS[p]} strokeWidth={p === "Revere" ? 3 : 1.75} dot={false} connectNulls isAnimationActive animationDuration={900} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {metric === "zhvi" ? "Zillow Home Value Index: typical value of mid-tier single-family homes and condos, smoothed and seasonally adjusted." : "Zillow Observed Rent Index: typical asking rent across all rental homes. Some smaller areas start later because Zillow needs enough listings."}
            </p>
          </section>
        )}

        {rows && (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-display text-lg font-semibold text-white">Revere and its neighbors</h2>
              <button onClick={() => ask("How do Revere home prices and rents compare to Chelsea, Everett and East Boston?")} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-highlight hover:bg-highlight/10">
                <Sparkles className="h-3.5 w-3.5" /> Ask about this
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-2.5 font-semibold">Place</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Home value</th>
                    <th className="px-3 py-2.5 text-right font-semibold">1-yr</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Rent</th>
                    <th className="px-5 py-2.5 text-right font-semibold">1-yr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {[...table].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map((t) => (
                    <tr key={t.place} className={cn(t.place === "Revere" && "bg-highlight/[0.07]")}>
                      <td className="px-5 py-3 font-medium text-white">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: COLORS[t.place] }} />{t.place}
                        <span className="ml-2 font-mono text-[11px] text-slate-500">{ZIP[t.place]}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-100">{t.value ? usd(t.value) : "—"}</td>
                      <td className="px-3 py-3 text-right"><Pct v={t.vYoY} /></td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-100">{t.rent ? `${usd(t.rent)}/mo` : "—"}</td>
                      <td className="px-5 py-3 text-right"><Pct v={t.rYoY} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-slate-500">“—” means Zillow doesn't publish a rent index for that ZIP code.</p>
          </section>
        )}

        <p className="text-xs leading-relaxed text-slate-500">
          Source: <a href={ZILLOW} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-highlight hover:underline">Zillow Research, ZHVI and ZORI by ZIP code <ExternalLink className="h-3 w-3" /></a>.
          Values are estimates for the whole ZIP code and can differ from any single home's price. New data is pulled automatically each month after Zillow publishes it.
        </p>
      </div>
    </DashboardLayout>
  );
}

function Pct({ v }: { v: number | null }) {
  if (v == null) return <span className="text-slate-500">—</span>;
  return <span className={cn("text-xs font-semibold tabular-nums", v >= 0 ? "text-amber-300" : "text-emerald-300")}>{v >= 0 ? "+" : ""}{v.toFixed(1)}%</span>;
}

function Stat({ i, icon: Icon, label, value, delta, sub, note }: { i: number; icon: typeof Home; label: string; value: string; delta?: number | null; sub?: string; note?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 26 }}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</span>
      <span className="mt-2 font-display text-3xl font-semibold tabular-nums text-white">{value}</span>
      <span className="mt-1 text-xs text-slate-400">{delta != null && <><Pct v={delta} /> </>}{sub}</span>
      {note && <span className="mt-auto pt-2 text-[11px] text-slate-500">{note}</span>}
    </motion.div>
  );
}
