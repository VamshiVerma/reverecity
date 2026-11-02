import { Menu, Mic } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
  pageTitle?: string;
}

const ask = (detail?: { q?: string; voice?: boolean }) => window.dispatchEvent(new CustomEvent("revere:ask", { detail }));

const Header = ({ toggleSidebar, pageTitle }: HeaderProps) => (
  // Phones only: the desktop shell has no top bar (the page title sits on the canvas).
  <header className="flex h-12 items-center gap-2 border-b border-border bg-background px-2 md:hidden">
    <button onClick={toggleSidebar} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
      <Menu className="h-5 w-5" />
    </button>
    <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-foreground">{pageTitle || "Overview"}</span>
    <button onClick={() => ask({ voice: true })} aria-label="Ask by voice" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground active:scale-95">
      <Mic className="h-[17px] w-[17px]" />
    </button>
  </header>
);

export default Header;
