import { cn } from "@/lib/utils";
import { NavLink, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  Menu,
  X,
  PieChart,
  DollarSign,
  Building,
  CloudSun,
  Users,
  BookOpen,
  Shield,
  Heart,
  TrendingUp,
  Bus,
  TrainFront,
  FileText,
  Waves,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useRef } from "react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  const handleMobileNavigation = () => {
    if (isMobile && isOpen) toggleSidebar();
  };

  const location = useLocation();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isMobile && isOpen) {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target as Node) &&
          mobileButtonRef.current &&
          !mobileButtonRef.current.contains(event.target as Node)
        ) {
          toggleSidebar();
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isMobile, isOpen, toggleSidebar]);

  const sidebarLinks = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/budget", label: "Budget", icon: PieChart },
    { to: "/revenue", label: "Revenue", icon: DollarSign },
    { to: "/mbta", label: "MBTA", icon: TrainFront },
    { to: "/housing", label: "Housing", icon: Building },
    { to: "/demographics", label: "Demographics", icon: Users },
    { to: "/economic", label: "Economy", icon: TrendingUp },
    { to: "/education", label: "Education", icon: BookOpen },
    { to: "/crime", label: "Public Safety", icon: Shield },
    { to: "/police-logs", label: "Police Logs", icon: FileText },
    { to: "/health", label: "Health", icon: Heart },
    { to: "/weather", label: "Weather", icon: CloudSun },
    { to: "/transportation", label: "Transportation", icon: Bus },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile toggle FAB */}
      <button
        ref={mobileButtonRef}
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-highlight to-[hsl(199_91%_46%)] text-primary-foreground shadow-glow md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-[width,transform] duration-300 md:relative",
          isOpen ? "w-64 translate-x-0" : "-translate-x-full md:w-[76px] md:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-16 items-center gap-3 px-4", !isOpen && "md:justify-center md:px-0")}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-highlight to-[hsl(199_91%_44%)] text-primary-foreground shadow-glow">
            <Waves className="h-5 w-5" />
          </div>
          <div className={cn("flex flex-col leading-none", !isOpen && "md:hidden")}>
            <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
              Revere City
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">Civic Insights</span>
          </div>
        </div>

        <div className="mx-4 divider-glow" />

        <ScrollArea className="flex-1 px-3">
          <nav className="flex flex-col gap-0.5 py-4">
            {!isOpen ? null : (
              <p className="px-2 pb-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                Navigation
              </p>
            )}
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={handleMobileNavigation}
                  title={link.label}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    !isOpen && "md:justify-center md:px-0",
                    active
                      ? "bg-highlight/10 text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  )}
                >
                  {/* active accent rail */}
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-highlight transition-all",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active ? "text-highlight" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className={cn("truncate", !isOpen && "md:hidden")}>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>

        <div className={cn("border-t border-sidebar-border p-4", !isOpen && "md:px-2")}>
          <p className={cn("text-[11px] leading-relaxed text-muted-foreground/70", !isOpen && "md:hidden")}>
            Data from public sources
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
