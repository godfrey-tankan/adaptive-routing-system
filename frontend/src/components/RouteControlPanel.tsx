// src/components/RouteControlPanel.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Map, Route, Star, ArrowRight, Loader2, Save, CloudRain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from 'axios';
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { PlaceSearchInput, GeoPoint } from '@/components/map/PlaceSearchInput';
import AIChatCard from './AIChatCard';
import { useAuth } from '@/context/AuthContext';
import { Feature, LineString } from 'geojson'; // Import GeoJSON types for strictness

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

interface RouteControlPanelProps {
  updateMapWithRoute: (start: [number, number] | null, end: [number, number] | null, geoJSON: any | null) => void;
  setIsLoadingMapAndRoute: (isLoading: boolean) => void;
  mapInstance: maplibregl.Map | null;
}

interface WeatherData {
  description: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  icon: string;
}

interface RouteResults {
  geoJSON: Feature<LineString>; // More specific type for GeoJSON
  distance: string;       // Formatted distance string (e.g., "7.9 km")
  distanceInMeters: number; // Raw distance in meters for calculations
  duration: string;       // Formatted duration string (e.g., "13 mins")
  durationInSeconds: number; // Raw duration in seconds for calculations
  fuelCost: string;
  busFare: string;
  alternatives: number;
  avoidHighways: boolean;
  avoidTolls: boolean;
  transportMode: string;
  aiInsights?: string;
  savedRouteId?: number; // Added to store the ID of the saved route
}

const TRANSPORT_MODE_MAP: Record<string, string> = {
  DRIVING: 'driving',
  TRANSIT: 'transit',
  WALKING: 'walking',
  BICYCLING: 'bicycling'
};

// Zimbabwe-specific constants
const FUEL_PRICE_PER_LITER = 1.50; // USD
const AVERAGE_FUEL_CONSUMPTION = 8; // liters per 100km
const USD_TO_ZWL_RATE = 29; // Current exchange rate
const HARARE_CBD_COORDS = [-17.825166, 31.033510]; // Approximate Harare CBD coordinates

export const RouteControlPanel: React.FC<RouteControlPanelProps> = ({
  updateMapWithRoute,
  setIsLoadingMapAndRoute,
  mapInstance,
}) => {
  const { user } = useAuth();
  const token = localStorage.getItem('authToken');
  const [startPoint, setStartPoint] = useState<GeoPoint | null>(null);
  const [endPoint, setEndPoint] = useState<GeoPoint | null>(null);
  const [routeOptions, setRouteOptions] = useState({
    transportMode: 'DRIVING',
    avoidHighways: false,
    avoidTolls: false
  });
  const [routeResults, setRouteResults] = useState<RouteResults | null>(null);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  const authAxios = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });

  const calculateFuelCost = (distanceInKm: number): string => {
    const fuelUsed = (distanceInKm * AVERAGE_FUEL_CONSUMPTION) / 100;
    const costInUSD = fuelUsed * FUEL_PRICE_PER_LITER;
    const costInZWL = costInUSD * USD_TO_ZWL_RATE;
    return `ZWL $${costInZWL.toFixed(2)} (USD $${costInUSD.toFixed(2)})`;
  };

  const calculateBusFare = (startCoords: [number, number], endCoords: [number, number]): string => {
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const distanceFromCBD = getDistance(
      HARARE_CBD_COORDS[0], HARARE_CBD_COORDS[1],
      startCoords[1], startCoords[0]
    );

    if (distanceFromCBD < 15) {
      return "$1.00 (Standard Harare kombi fare)";
    } else if (distanceFromCBD < 30) {
      return "$2.00 (Nearby towns like Chitungwiza, Norton)";
    } else {
      return "$3.00+ (Long distance to places like Marondera, Chegutu)";
    }
  };

  useEffect(() => {
    const updateMapRouteLayers = () => {
      if (!mapInstance) return;

      if (mapInstance.getLayer('route')) {
        mapInstance.removeLayer('route');
        mapInstance.removeSource('route');
      }
      if (mapInstance.getLayer('start-point')) {
        mapInstance.removeLayer('start-point');
        mapInstance.removeSource('start-point');
      }
      if (mapInstance.getLayer('end-point')) {
        mapInstance.removeLayer('end-point');
        mapInstance.removeSource('end-point');
      }

      if (routeResults?.geoJSON) {
        mapInstance.addSource('route', {
          type: 'geojson',
          data: routeResults.geoJSON
        });

        mapInstance.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.75
          }
        });

        if (startPoint && endPoint) {
          mapInstance.addSource('start-point', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: startPoint.coordinates
              }
            }
          });

          mapInstance.addLayer({
            id: 'start-point',
            type: 'circle',
            source: 'start-point',
            paint: {
              'circle-radius': 8,
              'circle-color': '#4ade80',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          mapInstance.addSource('end-point', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: endPoint.coordinates
              }
            }
          });

          mapInstance.addLayer({
            id: 'end-point',
            type: 'circle',
            source: 'end-point',
            paint: {
              'circle-radius': 8,
              'circle-color': '#ef4444',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
      }
    };

    updateMapRouteLayers();

    return () => {
      if (mapInstance) {
        if (mapInstance.getLayer('route')) { mapInstance.removeLayer('route'); }
        if (mapInstance.getSource('route')) { mapInstance.removeSource('route'); }
        if (mapInstance.getLayer('start-point')) { mapInstance.removeLayer('start-point'); }
        if (mapInstance.getSource('start-point')) { mapInstance.removeSource('start-point'); }
        if (mapInstance.getLayer('end-point')) { mapInstance.removeLayer('end-point'); }
        if (mapInstance.getSource('end-point')) { mapInstance.removeSource('end-point'); }
      }
    };
  }, [mapInstance, routeResults, startPoint, endPoint]);

  useEffect(() => {
    if (mapInstance) {
      if (startPoint && !endPoint) {
        mapInstance.flyTo({ center: startPoint.coordinates, zoom: 14, duration: 1000 });
      } else if (endPoint && !startPoint) {
        mapInstance.flyTo({ center: endPoint.coordinates, zoom: 14, duration: 1000 });
      }
    }
  }, [startPoint, endPoint, mapInstance]);

  const fetchWeather = useCallback(async (coords: [number, number]) => {
    setIsWeatherLoading(true);
    try {
      const response = await authAxios.post('/route/weather/', {
        lat: coords[1],
        lon: coords[0],
        user_id: user?.id
      });

      const data = response.data;
      return {
        description: data.weather[0].description,
        temperature: data.main.temp,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
      } as WeatherData;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      toast({
        title: "Weather Fetch Failed",
        description: "Could not retrieve current weather.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsWeatherLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (startPoint) {
      fetchWeather(startPoint.coordinates).then(setCurrentWeather);
    } else {
      setCurrentWeather(null);
    }
  }, [startPoint, fetchWeather]);

  const decodePolyline = (encoded: string): [number, number][] => {
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
  };

  const getRoute = useCallback(async (
    startPlaceId: string,
    endPlaceId: string,
    profile: string,
    avoidHighways: boolean,
    avoidTolls: boolean,
    startPointName: string,
    endPointName: string
  ) => {
    setIsPanelLoading(true);

    try {
      if (!startPoint || !endPoint) {
        throw new Error("Start or end point coordinates missing from state.");
      }
      const origin = `${startPoint.coordinates[1]},${startPoint.coordinates[0]}`;
      const destination = `${endPoint.coordinates[1]},${endPoint.coordinates[0]}`;

      const backendTransportMode = profile.toLowerCase();

      const response = await authAxios.post('/route/optimize/', {
        origin,
        destination,
        origin_name: startPointName,
        destination_name: endPointName,
        mode: backendTransportMode,
        avoid_highways: avoidHighways,
        avoid_tolls: avoidTolls
      });

      const backendPrimaryRouteData = response.data.primary_route;
      const backendAiInsights = response.data.ai_insights;
      const backendAlternatives = response.data.alternatives;
      const savedRouteId = response.data.saved_route_id; // Capture the saved route ID

      if (backendPrimaryRouteData) {
        const decodedPath = decodePolyline(backendPrimaryRouteData.polyline);
        const distanceInMeters = backendPrimaryRouteData.distance_value;
        const durationInSeconds = backendPrimaryRouteData.duration_value;

        const finalGeoJSON: Feature<LineString> = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: decodedPath,
          },
          properties: {}
        };

        return {
          geoJSON: finalGeoJSON,
          distance: backendPrimaryRouteData.distance || `${(distanceInMeters / 1000).toFixed(1)} km`,
          distanceInMeters,
          duration: backendPrimaryRouteData.duration || `${Math.round(durationInSeconds / 60)} mins`,
          durationInSeconds,
          fuelCost: profile === 'DRIVING' ? calculateFuelCost(distanceInMeters / 1000) : 'N/A',
          busFare: profile === 'TRANSIT' ? calculateBusFare(startPoint.coordinates, endPoint.coordinates) : 'N/A',
          alternatives: backendAlternatives ? backendAlternatives.length : 0,
          avoidHighways,
          avoidTolls,
          transportMode: profile,
          aiInsights: backendAiInsights,
          savedRouteId: savedRouteId // Assign the captured ID
        };
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching route:", error.response?.data || error.message);
      if (error.response?.status === 401) {
        toast({
          title: "Authentication Required",
          description: "Please log in to use route optimization.",
          variant: "destructive"
        });
      } else if (error.response?.status === 500) {
        toast({
          title: "Server Error",
          description: error.response?.data?.details || "The route optimization service encountered an error.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Route Calculation Failed",
          description: error.response?.data?.error || "Could not calculate route. Please try again.",
          variant: "destructive"
        });
      }
      return null;
    } finally {
      setIsPanelLoading(false);
    }
  }, [user, token, startPoint, endPoint]);

  const handleOptimizeRoute = async () => {
    if (!user || !token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to optimize routes.",
        variant: "destructive"
      });
      return;
    }

    if (!startPoint || !endPoint) {
      toast({
        title: "Missing Information",
        description: "Please select both a start and an end location using the search inputs.",
        variant: "destructive"
      });
      return;
    }

    setIsPanelLoading(true);
    setIsLoadingMapAndRoute(true);
    setRouteResults(null);

    try {
      const results = await getRoute(
        startPoint.placeId,
        endPoint.placeId,
        routeOptions.transportMode,
        routeOptions.avoidHighways,
        routeOptions.avoidTolls,
        startPoint.name,
        endPoint.name
      );

      if (results) {
        setRouteResults(results);
        updateMapWithRoute(startPoint.coordinates, endPoint.coordinates, results.geoJSON);
        toast({
          title: "Route Optimized & Saved!", // Updated toast
          description: `Found the best route for your journey! (ID: ${results.savedRouteId})`,
        });

        if (mapInstance && results.geoJSON && results.geoJSON.geometry.coordinates) {
          const bounds = new LngLatBounds();
          results.geoJSON.geometry.coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          mapInstance.fitBounds(bounds, { padding: 80, duration: 1000 });
        }
      } else {
        updateMapWithRoute(null, null, null);
      }
    } catch (error) {
      console.error("RouteControlPanel: Uncaught error during route optimization:", error);
      toast({
        title: "An Unexpected Error Occurred",
        description: "Please check your network connection and try again.",
        variant: "destructive"
      });
      updateMapWithRoute(null, null, null);
    } finally {
      setIsPanelLoading(false);
      setIsLoadingMapAndRoute(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto flex-1 space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Map className="w-5 h-5 mr-2 text-primary" />
              Plan Your Route
              {!user && (
                <span className="ml-2 text-sm text-red-500">(Login required)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-location">From</Label>
              <PlaceSearchInput
                value={startPoint}
                onSelect={setStartPoint}
                placeholder="e.g., Avondale"
                currentMapCenter={mapInstance?.getCenter().toArray() as [number, number] || null}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-location">To</Label>
              <PlaceSearchInput
                value={endPoint}
                onSelect={setEndPoint}
                placeholder="e.g., Harare CBD"
                currentMapCenter={mapInstance?.getCenter().toArray() as [number, number] || null}
              />
            </div>

            <div className="space-y-2">
              <Label>Transport Mode</Label>
              <Select
                value={routeOptions.transportMode}
                onValueChange={(value) => setRouteOptions(prev => ({ ...prev, transportMode: value }))}
                disabled={isPanelLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVING">🚗 Private Car</SelectItem>
                  <SelectItem value="TRANSIT">🚌 Kombi (Transit)</SelectItem>
                  <SelectItem value="WALKING">🚶 Walking</SelectItem>
                  <SelectItem value="BICYCLING">🚴 Bicycle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="highways">Avoid Highways</Label>
                <Switch
                  id="highways"
                  checked={routeOptions.avoidHighways}
                  onCheckedChange={(checked) => setRouteOptions(prev => ({ ...prev, avoidHighways: checked }))}
                  disabled={isPanelLoading}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="tolls">Avoid Tolls</Label>
                <Switch
                  id="tolls"
                  checked={routeOptions.avoidTolls}
                  onCheckedChange={(checked) => setRouteOptions(prev => ({ ...prev, avoidTolls: checked }))}
                  disabled={isPanelLoading}
                />
              </div>
            </div>

            <Button
              onClick={handleOptimizeRoute}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isPanelLoading || !startPoint || !endPoint || !user}
            >
              {isPanelLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Route className="w-4 h-4 mr-2" />
              )}
              {isPanelLoading ? "Optimizing..." : "Optimize Route"}
            </Button>
          </CardContent>
        </Card>

        {currentWeather && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CloudRain className="w-5 h-5 mr-2 text-blue-500" />
                Current Weather (Start Point)
                {isWeatherLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={currentWeather.icon}
                  alt={currentWeather.description}
                  className="w-12 h-12 mr-2"
                />
                <div>
                  <p className="text-lg font-semibold">{currentWeather.temperature}°C</p>
                  <p className="text-sm text-muted-foreground capitalize">{currentWeather.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm">Humidity: {currentWeather.humidity}%</p>
                <p className="text-sm">Wind: {currentWeather.windSpeed} m/s</p>
              </div>
            </CardContent>
          </Card>
        )}

        {routeResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRight className="w-5 h-5 mr-2 text-secondary" />
                Route Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <div className="text-lg font-montserrat font-bold text-primary">
                    {routeResults.distance}
                  </div>
                  <div className="text-sm text-muted-foreground">Distance</div>
                </div>
                <div className="text-center p-3 bg-secondary/5 rounded-lg">
                  <div className="text-lg font-montserrat font-bold text-secondary">
                    {routeResults.duration}
                  </div>
                  <div className="text-sm text-muted-foreground">Duration (with traffic)</div>
                </div>
              </div>

              {routeResults.transportMode === 'DRIVING' && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-montserrat font-bold text-foreground">
                    {routeResults.fuelCost}
                  </div>
                  <div className="text-sm text-muted-foreground">Est. Fuel Cost (average car)</div>
                </div>
              )}

              {routeResults.transportMode === 'TRANSIT' && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-montserrat font-bold text-foreground">
                    {routeResults.busFare}
                  </div>
                  <div className="text-sm text-muted-foreground">Est. Kombi Fare</div>
                </div>
              )}

              {routeResults.alternatives > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Found {routeResults.alternatives} alternative route(s).
                </p>
              )}

              <Separator />

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!!routeResults.savedRouteId} // Disable if already saved
                  onClick={() => toast({
                    title: "Route Already Saved",
                    description: `This route has been saved with ID: ${routeResults.savedRouteId}`,
                    variant: "info"
                  })}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {routeResults.savedRouteId ? `Saved (ID: ${routeResults.savedRouteId})` : "Save Route"}
                </Button>
                {/* <Button className="flex-1 bg-secondary hover:bg-secondary/90">
                  <Save className="w-4 h-4 mr-2" />
                  Start Navigation
                </Button> */}
              </div>
            </CardContent>
          </Card>
        )}

        <AIChatCard
          routeDetails={routeResults}
          startPoint={startPoint}
          endPoint={endPoint}
          weather={currentWeather}
          initialAiInsights={routeResults?.aiInsights}
        />
      </div>
    </div>
  );
};
