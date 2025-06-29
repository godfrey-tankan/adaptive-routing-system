// src/pages/SimulationPage.tsx
import React, { useState, useCallback } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MapSection } from "@/components/MapSection";
import { SimulationControlPanel } from "@/components/SimulationControlPanel"; // New import
import maplibregl from "maplibre-gl"; // For mapInstance type

const SimulationPage: React.FC = () => {
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
    const [startMarker, setStartMarker] = useState<[number, number] | null>(null);
    const [endMarker, setEndMarker] = useState<[number, number] | null>(null);
    const [isMapLoading, setIsMapLoading] = useState(false); // Map's own loading state
    const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null); // MapLibre GL JS map instance
    const [simulatedVehiclePosition, setSimulatedVehiclePosition] = useState<[number, number] | null>(null);

    // Callback to receive the calculated route from the control panel and update map
    const handleRouteCalculated = useCallback((geoJSON: any | null, start: [number, number] | null, end: [number, number] | null) => {
        setRouteGeoJSON(geoJSON);
        setStartMarker(start);
        setEndMarker(end);
        if (!geoJSON) { // If route cleared, also clear vehicle position
            setSimulatedVehiclePosition(null);
        }
    }, []);

    // Callback to update the vehicle's position on the map
    const handleSimulatedPositionUpdate = useCallback((position: [number, number] | null) => {
        setSimulatedVehiclePosition(position);
    }, []);

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <main className="flex-1 flex flex-col">
                    <DashboardHeader />
                    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
                        {/* Map Section */}
                        <div className="flex-1 order-2 lg:order-1">
                            <MapSection
                                routeGeoJSON={routeGeoJSON}
                                startMarker={startMarker}
                                endMarker={endMarker}
                                isLoading={isMapLoading}
                                onMapInstanceReady={setMapInstance} // Get map instance
                                simulatedVehiclePosition={simulatedVehiclePosition} // Pass simulated vehicle position
                            />
                        </div>
                        {/* Simulation Controls Panel */}
                        <div className="w-full lg:w-96 order-1 lg:order-2">
                            <SimulationControlPanel
                                mapInstance={mapInstance}
                                onRouteCalculated={handleRouteCalculated}
                                onSimulatedPositionUpdate={handleSimulatedPositionUpdate}
                                setIsMapLoading={setIsMapLoading}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
};

export default SimulationPage;