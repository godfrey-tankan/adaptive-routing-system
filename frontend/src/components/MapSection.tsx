// src/components/MapSection.tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Compass } from "lucide-react";
import MapGL, { Source, Layer, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css'; // Don't forget to import Mapbox GL CSS
import mapboxgl from 'mapbox-gl'; // Import mapbox-gl for LngLatBounds

// Replace with your actual Mapbox Public Access Token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN; // Recommended way

export const MapSection = () => {
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v11'); // Default to streets
  const mapRef = useRef(null);

  // Initial view state for Harare, Zimbabwe
  const [viewState, setViewState] = useState({
    longitude: 31.0530, // Approx. longitude for Harare
    latitude: -17.8252, // Approx. latitude for Harare
    zoom: 12
  });

  // Example route data (will come from RouteControlPanel in a real app)
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [startMarker, setStartMarker] = useState<[number, number] | null>(null);
  const [endMarker, setEndMarker] = useState<[number, number] | null>(null);

  // This function would be called from RouteControlPanel upon route optimization
  const updateMapWithRoute = useCallback((startCoords: [number, number], endCoords: [number, number], geoJSON: any) => {
    setStartMarker(startCoords);
    setEndMarker(endCoords);
    setRouteGeoJSON(geoJSON);

    // Fit map to route bounds (optional, but good for UX)
    if (mapRef.current && geoJSON) {
      // You'll need to calculate bounds from the geoJSON for a perfect fit
      // For simplicity, we'll just center between start and end for this example
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(startCoords);
      bounds.extend(endCoords);
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, []);

  // Expose this function for the RouteControlPanel to call
  // You might want to lift state up or use a context for this
  useEffect(() => {
    // This is a placeholder. In a real app, RouteControlPanel would send data here.
    // For demonstration, let's simulate a route after initial load.
    // Example coordinates for a route within Harare
    const mockStart = [31.0530, -17.8252]; // Harare CBD
    const mockEnd = [30.9800, -17.7800]; // Another point in Harare
    const mockGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          mockStart,
          [31.02, -17.80], // Intermediate point
          mockEnd
        ]
      }
    };
    updateMapWithRoute(mockStart, mockEnd, mockGeoJSON);
  }, [updateMapWithRoute]);


  const layerStyle = {
    id: 'route',
    type: 'line',
    paint: {
      'line-color': '#008080',
      'line-width': 4,
      'line-dasharray': [2, 2], // For animated dashed line
    },
  };

  return (
    <Card className="h-full min-h-[500px] overflow-hidden relative">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <Button
          variant={mapStyle === 'mapbox://styles/mapbox/streets-v11' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('mapbox://styles/mapbox/streets-v11')}
          className="bg-white/90 backdrop-blur-sm hover:bg-white"
        >
          Streets
        </Button>
        <Button
          variant={mapStyle === 'mapbox://styles/mapbox/satellite-streets-v11' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('mapbox://styles/mapbox/satellite-streets-v11')}
          className="bg-white/90 backdrop-blur-sm hover:bg-white"
        >
          Satellite
        </Button>
      </div>

      {/* Map Container */}
      <MapGL
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        ref={mapRef}
      >
        {routeGeoJSON && (
          <Source id="my-route" type="geojson" data={routeGeoJSON}>
            <Layer {...layerStyle} />
          </Source>
        )}

        {startMarker && (
          <Marker longitude={startMarker[0]} latitude={startMarker[1]} anchor="bottom">
            <div className="relative">
              <div className="w-6 h-6 bg-primary rounded-full animate-ping"></div>
              <div className="absolute top-0 left-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Compass className="w-3 h-3 text-white" />
              </div>
            </div>
          </Marker>
        )}

        {endMarker && (
          <Marker longitude={endMarker[0]} latitude={endMarker[1]} anchor="bottom">
            <div className="relative">
              <div className="w-6 h-6 bg-orange-500 rounded-full"></div> {/* Different color for end */}
              <div className="absolute top-0 left-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <Map className="w-3 h-3 text-white" />
              </div>
            </div>
          </Marker>
        )}

        {/* Traffic Indicators - These would ideally be dynamic based on Mapbox API responses */}
        {/* For now, keep them as static placeholders for visual consistency */}
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

      </MapGL>
    </Card>
  );
};