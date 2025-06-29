// src/components/RouteHistoryPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, MapPin, Clock, Gauge, CarFront, Bot, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { GeoPoint } from './map/PlaceSearchInput'; // Assuming GeoPoint is shared

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Interface matching your Django Route model for frontend display
interface SavedRoute {
    id: number;
    origin: { coordinates: [number, number], type: string }; // [lng, lat]
    destination: { coordinates: [number, number], type: string }; // [lng, lat]
    mode: string;
    distance: number; // in meters
    duration: number; // in seconds
    polyline: string;
    ai_insights?: string; // Stored as string in JSONField in model
    created_at: string;
    user: number; // user ID
}

interface RouteHistoryPanelProps {
    // Callback to display a saved route on the main map
    onViewRouteOnMap: (geoJSON: any, start: [number, number], end: [number, number]) => void;
}

export const RouteHistoryPanel: React.FC<RouteHistoryPanelProps> = ({ onViewRouteOnMap }) => {
    const { user } = useAuth();
    const token = localStorage.getItem('authToken');
    const [routes, setRoutes] = useState<SavedRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const authAxios = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        }
    });

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

    const fetchRoutes = useCallback(async () => {
        if (!user) {
            setError("Please log in to view route history.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await authAxios.get('/route/history/');
            // Ensure origin/destination coordinates are valid before setting
            const fetchedRoutes: SavedRoute[] = response.data.map((route: SavedRoute) => ({
                ...route,
                origin: route.origin && route.origin.coordinates && route.origin.coordinates.length === 2
                    ? route.origin
                    : { coordinates: [0, 0], type: 'Point' }, // Default or handle missing
                destination: route.destination && route.destination.coordinates && route.destination.coordinates.length === 2
                    ? route.destination
                    : { coordinates: [0, 0], type: 'Point' }, // Default or handle missing
            }));
            setRoutes(fetchedRoutes);
            toast({
                title: "Route History Loaded",
                description: `Found ${fetchedRoutes.length} saved routes.`,
            });
        } catch (err) {
            console.error("Error fetching route history:", err);
            setError("Failed to load route history. Please try again.");
            toast({
                title: "Failed to Load History",
                description: "Could not retrieve your saved routes.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, authAxios]);

    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]); // Refetch when fetchRoutes callback changes (which happens when `user` changes)

    const handleDeleteRoute = useCallback(async (routeId: number) => {
        if (!window.confirm("Are you sure you want to delete this route?")) {
            return;
        }
        try {
            await authAxios.delete(`/routes/${routeId}/`);
            setRoutes(prevRoutes => prevRoutes.filter(route => route.id !== routeId));
            toast({
                title: "Route Deleted",
                description: `Route ID: ${routeId} has been successfully removed.`,
            });
        } catch (err) {
            console.error("Error deleting route:", err);
            toast({
                title: "Deletion Failed",
                description: "Could not delete the route. Please try again.",
                variant: "destructive"
            });
        }
    }, [authAxios]);

    const handleViewOnMap = useCallback((route: SavedRoute) => {
        try {
            const geoJSON = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: decodePolyline(route.polyline),
                },
                properties: {}
            };
            // Note: origin/destination coordinates are [lng, lat] from Django PointField
            onViewRouteOnMap(geoJSON, route.origin.coordinates, route.destination.coordinates);
            toast({
                title: "Route Displayed",
                description: `Route ID: ${route.id} is now shown on the map.`,
            });
        } catch (e) {
            console.error("Error viewing route on map:", e);
            toast({
                title: "Map Display Error",
                description: "Could not display route on map.",
                variant: "destructive"
            });
        }
    }, [decodePolyline, onViewRouteOnMap]);

    if (isLoading) {
        return (
            <Card className="p-4 flex items-center justify-center min-h-[200px]">
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Loading route history...</p>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-4 min-h-[200px]">
                <CardHeader>
                    <CardTitle className="flex items-center text-red-500">
                        <AlertCircle className="mr-2 h-5 w-5" /> Error
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-400">{error}</p>
                    <Button onClick={fetchRoutes} className="mt-4">Retry</Button>
                </CardContent>
            </Card>
        );
    }

    if (!user) {
        return (
            <Card className="p-4 min-h-[200px]">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" /> Authentication Required
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Please log in to view your route history.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                        My Saved Routes
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto text-muted-foreground hover:bg-muted"
                            onClick={fetchRoutes}
                        >
                            Refresh
                        </Button>
                    </CardTitle>
                </CardHeader>
            </Card>
            {routes.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                    <p>No routes saved yet. Optimize a route to save it!</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {routes.map(route => {
                        // Safe access to coordinates and formatting
                        const originCoords = route.origin?.coordinates;
                        const destCoords = route.destination?.coordinates;

                        const displayOrigin = (originCoords && originCoords.length === 2)
                            ? `${originCoords[1].toFixed(4)}, ${originCoords[0].toFixed(4)}`
                            : "N/A";
                        const displayDestination = (destCoords && destCoords.length === 2)
                            ? `${destCoords[1].toFixed(4)}, ${destCoords[0].toFixed(4)}`
                            : "N/A";

                        return (
                            <Card key={route.id} className="relative">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex justify-between items-center">
                                        Route ID: {route.id}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                            onClick={() => handleDeleteRoute(route.id)}
                                            title="Delete Route"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">Saved on: {new Date(route.created_at).toLocaleString()}</p>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center text-sm">
                                        <MapPin className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                                        <span>From: {displayOrigin}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <MapPin className="h-4 w-4 mr-2 text-red-500 flex-shrink-0" />
                                        <span>To: {displayDestination}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                                        <div className="flex items-center">
                                            <Gauge className="h-4 w-4 mr-2 text-yellow-500" />
                                            <span>Distance: {(route.distance / 1000).toFixed(1)} km</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-2 text-green-500" />
                                            <span>Duration: {Math.round(route.duration / 60)} mins</span>
                                        </div>
                                        <div className="flex items-center col-span-2">
                                            <CarFront className="h-4 w-4 mr-2 text-purple-500" />
                                            <span>Mode: {route.mode}</span>
                                        </div>
                                    </div>
                                    {route.ai_insights && (
                                        <div className="border-t border-muted pt-2 mt-2">
                                            <div className="flex items-center text-sm text-muted-foreground mb-1">
                                                <Bot className="h-4 w-4 mr-2" />
                                                AI Insights:
                                            </div>
                                            <p className="text-xs text-foreground whitespace-pre-wrap">{route.ai_insights}</p>
                                        </div>
                                    )}
                                    <Button
                                        className="w-full mt-4"
                                        onClick={() => handleViewOnMap(route)}
                                    >
                                        View on Map
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
