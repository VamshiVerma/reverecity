import DashboardLayout from "@/components/DashboardLayout";
import { useAccessAlerts, useBlueVehicles, useBusPredictions, useRouteAlerts, useTrainPredictions } from "@/components/transit/mbta";
import AlertsSection from "@/components/transit/AlertsSection";
import DepartureBoard from "@/components/transit/DepartureBoard";
import BusBoard from "@/components/transit/BusBoard";
import LineHealth from "@/components/transit/LineHealth";
import RiderInfo from "@/components/transit/RiderInfo";

// Live Blue Line and bus information for Revere, straight from the MBTA's v3 API.
// About 8 requests a minute in total: trains every 20s, buses and train locations every 30s,
// alerts every minute and elevator status every two.
export default function MBTAPage() {
  const alerts = useRouteAlerts();
  const access = useAccessAlerts();
  const trains = useTrainPredictions();
  const buses = useBusPredictions();
  const vehicles = useBlueVehicles();

  return (
    <DashboardLayout pageTitle="Blue Line & buses">
      <div className="space-y-4">
        <AlertsSection alerts={alerts.data} error={alerts.error} asOf={alerts.asOf} accessCount={access.data?.length ?? 0} />
        <DepartureBoard trains={trains.data} error={trains.error} asOf={trains.asOf} />
        <BusBoard buses={buses.data} error={buses.error} asOf={buses.asOf} />
        <LineHealth vehicles={vehicles.data} trains={trains.data} error={vehicles.error} asOf={vehicles.asOf} />
        <RiderInfo access={access.data} error={access.error} asOf={access.asOf} />
      </div>
    </DashboardLayout>
  );
}
