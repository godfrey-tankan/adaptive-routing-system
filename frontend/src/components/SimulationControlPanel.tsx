// src/components/SimulationControlPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, FastForward, Rewind, CarFront, Clock, SlidersHorizontal, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { PlaceSearchInput, GeoPoint } from '@/components/map/PlaceSearchInput';
import AIChatCard from './AIChatCard';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface SimulationControlPanelProps {
    mapInstance: maplibregl.Map | null;
    onRouteCalculated: (geoJSON: any | null, start: [number, number] | null, end: [number, number] | null) => void;
    onSimulatedPositionUpdate: (position: [number, number] | null, bearing?: number) => void; // Added bearing
    setIsMapLoading: (isLoading: boolean) => void;
}

interface RouteData {
    geoJSON: any;
    distance: number;
    duration: number;
    rawCoordinates: [number, number][];
    aiInsights?: string;
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
    const [calculatedRouteData, setCalculatedRouteData] = useState<RouteData | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState<number[]>([1]);
    const [currentSimulationTime, setCurrentSimulationTime] = useState(0);
    const [simulationInsights, setSimulationInsights] = useState<string>('');
    const animationFrameId = useRef<number | null>(null);
    const simulationStartTime = useRef<number>(0);
    const routeCoordinates = useRef<[number, number][] | null>(null);

    // This function will calculate the bearing between two points
    const calculateBearing = useCallback((p1: [number, number], p2: [number, number]) => {
        const toRadians = (deg: number) => deg * Math.PI / 180;
        const toDegrees = (rad: number) => rad * 180 / Math.PI;

        const lat1 = toRadians(p1[1]);
        const lon1 = toRadians(p1[0]);
        const lat2 = toRadians(p2[1]);
        const lon2 = toRadians(p2[0]);

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        let bearing = toDegrees(Math.atan2(y, x));
        return (bearing + 360) % 360; // Normalize to 0-360
    }, []);

    // The pulsing dot is fine for a generic marker, but for a "vehicle" we want something more.
    // We'll update the `onSimulatedPositionUpdate` in the parent component to handle a custom marker.
    // For now, remove the pulsing dot logic from here as it will be managed externally.
    // The `onSimulatedPositionUpdate` will now also pass the bearing.

    const decodePolyline = useCallback((encoded: string): [number, number][] => {
        const poly = [];
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

            poly.push([lng / 1E5, lat / 1E5]);
        }
        return poly;
    }, []);

    const getRoute = useCallback(async (startPlaceId: string, endPlaceId: string, mode: string) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(
                `${backendUrl}/route/simulate/`,
                {
                    startPlaceId,
                    endPlaceId,
                    mode: mode.toLowerCase(),
                    departureTime: 'now',
                    trafficModel: 'best_guess'
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                }
            );

            const data = response.data;

            if (data?.route?.overview_polyline?.points) {
                const decodedPath = decodePolyline(data.route.overview_polyline.points);

                // IMPORTANT: Filter out consecutive duplicate coordinates to avoid issues with bearing calculation
                const uniqueDecodedPath: [number, number][] = [];
                if (decodedPath.length > 0) {
                    uniqueDecodedPath.push(decodedPath[0]);
                    for (let i = 1; i < decodedPath.length; i++) {
                        if (decodedPath[i][0] !== decodedPath[i - 1][0] || decodedPath[i][1] !== decodedPath[i - 1][1]) {
                            uniqueDecodedPath.push(decodedPath[i]);
                        }
                    }
                }


                const geoJSONFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: uniqueDecodedPath, // Use unique path
                    },
                    properties: {}
                };

                return {
                    geoJSON: geoJSONFeature,
                    distance: data.route.distance?.value || 0,
                    duration: data.route.duration_in_traffic?.value || data.route.duration?.value || 0,
                    rawCoordinates: uniqueDecodedPath, // Use unique path
                    aiInsights: data.ai_insights
                };
            }

            toast({
                title: "No Route Found",
                description: "Could not find a valid route between the selected locations. Please check if the locations are valid and reachable.",
                variant: "destructive"
            });
            return null;
        } catch (error: any) {
            console.error("Error fetching route:", error);
            toast({
                title: "Route Calculation Failed",
                description: error.response?.data?.message || "Could not calculate route. This might be due to an issue with the backend or invalid locations.",
                variant: "destructive"
            });
            return null;
        }
    }, [decodePolyline]);

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
        onSimulatedPositionUpdate(null); // Clear any existing simulated position

        try {
            const routeData = await getRoute(
                startPoint.placeId,
                endPoint.placeId,
                transportMode
            );

            if (routeData) {
                setCalculatedRouteData(routeData);
                setSimulationInsights(routeData.aiInsights || '');
                onRouteCalculated(routeData.geoJSON, startPoint.coordinates, endPoint.coordinates);
                routeCoordinates.current = routeData.rawCoordinates;

                // Update initial position and bearing
                if (mapInstance && routeCoordinates.current.length > 0) {
                    const initialPosition = routeCoordinates.current[0];
                    let initialBearing = 0;
                    if (routeCoordinates.current.length > 1) {
                        initialBearing = calculateBearing(routeCoordinates.current[0], routeCoordinates.current[1]);
                    }
                    onSimulatedPositionUpdate(initialPosition, initialBearing);
                }

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
            } else {
                // If routeData is null, ensure simulation is reset and map cleared
                onRouteCalculated(null, null, null);
                onSimulatedPositionUpdate(null);
                setSimulationInsights('');
                setCalculatedRouteData(null);
                setCurrentSimulationTime(0);
                setIsPlaying(false);
                if (animationFrameId.current) {
                    cancelAnimationFrame(animationFrameId.current);
                    animationFrameId.current = null;
                }
                simulationStartTime.current = 0;
            }
        } catch (error) {
            console.error("Error in route calculation:", error);
            // Ensure state is reset on error as well
            onRouteCalculated(null, null, null);
            onSimulatedPositionUpdate(null);
            setSimulationInsights('');
            setCalculatedRouteData(null);
            setCurrentSimulationTime(0);
            setIsPlaying(false);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            simulationStartTime.current = 0;
        } finally {
            setIsCalculatingRoute(false);
            setIsMapLoading(false);
        }
    };

    const animateVehicle = useCallback((timestamp: DOMHighResTimeStamp) => {
        if (!isPlaying || !calculatedRouteData || !routeCoordinates.current || calculatedRouteData.duration === 0) {
            animationFrameId.current = null;
            return;
        }

        if (simulationStartTime.current === 0) {
            simulationStartTime.current = timestamp;
        }

        const elapsedRealTime = timestamp - simulationStartTime.current;
        // Ensure calculatedRouteData.duration is treated as seconds for calculations
        const simulatedDurationMs = calculatedRouteData.duration * 1000;
        const currentSimulatedTime = (elapsedRealTime * simulationSpeed[0]);

        if (currentSimulatedTime >= simulatedDurationMs) {
            setCurrentSimulationTime(simulatedDurationMs);
            const finalPosition = routeCoordinates.current[routeCoordinates.current.length - 1];
            // Calculate final bearing
            let finalBearing = 0;
            if (routeCoordinates.current.length > 1) {
                finalBearing = calculateBearing(routeCoordinates.current[routeCoordinates.current.length - 2], finalPosition);
            }
            onSimulatedPositionUpdate(finalPosition, finalBearing);
            setIsPlaying(false);
            animationFrameId.current = null;
            return;
        }

        setCurrentSimulationTime(currentSimulatedTime);

        // Calculate progress along the route
        const progressRatio = currentSimulatedTime / simulatedDurationMs;
        const totalSegments = routeCoordinates.current.length - 1;

        // Find the current segment
        let currentSegmentIndex = 0;
        if (totalSegments > 0) {
            currentSegmentIndex = Math.min(Math.floor(progressRatio * totalSegments), totalSegments - 1);
        }

        const segmentProgress = (progressRatio * totalSegments) - currentSegmentIndex;

        const startCoord = routeCoordinates.current[currentSegmentIndex];
        const endCoord = routeCoordinates.current[currentSegmentIndex + 1];

        if (startCoord && endCoord) {
            const interpolatedLng = startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress;
            const interpolatedLat = startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress;
            const currentPosition: [number, number] = [interpolatedLng, interpolatedLat];

            // Calculate bearing
            const bearing = calculateBearing(startCoord, endCoord);
            onSimulatedPositionUpdate(currentPosition, bearing);

        } else if (routeCoordinates.current.length > 0) {
            // Handle cases where there's only one point or we're at the very end
            const position = routeCoordinates.current[Math.min(Math.round(progressRatio * totalSegments), totalSegments)];
            onSimulatedPositionUpdate(position, 0); // No bearing if only one point or at end
        }


        animationFrameId.current = requestAnimationFrame(animateVehicle);
    }, [isPlaying, calculatedRouteData, simulationSpeed, onSimulatedPositionUpdate, calculateBearing]);

    useEffect(() => {
        if (isPlaying && calculatedRouteData && routeCoordinates.current && calculatedRouteData.duration > 0) {
            // Adjust simulationStartTime to account for currentSimulationTime when resuming
            simulationStartTime.current = performance.now() - currentSimulationTime / simulationSpeed[0];
            animationFrameId.current = requestAnimationFrame(animateVehicle);
        } else if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
        };
    }, [isPlaying, calculatedRouteData, simulationSpeed, animateVehicle]);

    const togglePlayPause = () => {
        if (!calculatedRouteData || !routeCoordinates.current || calculatedRouteData.duration === 0) {
            toast({ title: "No Valid Route", description: "Please calculate a valid route first with a duration greater than 0.", variant: "info" });
            return;
        }
        setIsPlaying(prev => !prev);
    };

    const resetSimulation = () => {
        setIsPlaying(false);
        setCurrentSimulationTime(0);
        simulationStartTime.current = 0;
        if (routeCoordinates.current && routeCoordinates.current.length > 0) {
            const startPosition = routeCoordinates.current[0];
            let initialBearing = 0;
            if (routeCoordinates.current.length > 1) {
                initialBearing = calculateBearing(routeCoordinates.current[0], routeCoordinates.current[1]);
            }
            onSimulatedPositionUpdate(startPosition, initialBearing);
        } else {
            onSimulatedPositionUpdate(null);
        }
    };

    const handleSliderChange = (val: number[]) => {
        const newTime = val[0];
        setCurrentSimulationTime(newTime);
        if (calculatedRouteData && routeCoordinates.current && routeCoordinates.current.length > 0) {
            const progressRatio = newTime / (calculatedRouteData.duration * 1000);
            const totalSegments = routeCoordinates.current.length - 1;

            let currentSegmentIndex = 0;
            let segmentProgress = 0;

            if (totalSegments > 0) {
                currentSegmentIndex = Math.min(Math.floor(progressRatio * totalSegments), totalSegments - 1);
                segmentProgress = (progressRatio * totalSegments) - currentSegmentIndex;
            }

            let currentPosition: [number, number];
            let currentBearing = 0;

            if (routeCoordinates.current.length === 1) {
                currentPosition = routeCoordinates.current[0];
                currentBearing = 0; // No movement, no bearing
            } else if (currentSegmentIndex < totalSegments) {
                const startCoord = routeCoordinates.current[currentSegmentIndex];
                const endCoord = routeCoordinates.current[currentSegmentIndex + 1];
                currentPosition = [
                    startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress,
                    startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress
                ];
                currentBearing = calculateBearing(startCoord, endCoord);
            } else { // At or past the last segment
                currentPosition = routeCoordinates.current[totalSegments];
                if (totalSegments > 0) { // If there was a previous segment
                    currentBearing = calculateBearing(routeCoordinates.current[totalSegments - 1], routeCoordinates.current[totalSegments]);
                } else {
                    currentBearing = 0;
                }
            }
            onSimulatedPositionUpdate(currentPosition, currentBearing);
        } else {
            onSimulatedPositionUpdate(null);
        }
    };


    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const totalDurationSeconds = calculatedRouteData ? calculatedRouteData.duration : 0;
    const progressPercentage = totalDurationSeconds > 0
        ? (currentSimulationTime / (totalDurationSeconds * 1000)) * 100
        : 0;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <CarFront className="w-5 h-5 mr-2 text-primary" />
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
                            <CarFront className="w-4 h-4 mr-2" />
                        )}
                        {isCalculatingRoute ? "Calculating Route..." : "Load Route for Simulation"}
                    </Button>
                </CardContent>
            </Card>

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
                                {progressPercentage.toFixed(0)}%
                            </div>
                        </div>

                        <Slider
                            min={0}
                            max={calculatedRouteData.duration * 1000}
                            step={100}
                            value={[currentSimulationTime]}
                            onValueChange={handleSliderChange}
                            className="w-full"
                            disabled={isCalculatingRoute || calculatedRouteData.duration === 0}
                        />

                        <div className="flex items-center justify-center space-x-4">
                            <Button variant="outline" size="icon" onClick={resetSimulation} disabled={!calculatedRouteData || calculatedRouteData.duration === 0}>
                                <Rewind className="w-5 h-5" />
                            </Button>
                            <Button
                                size="lg"
                                onClick={togglePlayPause}
                                disabled={!calculatedRouteData || currentSimulationTime >= calculatedRouteData.duration * 1000 || calculatedRouteData.duration === 0}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSimulationSpeed([Math.min(simulationSpeed[0] * 2, 8)])}
                                disabled={simulationSpeed[0] >= 8 || !calculatedRouteData || calculatedRouteData.duration === 0}
                            >
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
                                disabled={!calculatedRouteData || isCalculatingRoute || calculatedRouteData.duration === 0}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            <AIChatCard
                routeDetails={{
                    distance: calculatedRouteData ? `${(calculatedRouteData.distance / 1000).toFixed(1)} km` : '',
                    duration: calculatedRouteData ? `${Math.round(calculatedRouteData.duration / 60)} mins` : '',
                    transportMode: transportMode
                }}
                startPoint={startPoint}
                endPoint={endPoint}
                aiInsights={simulationInsights}
            />
        </div>
    );
};