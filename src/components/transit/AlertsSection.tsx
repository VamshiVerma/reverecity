import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, alertWhen, dayAndTime, useNow } from "./mbta";
import { FeedDown, FeedStatus, Section } from "./ui";

const EFFECT: Record<string, string> = {
  DELAY: "Delays", DETOUR: "Detour", SHUTTLE: "Shuttle buses", SUSPENSION: "No service", STOP_CLOSURE: "Stop closed",
  STATION_CLOSURE: "Station closed", STOP_MOVE: "Stop moved", STOP_MOVED: "Stop moved", SERVICE_CHANGE: "Service change",
  SCHEDULE_CHANGE: "Schedule change", TRACK_CHANGE: "Track change", CANCELLATION: "Trip cancelled", NO_SERVICE: "No service",
  SNOW_ROUTE: "Snow route", STATION_ISSUE: "Station issue", ELEVATOR_CLOSURE: "Elevator out", ESCALATOR_CLOSURE: "Escalator out",
  ACCESS_ISSUE: "Access issue", PARKING_ISSUE: "Parking", PARKING_CLOSURE: "Parking closed", EXTRA_SERVICE: "Extra service", SUMMARY: "Notice",
};
const SEVERE = new Set(["SUSPENSION", "SHUTTLE", "STATION_CLOSURE", "NO_SERVICE"]);
export const effectLabel = (e: string) => EFFECT[e] ?? e.charAt(0) + e.slice(1).toLowerCase().replace(/_/g, " ");

function tone(a: Alert) {
  if (SEVERE.has(a.effect)) return { label: "Major", pill: "bg-destructive/15 text-destructive", bar: "bg-destructive" };
  if (a.severity >= 7) return { label: "Significant", pill: "bg-warning/15 text-warning", bar: "bg-warning" };
  return { label: "Minor", pill: "bg-secondary text-muted-foreground", bar: "bg-muted-foreground/50" };
}

function howLong(a: Alert, now: number, when: "now" | "soon" | "past") {
  const real = a.periods.filter((p) => p.start > Date.UTC(2000, 0, 1)).sort((x, y) => x.start - y.start);
  const cur = real.find((p) => p.start <= now && (p.end == null || p.end > now));
  const next = real.find((p) => p.start > now);
  if (when === "now") {
    if (cur?.end) return `Since ${dayAndTime(cur.start, now)}, expected until ${dayAndTime(cur.end, now)}`;
    if (cur) return `Since ${dayAndTime(cur.start, now)}, no end time given`;
    return `Posted ${dayAndTime(a.updated, now)}`;
  }
  if (next) return `${a.timeframe ? `${a.timeframe} · ` : ""}Starts ${dayAndTime(next.start, now)}${next.end ? `, ends ${dayAndTime(next.end, now)}` : ""}`;
  return a.timeframe ?? "Planned";
}

const routeName = (r: string) => (r === "Blue" ? "Blue Line" : r);

export function AlertCard({ a, now, when }: { a: Alert; now: number; when: "now" | "soon" | "past" }) {
  const [open, setOpen] = useState(false);
  const t = tone(a);
  const detail = a.description && a.description !== a.header;
  const stops = a.stops.slice(0, 5);
  return (
    <li className="relative grid grid-cols-[4px_1fr] gap-x-4 py-4 first:pt-1 last:pb-1">
      <span className={cn("rounded-full", t.bar)} aria-hidden />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px]">
          <span className={cn("rounded-full px-2.5 py-0.5 font-medium", t.pill)}>{effectLabel(a.effect)}</span>
          <span className="text-muted-foreground">{t.label}</span>
          {a.routes.filter((r) => r !== "Blue" || a.routes.length < 6).slice(0, 6).map((r) => (
            <span key={r} className={cn("figure rounded-full px-2 py-0.5 text-[12.5px] tracking-normal", r === "Blue" ? "bg-highlight/15 text-highlight" : "bg-secondary text-foreground")}>{routeName(r)}</span>
          ))}
        </div>
        <p className="mt-2 max-w-[78ch] text-[15px] leading-relaxed text-foreground">{a.header}</p>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{howLong(a, now, when)}</p>
        {stops.length > 0 && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {stops.length === 1 ? "Stop" : "Stops"}: <span className="text-foreground/85">{stops.join(", ")}{a.stops.length > stops.length ? ` and ${a.stops.length - stops.length} more` : ""}</span>
          </p>
        )}
        {detail && (
          <>
            <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-foreground hover:underline">
              {open ? "Hide details" : "Details"} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>
            {open && <p className="mt-2 max-w-[78ch] whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">{a.description.replace(/\r/g, "")}</p>}
          </>
        )}
      </div>
    </li>
  );
}

export default function AlertsSection({ alerts, error, asOf, accessCount }: { alerts: Alert[] | null; error: string | null; asOf: Date | null; accessCount: number }) {
  const now = useNow(30_000);
  const { current, planned } = useMemo(() => {
    const cur: Alert[] = [], plan: Alert[] = [];
    for (const a of alerts ?? []) {
      const w = alertWhen(a, now);
      if (w === "now") cur.push(a);
      else if (w === "soon") plan.push(a);
    }
    const rank = (a: Alert) => (SEVERE.has(a.effect) ? 100 : 0) + a.severity + (a.routes.includes("Blue") ? 0.5 : 0);
    cur.sort((x, y) => rank(y) - rank(x));
    const start = (a: Alert) => Math.min(...a.periods.filter((p) => p.start > now).map((p) => p.start), Infinity);
    plan.sort((x, y) => start(x) - start(y));
    return { current: cur, planned: plan.filter((a) => start(a) - now < 21 * 864e5) };
  }, [alerts, now]);

  return (
    <Section id="alerts" title="Is anything wrong right now?" sub="Alerts on the Blue Line and the bus routes through Revere."
      meta={<FeedStatus asOf={asOf} error={error} every="minute" />}>
      {alerts == null && !error && <div className="space-y-2"><div className="skeleton h-20" /><div className="skeleton h-20" /></div>}
      {alerts == null && error && <FeedDown what="alerts" />}
      {alerts && (
        current.length === 0 ? (
          <div className="flex items-center gap-3 rounded-[18px] bg-background/60 px-4 py-4 ring-1 ring-border">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" aria-hidden />
            <p className="text-[17px] font-medium text-foreground">No alerts. <span className="font-normal text-muted-foreground">The Blue Line and Revere's buses are running normally.</span></p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[15px] text-foreground">
              <span className="figure text-[17px]">{current.length}</span> active {current.length === 1 ? "alert" : "alerts"}
            </p>
            <ul className="divide-y divide-border">{current.map((a) => <AlertCard key={a.id} a={a} now={now} when="now" />)}</ul>
          </>
        )
      )}
      {accessCount > 0 && (
        <p className="mt-3 text-[13.5px] text-muted-foreground">
          Also: {accessCount} {accessCount === 1 ? "elevator or escalator is" : "elevators or escalators are"} out at Revere stations. <a href="#access" className="font-medium text-foreground underline underline-offset-2">See which</a>
        </p>
      )}
      {planned.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[15px] font-semibold text-foreground">Coming up</h3>
          <p className="text-[13px] text-muted-foreground">Planned work and changes in the next three weeks.</p>
          <ul className="mt-2 divide-y divide-border">{planned.map((a) => <AlertCard key={a.id} a={a} now={now} when="soon" />)}</ul>
        </div>
      )}
    </Section>
  );
}
