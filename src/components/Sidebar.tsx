import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Mic, Moon, Search, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const GROUPS: { label: string; links: { to: string; label: string; live?: boolean }[] }[] = [
  {
    label: "Right now",
    links: [
      { to: "/", label: "Overview" },
      { to: "/police-logs", label: "Police log", live: true },
      { to: "/mbta", label: "Blue Line & buses", live: true },
      { to: "/weather", label: "Weather", live: true },
    ],
  },
  {
    label: "City money",
    links: [
      { to: "/budget", label: "Budget" },
      { to: "/revenue", label: "Revenue" },
    ],
  },
  {
    label: "Living here",
    links: [
      { to: "/housing", label: "Housing" },
      { to: "/demographics", label: "People" },
      { to: "/economic", label: "Jobs & economy" },
      { to: "/education", label: "Schools" },
      { to: "/health", label: "Health" },
      { to: "/transportation", label: "Getting around" },
      { to: "/crime", label: "Public safety" },
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
              <p className="px-3 pb-1.5 text-[13px] text-muted-foreground">{g.label}</p>
              {g.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end
                  onClick={close}
                  className={({ isActive }) =>
                    cn(
                      "flex h-[34px] items-center justify-between rounded-[10px] px-3 text-[14.5px] transition-colors",
                      isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
                    )
                  }
                >
                  {l.label}
                  {l.live && <span className="h-1.5 w-1.5 rounded-full bg-highlight" aria-label="updates live" />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-[12px] leading-snug text-muted-foreground">Independent, from public data</p>
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
