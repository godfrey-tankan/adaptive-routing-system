// src/pages/Dashboard.tsx
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MapSection } from "@/components/MapSection";
import { RouteControlPanel } from "@/components/RouteControlPanel";
import maplibregl from "maplibre-gl";

const Dashboard = () => {
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [startMarker, setStartMarker] = useState<[number, number] | null>(null);
  const [endMarker, setEndMarker] = useState<[number, number] | null>(null);
  const [isMapAndRouteLoading, setIsMapAndRouteLoading] = useState(false);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  const updateMapWithRoute = (
    startCoords: [number, number] | null,
    endCoords: [number, number] | null,
    geoJSON: any | null
  ) => {
    setStartMarker(startCoords);
    setEndMarker(endCoords);
    setRouteGeoJSON(geoJSON);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
            <div className="flex-1 order-2 lg:order-1">
              <MapSection
                routeGeoJSON={routeGeoJSON}
                startMarker={startMarker}
                endMarker={endMarker}
                isLoading={isMapAndRouteLoading}
                onMapInstanceReady={setMapInstance}
              />
            </div>
            <div className="w-full lg:w-96 order-1 lg:order-2">
              <RouteControlPanel
                updateMapWithRoute={updateMapWithRoute}
                setIsLoadingMapAndRoute={setIsMapAndRouteLoading}
                mapInstance={mapInstance}
              />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;