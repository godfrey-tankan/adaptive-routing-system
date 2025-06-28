// src/components/RouteControlPanel.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Map, Car, Route, Star, ArrowRight, Loader2 } from "lucide-react"; // Add Loader2 for loading state
import { toast } from "@/hooks/use-toast";

// Import MapSection here or pass a function to update the map
// For simplicity, let's assume MapSection is a sibling component that can receive updates via props or context
// A better approach would be a shared state/context for map data
import { MapSection } from "./MapSection"; // Assuming MapSection is in the same directory for this example

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export const RouteControlPanel = ({ updateMapWithRoute }: { updateMapWithRoute: (start: [number, number], end: [number, number], geoJSON: any) => void }) => {
  const [routeData, setRouteData] = useState({
    from: '',
    to: '',
    transportMode: 'driving', // Mapbox uses 'driving', 'walking', 'cycling'
    avoidHighways: false,
    avoidTolls: false
  });
  const [routeResults, setRouteResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const geocodeAddress = async (address: string) => {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].center; // [longitude, latitude]
    }
    return null;
  };

  const getRoute = async (startCoords: [number, number], endCoords: [number, number], profile: string, avoidHighways: boolean, avoidTolls: boolean) => {
    let url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startCoords.join(',')};${endCoords.join(',')}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

    // Add avoidance options if true
    const alternatives = [];
    if (avoidHighways) alternatives.push('toll'); // Mapbox uses 'toll' for avoiding tolls, not necessarily highways directly in this parameter
    // Mapbox doesn't have a direct "avoid highways" parameter for all profiles,
    // but avoiding tolls often implies avoiding major highways.
    // For more granular control, you might need to use waypoints or custom logic.
    if (avoidTolls) alternatives.push('toll');

    if (alternatives.length > 0) {
      url += `&alternatives=true&exclude=${alternatives.join(',')}`;
    } else {
      url += `&alternatives=false`; // Ensure no alternatives if none are explicitly requested
    }


    const response = await fetch(url);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        geoJSON: route.geometry,
        distance: `${(route.distance / 1000).toFixed(1)} km`, // meters to km
        duration: `${Math.round(route.duration / 60)} mins`, // seconds to minutes
        // Fuel cost simulation remains static for now, as it's not a Mapbox feature
        fuelCost: "ZWL $45.00", // This would need a custom calculation based on vehicle type and fuel price
        alternatives: data.routes.length - 1
      };
    }
    return null;
  };

  const handleOptimizeRoute = async () => {
    if (!routeData.from || !routeData.to) {
      toast({
        title: "Missing Information",
        description: "Please enter both start and end locations.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setRouteResults(null);

    try {
      const startCoords = await geocodeAddress(routeData.from + ", Harare, Zimbabwe"); // Add context for geocoding
      const endCoords = await geocodeAddress(routeData.to + ", Harare, Zimbabwe");

      if (!startCoords || !endCoords) {
        toast({
          title: "Location Not Found",
          description: "Could not find coordinates for one or both locations. Please be more specific.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Map our transport modes to Mapbox profiles
      let mapboxProfile = 'driving';
      if (routeData.transportMode === 'walking') {
        mapboxProfile = 'walking';
      } else if (routeData.transportMode === 'bicycle') {
        mapboxProfile = 'cycling';
      }
      // 'kombi' would still map to 'driving' for Mapbox, or require public transit API if available

      const results = await getRoute(
        startCoords,
        endCoords,
        mapboxProfile,
        routeData.avoidHighways,
        routeData.avoidTolls
      );

      if (results) {
        setRouteResults(results);
        // This is crucial: update the MapSection
        updateMapWithRoute(startCoords, endCoords, results.geoJSON);
        toast({
          title: "Route Optimized",
          description: "Found the best route for your journey!",
        });
      } else {
        toast({
          title: "No Route Found",
          description: "Could not find a route between the specified locations.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error optimizing route:", error);
      toast({
        title: "Error",
        description: "An error occurred while optimizing the route. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Route Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Map className="w-5 h-5 mr-2 text-primary" />
            Plan Your Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              placeholder="e.g., Avondale, Harare"
              value={routeData.from}
              onChange={(e) => setRouteData(prev => ({ ...prev, from: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              placeholder="e.g., CBD, Harare"
              value={routeData.to}
              onChange={(e) => setRouteData(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Transport Mode</Label>
            <Select
              value={routeData.transportMode}
              onValueChange={(value) => setRouteData(prev => ({ ...prev, transportMode: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driving">🚗 Private Car</SelectItem>
                <SelectItem value="kombi">🚐 Kombi (Driving profile)</SelectItem> {/* Map kombi to driving for Mapbox */}
                <SelectItem value="walking">🚶 Walking</SelectItem>
                <SelectItem value="bicycle">🚴 Bicycle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="highways">Avoid Highways</Label>
              <Switch
                id="highways"
                checked={routeData.avoidHighways}
                onCheckedChange={(checked) => setRouteData(prev => ({ ...prev, avoidHighways: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tolls">Avoid Tolls</Label>
              <Switch
                id="tolls"
                checked={routeData.avoidTolls}
                onCheckedChange={(checked) => setRouteData(prev => ({ ...prev, avoidTolls: checked }))}
              />
            </div>
          </div>

          <Button
            onClick={handleOptimizeRoute}
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Route className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "Optimizing..." : "Optimize Route"}
          </Button>
        </CardContent>
      </Card>

      {/* Route Results */}
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
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-montserrat font-bold text-foreground">
                {routeResults.fuelCost}
              </div>
              <div className="text-sm text-muted-foreground">Est. Fuel Cost</div>
            </div>

            <Separator />

            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1">
                <Star className="w-4 h-4 mr-2" />
                Save Route
              </Button>
              <Button className="flex-1 bg-secondary hover:bg-secondary/90">
                Start Navigation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights - These would also be dynamic from backend/AI service */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-5 h-5 mr-2 bg-gradient-to-r from-primary to-secondary rounded"></div>
            AI Route Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Good traffic conditions ahead</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm">Construction on Borrowdale Road</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">3 kombi stops along route</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};