import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Mic, Moon, Search, Sun, X, Home, ShieldAlert, TrainFront, CloudSun, Landmark, Coins, House, Users, Briefcase, GraduationCap, HeartPulse, Bus, Shield, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const GROUPS: { label: string; links: { to: string; label: string; icon: LucideIcon; live?: boolean }[] }[] = [
  {
    label: "Live now",
    links: [
      { to: "/", label: "Today in Revere", icon: Home },
      { to: "/police-logs", label: "Police log", icon: ShieldAlert, live: true },
      { to: "/mbta", label: "Blue Line & buses", icon: TrainFront, live: true },
      { to: "/weather", label: "Weather", icon: CloudSun, live: true },
    ],
  },
  {
    label: "City money",
    links: [
      { to: "/budget", label: "Budget", icon: Landmark },
      { to: "/revenue", label: "Taxes & revenue", icon: Coins },
    ],
  },
  {
    label: "Neighborhood",
    links: [
      { to: "/housing", label: "Housing costs", icon: House },
      { to: "/demographics", label: "Who lives here", icon: Users },
      { to: "/economic", label: "Jobs & income", icon: Briefcase },
      { to: "/education", label: "Schools", icon: GraduationCap },
      { to: "/health", label: "Health", icon: HeartPulse },
      { to: "/transportation", label: "Commuting", icon: Bus },
      { to: "/crime", label: "Safety overview", icon: Shield },
    ],
  },
];

/** The mark: an R whose leg runs out into a wave, the shoreline Revere is known for. */
export function RevereMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="hsl(var(--brand))" />
      <path d="M10 23V9h6.2c2.9 0 4.8 1.7 4.8 4.2 0 2.1-1.3 3.6-3.4 4L22 23" fill="none" stroke="hsl(var(--background))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 27c2.2-1.6 4.4-1.6 6.6 0s4.4 1.6 6.6 0 4.4-1.6 6.6 0" fill="none" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && toggleSidebar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobile, isOpen, toggleSidebar]);

  const { resolvedTheme, setTheme } = useTheme();
  const ask = (voice = false) => { close(); window.dispatchEvent(new CustomEvent("revere:ask", { detail: voice ? { voice: true } : undefined })); };
  const close = () => { if (isMobile && isOpen) toggleSidebar(); };

  return (
    <>
      {isMobile && isOpen && <div className="fixed inset-0 z-40 bg-black/70" onClick={toggleSidebar} />}
      <aside
        ref={ref}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col border-r border-border bg-background transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-[72px] items-center justify-between px-5">
          <NavLink to="/" onClick={close} className="flex items-center gap-2.5">
            <RevereMark className="h-8 w-8" />
            <span className="text-[17px] font-semibold tracking-tight text-foreground">Revere<span className="text-muted-foreground">.City</span></span>
          </NavLink>
          {isMobile && (
            <button onClick={toggleSidebar} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 px-3 pb-2">
          <button onClick={() => ask()} className="flex h-10 flex-1 items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-transform active:scale-[0.98]">
            <Search className="h-4 w-4" /> Ask Revere
            <kbd className="ml-auto font-sans text-[12px] opacity-60">/</kbd>
          </button>
          <button onClick={() => ask(true)} aria-label="Ask by voice" className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-accent">
            <Mic className="h-[18px] w-[18px]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-6 last:mb-0">
              <p className="px-3 pb-1.5 text-[12.5px] font-medium text-muted-foreground/80">{g.label}</p>
              {g.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end
                  onClick={close}
                  className={({ isActive }) =>
                    cn(
                      "group flex h-[38px] items-center gap-3 rounded-[12px] px-3 text-[14.5px] transition-colors",
                      isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <l.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-highlight-secondary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 truncate">{l.label}</span>
                      {l.live && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-highlight-secondary">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-highlight-secondary motion-reduce:animate-none" />Live
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <NavLink to="/" onClick={close} className="group relative mx-3 mb-2 hidden h-[132px] shrink-0 overflow-hidden rounded-[18px] [@media(min-height:1000px)]:block">
          <img src="/images/revere-beach-carnival-postcard.jpg" alt="Postcard of Carnival Week crowds on Revere Beach, early 1900s" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgba(2,7,10,0.92))]" />
          <span className="absolute bottom-2.5 left-3 right-3 text-white">
            <span className="block text-[15px] font-semibold leading-tight">America's first public beach</span>
            <span className="block text-[11.5px] text-white/70">Revere Beach, opened 1896</span>
          </span>
        </NavLink>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="text-[13px] text-muted-foreground">{resolvedTheme === "dark" ? "Dark mode" : "Light mode"}</span>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {resolvedTheme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
