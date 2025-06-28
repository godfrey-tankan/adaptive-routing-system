
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Map, Car, Route, Star, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const RouteControlPanel = () => {
  const [routeData, setRouteData] = useState({
    from: '',
    to: '',
    transportMode: 'car',
    avoidHighways: false,
    avoidTolls: false
  });

  const [routeResults, setRouteResults] = useState(null);

  const handleOptimizeRoute = () => {
    if (!routeData.from || !routeData.to) {
      toast({
        title: "Missing Information",
        description: "Please enter both start and end locations.",
        variant: "destructive"
      });
      return;
    }

    // Simulate route calculation
    const mockResults = {
      distance: "12.5 km",
      duration: "25 mins",
      fuelCost: "ZWL $45.00",
      alternatives: 2
    };

    setRouteResults(mockResults);
    toast({
      title: "Route Optimized",
      description: "Found the best route for your journey!",
    });
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
              placeholder="Enter starting location"
              value={routeData.from}
              onChange={(e) => setRouteData(prev => ({ ...prev, from: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              placeholder="Enter destination"
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
                <SelectItem value="car">🚗 Private Car</SelectItem>
                <SelectItem value="kombi">🚐 Kombi</SelectItem>
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
          >
            <Route className="w-4 h-4 mr-2" />
            Optimize Route
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

      {/* AI Insights */}
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
