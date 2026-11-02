import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

// One header for every page: the same sunrise light, a serif title with one italic cantaloupe word.
const PAGES: Record<string, { kicker: string; title: string; accent: string; text: string }> = {
  "/police-logs": { kicker: "Revere Police Department public log", title: "What police were", accent: "called for", text: "Every call from the department's published dispatch log, in plain English. New logs are added automatically when they're posted." },
  "/mbta": { kicker: "MBTA · live", title: "The Blue Line &", accent: "buses", text: "Alerts, the next trains and buses, and how the line is running at Wonderland, Revere Beach, Beachmont, Suffolk Downs and the bus stops in between. Straight from the MBTA, updated every few seconds." },
  "/weather": { kicker: "Open-Meteo forecast · National Weather Service alerts", title: "Weather on the", accent: "beach", text: "Conditions right now, the week ahead and any active warnings for Revere." },
  "/budget": { kicker: "FY2027 & FY2026 adopted budgets", title: "Where the money", accent: "goes", text: "Search any department, compare it with last year and open the exact page in the city's budget document." },
  "/revenue": { kicker: "FY2027 adopted budget · revenue section", title: "How Revere", accent: "pays for it", text: "Property taxes, state aid and local fees over ten years, using the city's own figures. Striped bars are projections." },
  "/housing": { kicker: "Zillow Research · refreshed monthly", title: "What it costs to", accent: "live here", text: "Typical home values and rents for Revere (02151) next to the communities around it." },
  "/demographics": { kicker: "U.S. Census Bureau · American Community Survey", title: "Who lives in", accent: "Revere", text: "How many people live here, where they were born, how old they are and whether they rent or own, next to Massachusetts as a whole." },
  "/economic": { kicker: "U.S. Census Bureau · American Community Survey", title: "How Revere", accent: "earns a living", text: "Household incomes, what residents do for work and what it pays, and who lives below the poverty line, next to the state." },
  "/education": { kicker: "Revere Public Schools", title: "Revere's", accent: "schools", text: "Enrollment, outcomes and the district's budget." },
  "/health": { kicker: "Census Bureau · CDC PLACES", title: "Keeping Revere", accent: "healthy", text: "Who has health insurance, who goes without, and how Revere adults are doing on checkups, chronic conditions and everyday needs." },
  "/transportation": { kicker: "Census Bureau · American Community Survey", title: "Getting to", accent: "work", text: "How Revere residents commute, how long it takes and how that compares with the rest of Massachusetts." },
  "/crime": { kicker: "Public safety", title: "Staying", accent: "safe", text: "Safety measures for Revere. For what happened this week, see the police log." },
  "/analytics": { kicker: "Site", title: "Visitor", accent: "analytics", text: "How people use Revere.City." },
};

export default function PageHero() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const p = PAGES[pathname];
  if (!p) return null;
  const rise = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 18, filter: "blur(6px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, transition: { delay: d, duration: 0.8, ease: [0.22, 1, 0.36, 1] } });
  return (
    <section className="relative isolate overflow-hidden text-white" aria-label={`${p.title} ${p.accent}`}>
      <div className="sunrise sunrise-band" aria-hidden><div className="glow-blue" /><div className="glow-sun" /><div className="streaks" /><div className="horizon" /><div className="grain" /></div>
      <div className="relative mx-auto grid max-w-[1280px] gap-x-10 gap-y-2 px-4 pb-6 pt-7 md:grid-cols-[auto_1fr] md:items-end md:px-7 md:pb-7 md:pt-9">
        <div>
        <motion.p {...rise(0)} className="text-[12.5px] text-white/65">{p.kicker}</motion.p>
        <h1 className="mt-1 font-serif-display text-[clamp(38px,4.4vw,60px)] leading-[0.98] tracking-[-0.02em]">
          <motion.span {...rise(0.08)} className="inline-block">{p.title}</motion.span>{" "}
          <motion.em {...rise(0.2)} className="inline-block italic text-highlight-secondary">{p.accent}.</motion.em>
        </h1>
        </div>
        <motion.p {...rise(0.32)} className="max-w-[560px] text-[15px] leading-relaxed text-white/75 md:justify-self-end md:pb-1.5 md:text-right">{p.text}</motion.p>
      </div>
    </section>
  );
}
