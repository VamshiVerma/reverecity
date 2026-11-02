
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ConversationProvider } from "@/contexts/ConversationContext";
import Assistant from "@/components/assistant/Assistant";
import Index from "./pages/Index";
import HousingPage from "./pages/HousingPage";
import BudgetPage from "./pages/BudgetPage";
import WeatherPage from "./pages/WeatherPage";
import RevenuePage from "./pages/RevenuePage";
import DemographicsPage from "./pages/DemographicsPage";
import EconomyPage from "./pages/EconomyPage";
import TransportationPage from "./pages/TransportationPage";
import CrimePage from "./pages/CrimePage";
import HealthPage from "./pages/HealthPage";
import EducationPage from "./pages/EducationPage";
import MBTAPage from "./pages/MBTAPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import PoliceLogsPage from "./pages/PoliceLogsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <TooltipProvider>
          <ConversationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/revenue" element={<RevenuePage />} />
                <Route path="/mbta" element={<MBTAPage />} />
                <Route path="/housing" element={<HousingPage />} />
                <Route path="/demographics" element={<DemographicsPage />} />
                <Route path="/economic" element={<EconomyPage />} />
                <Route path="/education" element={<EducationPage />} />
                <Route path="/crime" element={<CrimePage />} />
                <Route path="/health" element={<HealthPage />} />
                <Route path="/weather" element={<WeatherPage />} />
                <Route path="/transportation" element={<TransportationPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/police-logs" element={<PoliceLogsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>

              {/* Enhanced Real-time ChatBot - Available on all pages */}
              <Assistant />

            </BrowserRouter>
          </ConversationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
