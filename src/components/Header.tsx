import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
  pageTitle?: string;
}

const Header = ({ toggleSidebar, pageTitle }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="eyebrow hidden sm:block">City of Revere · Massachusetts</span>
            <h1 className="font-display text-lg font-semibold tracking-tight text-foreground md:text-xl">
              {pageTitle || "Overview"}
            </h1>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live data
        </div>
      </div>
    </header>
  );
};

export default Header;
