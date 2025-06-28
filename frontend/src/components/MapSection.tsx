
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Compass } from "lucide-react";

export const MapSection = () => {
  const [mapStyle, setMapStyle] = useState('streets');

  return (
    <Card className="h-full min-h-[500px] overflow-hidden relative">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <Button
          variant={mapStyle === 'streets' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('streets')}
          className="bg-white/90 backdrop-blur-sm hover:bg-white"
        >
          Streets
        </Button>
        <Button
          variant={mapStyle === 'satellite' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('satellite')}
          className="bg-white/90 backdrop-blur-sm hover:bg-white"
        >
          Satellite
        </Button>
      </div>

      {/* Map Container */}
      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-secondary/5 relative">
        {/* Placeholder Map - In real implementation, this would be Mapbox GL JS */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Map className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-montserrat font-semibold text-foreground">
                Interactive Map
              </h3>
              <p className="text-muted-foreground">
                Mapbox GL JS integration would go here
              </p>
            </div>
          </div>
        </div>

        {/* Route Visualization */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            d="M100,300 Q300,200 500,300 T900,300"
            stroke="#008080"
            strokeWidth="4"
            fill="none"
            strokeDasharray="10,5"
            className="animate-pulse"
          />
          <circle cx="100" cy="300" r="8" fill="#008080" className="animate-ping" />
          <circle cx="900" cy="300" r="8" fill="#FFA500" className="animate-ping" />
        </svg>

        {/* Location Marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-6 h-6 bg-primary rounded-full animate-ping"></div>
            <div className="absolute top-0 left-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Compass className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        {/* Traffic Indicators */}
        <div className="absolute top-16 left-16 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium">Light Traffic</span>
          </div>
        </div>

        <div className="absolute top-32 right-32 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Moderate Traffic</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
