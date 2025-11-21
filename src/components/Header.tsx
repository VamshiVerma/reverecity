
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
  pageTitle?: string;
}

const Header = ({ toggleSidebar, pageTitle }: HeaderProps) => {
  return (
    <header className="bg-gray-900 border-b border-gray-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold text-light-text">
            {pageTitle || "Revere City Insights"}
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
