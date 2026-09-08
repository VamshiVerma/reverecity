
import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AlertSystem from "./AlertSystem";
import VisitorTracker from "./VisitorTracker";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

const DashboardLayout = ({ children, pageTitle }: DashboardLayoutProps) => {
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
    <div className="flex min-h-screen w-full bg-dark-bg">
      <VisitorTracker />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-col flex-1 min-h-screen">
        <Header toggleSidebar={toggleSidebar} pageTitle={pageTitle} />
        <AlertSystem />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div key={pageTitle} className="mx-auto w-full max-w-7xl animate-rise space-y-6">
            {children}
          </div>
        </main>
        <footer className="border-t border-border/60 px-4 py-6 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} City of Revere, Massachusetts</p>
            <p className="text-muted-foreground/70">Built on public data · Updated automatically</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
