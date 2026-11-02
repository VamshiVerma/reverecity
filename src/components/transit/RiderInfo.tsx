import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, dayAndTime, useNow } from "./mbta";
import { FeedStatus, Section } from "./ui";

const LINKS = [
  { href: "https://www.mbta.com/fares/charliecard", label: "CharlieCard", note: "Get one, reload it, or tap a credit card or phone at the gate" },
  { href: "https://www.mbta.com/fares", label: "Fares", note: "Subway and bus prices, passes and reduced fares" },
  { href: "https://www.mbta.com/schedules/Blue/line", label: "Blue Line schedule", note: "First and last trains, and the full timetable" },
  { href: "https://www.mbta.com/schedules/bus", label: "Bus schedules", note: "Timetables and maps for every route" },
  { href: "https://www.mbta.com/accessibility", label: "Accessibility", note: "The Ride, elevators, and help getting around" },
  { href: "https://www.mbta.com/customer-support", label: "Contact the MBTA", note: "Report a problem or lost item" },
];

export default function RiderInfo({ access, error, asOf }: { access: Alert[] | null; error: string | null; asOf: Date | null }) {
  const now = useNow(60_000);
  return (
    <section className="grid gap-3 lg:grid-cols-12">
      <Section id="access" className="lg:col-span-5" title="Are the elevators working?"
        sub="All four Revere stations are accessible. Outages at Wonderland, Revere Beach, Beachmont and Suffolk Downs show here."
        meta={<FeedStatus asOf={asOf} error={error} every="2 minutes" />}>
        {access == null && !error && <div className="skeleton h-16" />}
        {access == null && error && <p className="text-[14px] text-muted-foreground">Elevator status isn't available right now. Check <a className="font-medium text-foreground underline" href="https://www.mbta.com/accessibility/elevators" target="_blank" rel="noreferrer">mbta.com/accessibility</a>.</p>}
        {access && access.length === 0 && (
          <div className="flex items-center gap-3 rounded-[18px] bg-background/60 px-4 py-4 ring-1 ring-border">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" aria-hidden />
            <p className="text-[15px] font-medium text-foreground">Every elevator and escalator is working.</p>
          </div>
        )}
        {access && access.length > 0 && (
          <ul className="divide-y divide-border">
            {access.map((a) => {
              const start = a.periods.find((p) => p.start <= now)?.start;
              return (
                <li key={a.id} className="py-3 first:pt-0">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[13px] font-medium", "bg-warning/15 text-warning")}>{a.effect === "ESCALATOR_CLOSURE" ? "Escalator out" : "Elevator out"}</span>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">{a.header}</p>
                  {start && <p className="text-[13px] text-muted-foreground">Out since {dayAndTime(start, now)}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section className="lg:col-span-7" title="Fares, cards and schedules" sub="Pay with a CharlieCard, or tap a contactless card or phone at the gate or farebox. The MBTA's own pages have current prices and timetables.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" className="group flex h-full flex-col rounded-[18px] bg-background/60 px-4 py-3 ring-1 ring-border transition-colors hover:bg-secondary">
                <span className="flex items-center gap-1.5 text-[15px] font-medium text-foreground">{l.label} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" /></span>
                <span className="text-[13px] leading-snug text-muted-foreground">{l.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </section>
  );
}
