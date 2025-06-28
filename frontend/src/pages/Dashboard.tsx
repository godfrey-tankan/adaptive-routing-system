// src/Dashboard.tsx
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MapSection } from "@/components/MapSection";
import { RouteControlPanel } from "@/components/RouteControlPanel";

const Dashboard = () => {
  const [routeDataForMap, setRouteDataForMap] = useState<any>(null);
  const [startCoordsForMap, setStartCoordsForMap] = useState<[number, number] | null>(null);
  const [endCoordsForMap, setEndCoordsForMap] = useState<[number, number] | null>(null);

  const updateMapWithRoute = (start: [number, number], end: [number, number], geoJSON: any) => {
    setStartCoordsForMap(start);
    setEndCoordsForMap(end);
    setRouteDataForMap(geoJSON);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
            <div className="flex-1 order-2 lg:order-1">
              <MapSection
                routeGeoJSON={routeDataForMap}
                startMarker={startCoordsForMap}
                endMarker={endCoordsForMap}
              />
            </div>
            <div className="w-full lg:w-96 order-1 lg:order-2">
              <RouteControlPanel updateMapWithRoute={updateMapWithRoute} />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;