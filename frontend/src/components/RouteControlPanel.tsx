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

const Maps_API_KEY = import.meta.env.VITE_Maps_API_KEY;
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

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

export const RouteControlPanel: React.FC<RouteControlPanelProps> = ({
  updateMapWithRoute,
  setIsLoadingMapAndRoute,
  mapInstance,
}) => {
  const [startPoint, setStartPoint] = useState<GeoPoint | null>(null);
  const [endPoint, setEndPoint] = useState<GeoPoint | null>(null);
  const [routeOptions, setRouteOptions] = useState({
    transportMode: 'DRIVING',
    avoidHighways: false,
    avoidTolls: false
  });
  const [routeResults, setRouteResults] = useState<any>(null);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  useEffect(() => {
    updateMapWithRoute(
      startPoint ? startPoint.coordinates : null,
      endPoint ? endPoint.coordinates : null,
      null
    );

    if (mapInstance) {
      if (startPoint && !endPoint) {
        mapInstance.flyTo({ center: startPoint.coordinates, zoom: 14, duration: 1000 });
      } else if (endPoint && !startPoint) {
        mapInstance.flyTo({ center: endPoint.coordinates, zoom: 14, duration: 1000 });
      }
    }
  }, [startPoint, endPoint, mapInstance, updateMapWithRoute]);

  const fetchWeather = useCallback(async (coords: [number, number]) => {
    if (!OPENWEATHER_API_KEY) {
      console.warn("OpenWeatherMap API Key is missing. Cannot fetch weather data.");
      return null;
    }

    setIsWeatherLoading(true);
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords[1]}&lon=${coords[0]}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
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
  }, [OPENWEATHER_API_KEY]);

  useEffect(() => {
    if (startPoint) {
      fetchWeather(startPoint.coordinates).then(setCurrentWeather);
    } else {
      setCurrentWeather(null);
    }
  }, [startPoint, fetchWeather]);

  const getRoute = useCallback(async (
    startPlaceId: string,
    endPlaceId: string,
    profile: string,
    avoidHighways: boolean,
    avoidTolls: boolean
  ) => {
    if (!Maps_API_KEY) {
      console.error("Google Maps API Key is missing for Directions API.");
      toast({
        title: "API Key Missing",
        description: "Google Maps API Key not configured for directions.",
        variant: "destructive"
      });
      return null;
    }

    const googleMode = profile;
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=place_id:${startPlaceId}&destination=place_id:${endPlaceId}&mode=${googleMode}&key=${Maps_API_KEY}`;
    const avoidParams = [];

    if (avoidHighways) avoidParams.push('highways');
    if (avoidTolls) avoidParams.push('tolls');

    if (avoidParams.length > 0) {
      url += `&avoid=${avoidParams.join('|')}`;
    }

    if (googleMode === 'DRIVING') {
      url += `&departure_time=now&traffic_model=best_guess`;
    }

    console.log("RouteControlPanel: Google Directions API URL:", url);
    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const overviewPolyline = route.overview_polyline.points;

        const decodedPath = decodePolyline(overviewPolyline);
        const geoJSONLineString = {
          type: 'LineString',
          coordinates: decodedPath,
        };

        const durationInTraffic = route.legs[0]?.duration_in_traffic?.value || route.legs[0]?.duration?.value;
        const distance = route.legs[0]?.distance?.value || 0;

        return {
          geoJSON: geoJSONLineString,
          distance: `${(distance / 1000).toFixed(1)} km`,
          duration: `${Math.round(durationInTraffic / 60)} mins`,
          fuelCost: "ZWL $XX.XX",
          alternatives: data.routes.length > 1 ? data.routes.length - 1 : 0,
          avoidHighways,
          avoidTolls,
          transportMode: profile
        };
      }
      console.warn("RouteControlPanel: No routes found in Google Directions API response.");
      return null;
    } catch (error: any) {
      console.error("RouteControlPanel: Error fetching Google route:", error.response?.data || error.message);
      toast({
        title: "Route Calculation Failed",
        description: `Could not calculate route: ${error.response?.data?.error_message || error.message}. Check locations.`,
        variant: "destructive"
      });
      return null;
    }
  }, [Maps_API_KEY, toast]);

  const handleOptimizeRoute = async () => {
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
        routeOptions.avoidTolls
      );

      if (results) {
        setRouteResults(results);
        updateMapWithRoute(startPoint.coordinates, endPoint.coordinates, results.geoJSON);
        toast({
          title: "Route Optimized Successfully!",
          description: "Found the best route for your journey!",
        });

        if (mapInstance && results.geoJSON) {
          const bounds = new LngLatBounds();
          results.geoJSON.coordinates.forEach((coord: [number, number]) => {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Map className="w-5 h-5 mr-2 text-primary" />
            Plan Your Route
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
            disabled={isPanelLoading || !startPoint || !endPoint}
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
          <CardContent className="space-y-4">
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

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-montserrat font-bold text-foreground">
                {routeResults.fuelCost}
              </div>
              <div className="text-sm text-muted-foreground">Est. Fuel Cost</div>
            </div>

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
      />
    </div>
  );
};