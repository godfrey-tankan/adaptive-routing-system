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
  geoJSON: any;
  distance: string;
  distanceInKm: number;
  duration: string;
  fuelCost: string;
  busFare: string;
  alternatives: number;
  avoidHighways: boolean;
  avoidTolls: boolean;
  transportMode: string;
  aiInsights?: string;
}

const TRANSPORT_MODE_MAP: Record<string, string> = {
  DRIVING: 'driving',
  TRANSIT: 'transit',
  WALKING: 'walking',
  BICYCLING: 'bicycling'
};

// Zimbabwe fuel price in USD per liter (average)
const FUEL_PRICE_PER_LITER = 1.50; // USD
const AVERAGE_FUEL_CONSUMPTION = 8; // liters per 100km
const USD_TO_ZWL_RATE = 500; // Current exchange rate (adjust as needed)

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

  // Calculate fuel cost based on distance
  const calculateFuelCost = (distanceInKm: number): string => {
    const fuelUsed = (distanceInKm * AVERAGE_FUEL_CONSUMPTION) / 100;
    const costInUSD = fuelUsed * FUEL_PRICE_PER_LITER;
    const costInZWL = costInUSD * USD_TO_ZWL_RATE;
    return `ZWL $${costInZWL.toFixed(2)} (USD $${costInUSD.toFixed(2)})`;
  };

  // Calculate bus fare based on distance and locations
  const calculateBusFare = (startCoords: [number, number], endCoords: [number, number]): string => {
    // Harare CBD coordinates (approximate)
    const harareCBD = [-17.825166, 31.033510];

    // Function to calculate distance between two points in km
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Distance from Harare CBD
    const distanceFromCBD = getDistance(
      harareCBD[0], harareCBD[1],
      startCoords[1], startCoords[0]
    );

    // Simple fare calculation based on distance from CBD
    if (distanceFromCBD < 15) {
      return "ZWL $1.00 (Standard Harare fare)";
    } else if (distanceFromCBD < 30) {
      return "ZWL $2.00 (Nearby towns fare)";
    } else {
      return "ZWL $3.00+ (Long distance fare)";
    }
  };

  useEffect(() => {
    const updateMapRoute = () => {
      if (!mapInstance) return;

      if (mapInstance.getLayer('route')) {
        mapInstance.removeLayer('route');
        mapInstance.removeSource('route');
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
          if (mapInstance.getLayer('start-point')) {
            mapInstance.removeLayer('start-point');
            mapInstance.removeSource('start-point');
          }
          if (mapInstance.getLayer('end-point')) {
            mapInstance.removeLayer('end-point');
            mapInstance.removeSource('end-point');
          }

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

    updateMapRoute();
  }, [mapInstance, routeResults, startPoint, endPoint]);

  // ... [keep all other existing useEffect hooks and functions the same until getRoute]

  const getRoute = useCallback(async (
    startPlaceId: string,
    endPlaceId: string,
    profile: string,
    avoidHighways: boolean,
    avoidTolls: boolean
  ) => {
    setIsPanelLoading(true);

    try {
      const startCoords = await getPlaceCoordinates(startPlaceId);
      const endCoords = await getPlaceCoordinates(endPlaceId);

      if (!startCoords || !endCoords) {
        throw new Error("Could not get coordinates for places");
      }

      const origin = `${startCoords[1]},${startCoords[0]}`;
      const destination = `${endCoords[1]},${endCoords[0]}`;
      const backendTransportMode = profile.toLowerCase();

      const response = await authAxios.post('/route/optimize/', {
        origin,
        destination,
        mode: backendTransportMode,
        avoid_highways: avoidHighways,
        avoid_tolls: avoidTolls
      });

      const data = response.data.primary_route;

      if (data) {
        const decodedPath = decodePolyline(data.polyline);
        const distanceInKm = data.distance / 1000;
        const geoJSONLineString = {
          type: 'LineString',
          coordinates: decodedPath,
        };

        return {
          geoJSON: geoJSONLineString,
          distance: `${distanceInKm.toFixed(1)} km`,
          distanceInKm,
          duration: `${Math.round(data.duration / 60)} mins`,
          fuelCost: profile === 'DRIVING' ? calculateFuelCost(distanceInKm) : 'N/A',
          busFare: profile === 'TRANSIT' ? calculateBusFare(startCoords, endCoords) : 'N/A',
          alternatives: data.alternatives || 0,
          avoidHighways,
          avoidTolls,
          transportMode: profile,
          aiInsights: response.data.ai_insights
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
          description: "The route optimization service encountered an error.",
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
  }, [user, token]);

  // ... [keep all other existing functions the same]

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto flex-1 space-y-4 p-4">
        {/* ... [keep all existing JSX the same until the Route Summary card] */}

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
                <Button variant="outline" className="flex-1">
                  <Star className="w-4 h-4 mr-2" />
                  Save Route
                </Button>
                <Button className="flex-1 bg-secondary hover:bg-secondary/90">
                  <Save className="w-4 h-4 mr-2" />
                  Start Navigation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <AIChatCard
          routeDetails={routeResults}
          startPoint={startPoint}
          endPoint={endPoint}
          weather={currentWeather}
          aiInsights={routeResults?.aiInsights}
        />
      </div>
    </div>
  );
};