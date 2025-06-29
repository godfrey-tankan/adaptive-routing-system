// src/components/SimulationControlPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, FastForward, Rewind, Map, Route, Loader2, CarFront, Clock, SlidersHorizontal } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';
import maplibregl, { LngLatBounds } from "maplibre-gl";

import { PlaceSearchInput, GeoPoint } from '@/components/map/PlaceSearchInput';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_Maps_API_KEY;

interface SimulationControlPanelProps {
    mapInstance: maplibregl.Map | null;
    // Callback to update the main route GeoJSON for the map
    onRouteCalculated: (geoJSON: any | null, start: [number, number] | null, end: [number, number] | null) => void;
    // Callback to update the simulated vehicle position
    onSimulatedPositionUpdate: (position: [number, number] | null) => void;
    // Callback to update loading state for the map
    setIsMapLoading: (isLoading: boolean) => void;
}

export const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
    mapInstance,
    onRouteCalculated,
    onSimulatedPositionUpdate,
    setIsMapLoading,
}) => {
    const [startPoint, setStartPoint] = useState<GeoPoint | null>(null);
    const [endPoint, setEndPoint] = useState<GeoPoint | null>(null);
    const [transportMode, setTransportMode] = useState<string>('DRIVING');
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [calculatedRouteData, setCalculatedRouteData] = useState<any | null>(null); // Stores the full route object
    const [isPlaying, setIsPlaying] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState<number[]>([1]); // Default 1x speed (for slider)
    const [currentSimulationTime, setCurrentSimulationTime] = useState(0); // In seconds
    const animationFrameId = useRef<number | null>(null);
    const simulationStartTime = useRef<number>(0);
    const routeCoordinates = useRef<[number, number][] | null>(null); // Store parsed route coordinates

    // Decode Google Encoded Polylines (reused from RouteControlPanel)
    const decodePolyline = useCallback((encoded: string): [number, number][] => {
        let poly = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push([lng / 1E5, lat / 1E5]); // [longitude, latitude]
        }
        return poly;
    }, []);

    // Function to fetch route directions (similar to RouteControlPanel)
    const getRoute = useCallback(async (
        startPlaceId: string,
        endPlaceId: string,
        mode: string,
    ) => {
        try {
            // Call your backend instead of Google directly
            const response = await axios.post('/api/simulate/', {
                startPlaceId,
                endPlaceId,
                mode,
                departureTime: 'now',
                trafficModel: 'best_guess'
            });

            const data = response.data;

            if (data.route) {
                const route = data.route;
                const decodedPath = decodePolyline(route.overview_polyline.points);

                const geoJSONFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: decodedPath,
                    },
                    properties: {}
                };

                return {
                    geoJSON: geoJSONFeature,
                    distance: route.distance.value || 0,
                    duration: route.duration_in_traffic?.value || route.duration?.value || 0,
                    rawCoordinates: decodedPath
                };
            }

            toast({ title: "No Route Found", description: "Could not find a route between the selected locations.", variant: "destructive" });
            return null;
        } catch (error: any) {
            console.error("Error fetching route:", error);
            toast({
                title: "Route Calculation Failed",
                description: error.response?.data?.message || "Could not calculate route.",
                variant: "destructive"
            });
            return null;
        }
    }, [decodePolyline, toast]);

    // Update the handleCalculateRoute function
    const handleCalculateRoute = async () => {
        if (!startPoint || !endPoint) {
            toast({
                title: "Missing Information",
                description: "Please select both a start and an end location.",
                variant: "destructive",
            });
            return;
        }

        setIsCalculatingRoute(true);
        setIsMapLoading(true);
        setCalculatedRouteData(null);
        onRouteCalculated(null, null, null);
        onSimulatedPositionUpdate(null);

        try {
            const routeData = await getRoute(
                startPoint.placeId,
                endPoint.placeId,
                transportMode
            );

            if (routeData) {
                setCalculatedRouteData(routeData);
                onRouteCalculated(routeData.geoJSON, startPoint.coordinates, endPoint.coordinates);
                routeCoordinates.current = routeData.rawCoordinates; // Use the raw coordinates
                onSimulatedPositionUpdate(routeCoordinates.current[0]);

                toast({
                    title: "Route Loaded",
                    description: `Route ready for simulation! Distance: ${(routeData.distance / 1000).toFixed(1)} km, Duration: ${Math.round(routeData.duration / 60)} min.`,
                });

                if (mapInstance && routeData.geoJSON) {
                    const bounds = new LngLatBounds();
                    routeData.geoJSON.geometry.coordinates.forEach((coord: [number, number]) => {
                        bounds.extend(coord);
                    });
                    mapInstance.fitBounds(bounds, { padding: 80, duration: 1000 });
                }
            }
        } finally {
            setIsCalculatingRoute(false);
            setIsMapLoading(false);
        }
    };

    // Update the animateVehicle function to use rawCoordinates
    const animateVehicle = useCallback((timestamp: DOMHighResTimeStamp) => {
        if (!isPlaying || !calculatedRouteData || !routeCoordinates.current || calculatedRouteData.duration === 0) {
            animationFrameId.current = null;
            return;
        }

        if (simulationStartTime.current === 0) {
            simulationStartTime.current = timestamp;
        }

        const elapsedRealTime = timestamp - simulationStartTime.current;
        const simulatedDuration = calculatedRouteData.duration * 1000;
        const currentSimulatedTime = (elapsedRealTime * simulationSpeed[0]);

        if (currentSimulatedTime >= simulatedDuration) {
            setCurrentSimulationTime(simulatedDuration);
            onSimulatedPositionUpdate(routeCoordinates.current[routeCoordinates.current.length - 1]);
            setIsPlaying(false);
            animationFrameId.current = null;
            return;
        }

        setCurrentSimulationTime(currentSimulatedTime);

        const progressRatio = currentSimulatedTime / simulatedDuration;
        const totalSegments = routeCoordinates.current.length - 1;
        const currentSegmentIndex = Math.min(Math.floor(progressRatio * totalSegments), totalSegments - 1);
        const segmentProgress = (progressRatio * totalSegments) - currentSegmentIndex;

        const startCoord = routeCoordinates.current[currentSegmentIndex];
        const endCoord = routeCoordinates.current[currentSegmentIndex + 1];

        if (startCoord && endCoord) {
            const interpolatedLng = startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress;
            const interpolatedLat = startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress;
            onSimulatedPositionUpdate([interpolatedLng, interpolatedLat]);
        }

        animationFrameId.current = requestAnimationFrame(animateVehicle);
    }, [isPlaying, calculatedRouteData, simulationSpeed, onSimulatedPositionUpdate]);

    // Update the handleCalculateRoute function
    // const handleCalculateRoute = async () => {
    //     if (!startPoint || !endPoint) {
    //         toast({
    //             title: "Missing Information",
    //             description: "Please select both a start and an end location.",
    //             variant: "destructive",
    //         });
    //         return;
    //     }

    //     setIsCalculatingRoute(true);
    //     setIsMapLoading(true);
    //     setCalculatedRouteData(null);
    //     onRouteCalculated(null, null, null);
    //     onSimulatedPositionUpdate(null);

    //     try {
    //         const routeData = await getRoute(
    //             startPoint.placeId,
    //             endPoint.placeId,
    //             transportMode
    //         );

    //         if (routeData) {
    //             setCalculatedRouteData(routeData);
    //             onRouteCalculated(routeData.geoJSON, startPoint.coordinates, endPoint.coordinates);
    //             routeCoordinates.current = routeData.rawCoordinates; // Use the raw coordinates
    //             onSimulatedPositionUpdate(routeCoordinates.current[0]);

    //             toast({
    //                 title: "Route Loaded",
    //                 description: `Route ready for simulation! Distance: ${(routeData.distance / 1000).toFixed(1)} km, Duration: ${Math.round(routeData.duration / 60)} min.`,
    //             });

    //             if (mapInstance && routeData.geoJSON) {
    //                 const bounds = new LngLatBounds();
    //                 routeData.geoJSON.geometry.coordinates.forEach((coord: [number, number]) => {
    //                     bounds.extend(coord);
    //                 });
    //                 mapInstance.fitBounds(bounds, { padding: 80, duration: 1000 });
    //             }
    //         }
    //     } finally {
    //         setIsCalculatingRoute(false);
    //         setIsMapLoading(false);
    //     }
    // };

    // Update the animateVehicle function to use rawCoordinates
    // const animateVehicle = useCallback((timestamp: DOMHighResTimeStamp) => {
    //     if (!isPlaying || !calculatedRouteData || !routeCoordinates.current || calculatedRouteData.duration === 0) {
    //         animationFrameId.current = null;
    //         return;
    //     }

    //     if (simulationStartTime.current === 0) {
    //         simulationStartTime.current = timestamp;
    //     }

    //     const elapsedRealTime = timestamp - simulationStartTime.current;
    //     const simulatedDuration = calculatedRouteData.duration * 1000;
    //     const currentSimulatedTime = (elapsedRealTime * simulationSpeed[0]);

    //     if (currentSimulatedTime >= simulatedDuration) {
    //         setCurrentSimulationTime(simulatedDuration);
    //         onSimulatedPositionUpdate(routeCoordinates.current[routeCoordinates.current.length - 1]);
    //         setIsPlaying(false);
    //         animationFrameId.current = null;
    //         return;
    //     }

    //     setCurrentSimulationTime(currentSimulatedTime);

    //     const progressRatio = currentSimulatedTime / simulatedDuration;
    //     const totalSegments = routeCoordinates.current.length - 1;
    //     const currentSegmentIndex = Math.min(Math.floor(progressRatio * totalSegments), totalSegments - 1);
    //     const segmentProgress = (progressRatio * totalSegments) - currentSegmentIndex;

    //     const startCoord = routeCoordinates.current[currentSegmentIndex];
    //     const endCoord = routeCoordinates.current[currentSegmentIndex + 1];

    //     if (startCoord && endCoord) {
    //         const interpolatedLng = startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress;
    //         const interpolatedLat = startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress;
    //         onSimulatedPositionUpdate([interpolatedLng, interpolatedLat]);
    //     }

    //     animationFrameId.current = requestAnimationFrame(animateVehicle);
    // }, [isPlaying, calculatedRouteData, simulationSpeed, onSimulatedPositionUpdate]);
    // Effect to start/stop animation loop
    useEffect(() => {
        if (isPlaying && calculatedRouteData && routeCoordinates.current) {
            simulationStartTime.current = performance.now() - currentSimulationTime / simulationSpeed[0]; // Adjust start time for seeking
            animationFrameId.current = requestAnimationFrame(animateVehicle);
        } else if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isPlaying, calculatedRouteData, simulationSpeed, animateVehicle]); // Add animateVehicle as dependency

    const togglePlayPause = () => {
        if (!calculatedRouteData || !routeCoordinates.current) {
            toast({ title: "No Route", description: "Please calculate a route first.", variant: "info" });
            return;
        }
        setIsPlaying(prev => !prev);
    };

    const resetSimulation = () => {
        setIsPlaying(false);
        setCurrentSimulationTime(0);
        simulationStartTime.current = 0;
        if (routeCoordinates.current) {
            onSimulatedPositionUpdate(routeCoordinates.current[0]); // Reset to start
        } else {
            onSimulatedPositionUpdate(null);
        }
    };

    // Format time for display
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const totalDurationMinutes = calculatedRouteData ? Math.round(calculatedRouteData.duration / 60) : 0;
    const currentMinutes = Math.floor(currentSimulationTime / 1000 / 60);
    const currentSeconds = Math.round((currentSimulationTime / 1000) % 60);
    const progressPercentage = calculatedRouteData && calculatedRouteData.duration > 0
        ? (currentSimulationTime / (calculatedRouteData.duration * 1000)) * 100
        : 0;

    return (
        <div className="space-y-4">
            {/* Route Input Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Route className="w-5 h-5 mr-2 text-primary" />
                        Simulate Route
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sim-from-location">From</Label>
                        <PlaceSearchInput
                            value={startPoint}
                            onSelect={setStartPoint}
                            placeholder="Enter start location"
                            currentMapCenter={mapInstance?.getCenter().toArray() as [number, number] || null}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sim-to-location">To</Label>
                        <PlaceSearchInput
                            value={endPoint}
                            onSelect={setEndPoint}
                            placeholder="Enter end location"
                            currentMapCenter={mapInstance?.getCenter().toArray() as [number, number] || null}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Transport Mode</Label>
                        <Select
                            value={transportMode}
                            onValueChange={(value) => setTransportMode(value)}
                            disabled={isCalculatingRoute || isPlaying}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DRIVING">🚗 Driving</SelectItem>
                                <SelectItem value="WALKING">🚶 Walking</SelectItem>
                                <SelectItem value="BICYCLING">🚴 Cycling</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={handleCalculateRoute}
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={isCalculatingRoute || !startPoint || !endPoint}
                    >
                        {isCalculatingRoute ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Route className="w-4 h-4 mr-2" />
                        )}
                        {isCalculatingRoute ? "Calculating Route..." : "Load Route for Simulation"}
                    </Button>
                </CardContent>
            </Card>

            {/* Simulation Controls Card */}
            {calculatedRouteData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <CarFront className="w-5 h-5 mr-2 text-blue-600" />
                            Simulation Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                    Time: {formatTime(currentSimulationTime / 1000)} / {formatTime(calculatedRouteData.duration)}
                                </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {(progressPercentage).toFixed(0)}%
                            </div>
                        </div>

                        <Slider
                            min={0}
                            max={calculatedRouteData.duration * 1000} // Convert to milliseconds for slider
                            step={100} // 0.1 second steps
                            value={[currentSimulationTime]}
                            onValueChange={(val) => {
                                const newTime = val[0];
                                setCurrentSimulationTime(newTime);
                                // Update vehicle position directly when scrubbing
                                const progressRatio = newTime / (calculatedRouteData.duration * 1000);
                                const totalSegments = routeCoordinates.current ? routeCoordinates.current.length - 1 : 0;
                                const currentSegmentIndex = Math.min(Math.floor(progressRatio * totalSegments), totalSegments - 1);
                                const segmentProgress = (progressRatio * totalSegments) - currentSegmentIndex;

                                if (routeCoordinates.current && routeCoordinates.current[currentSegmentIndex] && routeCoordinates.current[currentSegmentIndex + 1]) {
                                    const startCoord = routeCoordinates.current[currentSegmentIndex];
                                    const endCoord = routeCoordinates.current[currentSegmentIndex + 1];
                                    const interpolatedLng = startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress;
                                    const interpolatedLat = startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress;
                                    onSimulatedPositionUpdate([interpolatedLng, interpolatedLat]);
                                } else if (routeCoordinates.current && routeCoordinates.current.length > 0) {
                                    // Handle scrubbing to start/end if route is very short or at boundaries
                                    onSimulatedPositionUpdate(routeCoordinates.current[Math.min(Math.round(progressRatio * totalSegments), totalSegments)]);
                                }
                            }}
                            className="w-full"
                            disabled={isCalculatingRoute}
                        />

                        <div className="flex items-center justify-center space-x-4">
                            <Button variant="outline" size="icon" onClick={resetSimulation} disabled={!calculatedRouteData}>
                                <Rewind className="w-5 h-5" />
                            </Button>
                            <Button size="lg" onClick={togglePlayPause} disabled={!calculatedRouteData || currentSimulationTime >= calculatedRouteData.duration * 1000}>
                                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setSimulationSpeed([prev => Math.min(prev[0] * 2, 8)])} disabled={simulationSpeed[0] >= 8 || !calculatedRouteData}>
                                <FastForward className="w-5 h-5" />
                            </Button>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <Label htmlFor="simulation-speed" className="flex items-center space-x-2">
                                <SlidersHorizontal className="w-4 h-4" />
                                <span>Simulation Speed: {simulationSpeed[0]}x</span>
                            </Label>
                            <Slider
                                id="simulation-speed"
                                min={0.25}
                                max={8}
                                step={0.25}
                                value={simulationSpeed}
                                onValueChange={setSimulationSpeed}
                                className="w-1/2"
                                disabled={!calculatedRouteData || isCalculatingRoute}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* AI Insights Card (Placeholder for future dynamic insights during simulation) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <div className="w-5 h-5 mr-2 bg-gradient-to-r from-green-400 to-blue-500 rounded"></div>
                        Real-time Simulation Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        AI insights will appear here as the simulation progresses, considering dynamic factors. (Future Feature)
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};