
import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AlertSystem from "./AlertSystem";
import VisitorTracker from "./VisitorTracker";
import RealDataChatBot from "./ChatBot/RealDataChatBot";
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
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
        <footer className="p-4 border-t border-gray-800 text-center text-sm text-muted-foreground">
          <div className="max-w-7xl mx-auto">
            <p>© {new Date().getFullYear()} City of Revere, Massachusetts. Data from public sources.</p>
            <p className="mt-1">Last updated: May 8, 2025</p>
          </div>
        </footer>
      </div>
      <RealDataChatBot currentPage={pageTitle?.toLowerCase() || 'dashboard'} />
    </div>
  );
};

export default DashboardLayout;
