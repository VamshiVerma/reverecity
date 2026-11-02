
import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import LiveTicker from "./LiveTicker";
import PageHero from "./layout/PageHero";
import VisitorTracker from "./VisitorTracker";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  hero?: ReactNode;
}

const DashboardLayout = ({ children, pageTitle, hero }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Close sidebar by default on mobile devices
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);
  
  const toggleSidebar = () => {
    setSidebarOpen(prevState => !prevState);
  };

  // Set document title based on page title
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} | Revere, MA City Dashboard`;
    } else {
      document.title = "Revere, MA City Dashboard";
    }
  }, [pageTitle]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <VisitorTracker />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          <Header toggleSidebar={toggleSidebar} pageTitle={pageTitle} />
          <LiveTicker />
        </div>
        {hero ?? <PageHero />}
        <main className="flex-1 px-4 py-5 md:px-7 md:py-6">
          <div key={pageTitle} className="mx-auto w-full max-w-[1280px] animate-rise space-y-6">
            {children}
          </div>
        </main>
        <footer className="border-t border-border px-4 py-10 md:px-7">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <p className="text-[40px] font-semibold leading-none tracking-tight text-foreground md:text-[56px]">Revere<span className="text-highlight">.</span>City</p>
            <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
              An independent guide to Revere, Massachusetts. Figures come from the City's adopted budgets, the Revere Police public log, the MBTA,
              the National Weather Service, Open-Meteo and Zillow Research, and each one links to its source.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
