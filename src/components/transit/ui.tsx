import { cn } from "@/lib/utils";
import { clock } from "./mbta";

/** A page section whose heading is the question it answers. */
export function Section({ id, title, sub, meta, className, children }: { id?: string; title: string; sub?: React.ReactNode; meta?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={cn("rounded-[24px] bg-card p-4 md:p-6", className)}>
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0">
          <h2 id={id ? `${id}-h` : undefined} className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
          {sub && <p className="text-[13px] text-muted-foreground">{sub}</p>}
        </div>
        {meta && <div className="shrink-0 text-[13px] text-muted-foreground">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

export function Figure({ label, value, unit, note, accent }: { label: string; value: string | number | null; unit?: string; note: string; accent?: boolean }) {
  return (
    <div className="flex min-h-[116px] flex-col rounded-[20px] bg-background/60 p-4 ring-1 ring-border">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {value == null ? <span className="skeleton mt-2 h-8 w-20" /> : (
        <span className={cn("figure mt-1 text-[32px] leading-tight md:text-[38px]", accent ? "text-highlight-secondary" : "text-foreground")}>
          {value}{unit && <span className="ml-1 font-sans text-[15px] tracking-normal text-muted-foreground">{unit}</span>}
        </span>
      )}
      <span className="mt-auto pt-1.5 text-[12.5px] leading-snug text-muted-foreground">{note}</span>
    </div>
  );
}

/** "Updated 4:12 PM" or, when the feed fails, an honest note about what's on screen. */
export function FeedStatus({ asOf, error, every, dark }: { asOf: Date | null; error: string | null; every: string; dark?: boolean }) {
  if (error) return <span className={dark ? "text-[#ffd79a]" : "text-warning"}>{error} {asOf ? `Showing what we had at ${clock(asOf)}.` : ""} Retrying every {every}.</span>;
  if (!asOf) return <span>Checking the MBTA…</span>;
  return <span>Live from the MBTA · updated {clock(asOf)}</span>;
}

/** Shown in place of content when a feed has never loaded. */
export function FeedDown({ what, dark }: { what: string; dark?: boolean }) {
  return (
    <div className={cn("rounded-[18px] px-4 py-6 text-center text-[15px]", dark ? "bg-white/[0.06] text-white/80 ring-1 ring-white/10" : "bg-background/60 text-muted-foreground ring-1 ring-border")}>
      We couldn't load {what} from the MBTA just now. This page will keep trying, or check{" "}
      <a href="https://www.mbta.com/alerts" target="_blank" rel="noreferrer" className={cn("font-medium underline underline-offset-2", dark ? "text-white" : "text-foreground")}>mbta.com</a>.
    </div>
  );
}
