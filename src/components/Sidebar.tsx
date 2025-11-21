import { cn } from "@/lib/utils";
import { NavLink, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Home,
  Menu,
  X,
  PieChart,
  DollarSign,
  Building,
  CloudSun,
  Users,
  ChevronRight,
  BookOpen,
  Shield,
  Heart,
  TrendingUp,
  BarChart,
  Bus,
  TrainFront,
  FileText,
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
  
  // Close sidebar when navigating on mobile
  const handleMobileNavigation = () => {
    if (isMobile && isOpen) {
      toggleSidebar();
    }
  };
  
  const location = useLocation();
  
  // Handle clicking outside sidebar on mobile
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Only run this on mobile when sidebar is open
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

    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMobile, isOpen, toggleSidebar]);

  const sidebarLinks = [
    { to: "/", label: "Dashboard", icon: <Home className="mr-2 h-5 w-5" /> },
    { to: "/budget", label: "Budget", icon: <PieChart className="mr-2 h-5 w-5" /> },
    { to: "/revenue", label: "Revenue", icon: <DollarSign className="mr-2 h-5 w-5" /> },
    { to: "/ai-insights", label: "AI Insights", icon: <BarChart className="mr-2 h-5 w-5" /> },
    { to: "/mbta", label: "MBTA", icon: <TrainFront className="mr-2 h-5 w-5" /> },
    { to: "/housing", label: "Housing", icon: <Building className="mr-2 h-5 w-5" /> },
    { to: "/demographics", label: "Demographics", icon: <Users className="mr-2 h-5 w-5" /> },
    { to: "/economic", label: "Economy", icon: <TrendingUp className="mr-2 h-5 w-5" /> },
    { to: "/education", label: "Education", icon: <BookOpen className="mr-2 h-5 w-5" /> },
    { to: "/crime", label: "Public Safety", icon: <Shield className="mr-2 h-5 w-5" /> },
    { to: "/police-logs", label: "Police Logs", icon: <FileText className="mr-2 h-5 w-5" /> },
    { to: "/health", label: "Health", icon: <Heart className="mr-2 h-5 w-5" /> },
    { to: "/weather", label: "Weather", icon: <CloudSun className="mr-2 h-5 w-5" /> },
    { 
      to: "/transportation", 
      label: "Transportation", 
      icon: <Bus className="mr-2 h-5 w-5" />,
    },
  ];
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Sidebar Toggle Button */}
      <button 
        ref={mobileButtonRef}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-highlight shadow-lg md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-64 transition-transform duration-300 bg-gray-900 md:relative",
          isOpen ? "translate-x-0" : "-translate-x-full md:w-20"
        )}
      >
        <div className={cn("p-4 border-b border-gray-800", !isOpen && "md:items-center md:p-2")}>
          <div className={cn("flex items-center", !isOpen && "md:justify-center")}>
            <span className={cn("text-xl font-bold text-white", !isOpen && "md:hidden")}>Revere City</span>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-4">
            {sidebarLinks.map((link) => (
              <Button
                key={link.to}
                variant="ghost"
                className={cn(
                  "w-full justify-start mb-1",
                  !isOpen && "md:justify-center",
                  isActive(link.to) && "bg-muted"
                )}
                asChild
              >
                <NavLink 
                  to={link.to} 
                  onClick={handleMobileNavigation}
                >
                  <div className="flex items-center">
                    {link.icon}
                    <span className={cn("text-sm", !isOpen && "md:hidden")}>{link.label}</span>
                  </div>
                  <ChevronRight className={cn("ml-auto h-4 w-4", !isOpen && "md:hidden", isActive(link.to) ? "opacity-100" : "opacity-0")} />
                </NavLink>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};

export default Sidebar;
