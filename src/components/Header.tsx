import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  toggleSidebar: () => void;
  pageTitle?: string;
}

const TITLES: Record<string, string> = {
  "/": "Today in Revere", "/police-logs": "Police log", "/mbta": "Blue Line & buses", "/weather": "Weather", "/budget": "Budget",
  "/revenue": "Taxes & revenue", "/housing": "Housing costs", "/demographics": "Who lives here", "/economic": "Jobs & income",
  "/education": "Schools", "/health": "Health", "/transportation": "Commuting", "/crime": "Safety overview",
};

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { pathname } = useLocation();
  return (
  // Phones only: the desktop shell has no top bar (the page title sits on the canvas).
  <header className="flex h-12 items-center gap-2 border-b border-border bg-background px-2 md:hidden">
    <button onClick={toggleSidebar} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
      <Menu className="h-5 w-5" />
    </button>
    <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-foreground">{TITLES[pathname] ?? "Revere.City"}</span>
  </header>
  );
};

export default Header;
