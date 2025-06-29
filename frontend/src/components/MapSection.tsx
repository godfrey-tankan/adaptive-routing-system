// src/components/MapSection.tsx
import React, { useState, useRef, useEffect, memo } from "react";
// Ensure you are importing from 'react-map-gl/maplibre'
import Map, { Source, Layer, Marker, NavigationControl, MapRef, ScaleControl, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { LngLatBounds } from "maplibre-gl"; // Keep maplibregl for types and LngLatBounds
import type { AnyLayer } from 'maplibre-gl'; // Keep for types
import { MapPin, Loader2 } from "lucide-react";

// IMPORTANT: Use import.meta.env for your API key
const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

// MapTiler Streets style for the base map
const DEFAULT_MAP_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_API_KEY}`;

interface MapSectionProps {
  routeGeoJSON: any | null;
  startMarker: [number, number] | null;
  endMarker: [number, number] | null;
  isLoading: boolean;
  // NEW PROP: Callback to pass the map instance up
  onMapInstanceReady?: (map: maplibregl.Map) => void;
}

const routeLayerStyle: AnyLayer = {
  id: "route",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#4F46E5",
    "line-width": 6,
    "line-opacity": 0.8,
  },
};

export const MapSection: React.FC<MapSectionProps> = memo(
  ({ routeGeoJSON, startMarker, endMarker, isLoading, onMapInstanceReady }) => { // Include onMapInstanceReady
    const mapRef = useRef<MapRef | null>(null);
    const [viewState, setViewState] = useState({
      longitude: 31.0531, // Default to Harare, Zimbabwe
      latitude: -17.8252, // Default to Harare, Zimbabwe
      zoom: 12,
    });

    useEffect(() => {
      const mapInstance = mapRef.current?.getMap();

      // Pass map instance to parent once it's available
      if (mapInstance && onMapInstanceReady) {
        onMapInstanceReady(mapInstance);
      }

      // Logic to fit map to route or markers (optimized)
      if (mapInstance) {
        if (routeGeoJSON) {
          const bounds = new LngLatBounds();
          routeGeoJSON.features.forEach((feature: any) => {
            if (feature.geometry.type === "LineString") {
              feature.geometry.coordinates.forEach((coord: [number, number]) => {
                bounds.extend(coord);
              });
            }
          });
          mapInstance.fitBounds(bounds, { padding: 40, duration: 1000 });
        } else if (startMarker && endMarker) {
          const bounds = new LngLatBounds();
          bounds.extend(startMarker);
          bounds.extend(endMarker);
          mapInstance.fitBounds(bounds, { padding: 80, duration: 1000 });
        } else if (startMarker) {
          // If only start marker, fly to it
          mapInstance.flyTo({ center: startMarker, zoom: 14, duration: 1000 });
        } else if (endMarker) {
          // If only end marker, fly to it (less common, but good to have)
          mapInstance.flyTo({ center: endMarker, zoom: 14, duration: 1000 });
        }
      }
    }, [routeGeoJSON, startMarker, endMarker, onMapInstanceReady]); // Add onMapInstanceReady to dependencies

    const onMapLoad = () => {
      console.log("MapGL: Map loaded successfully.");
    };

    const onMapError = (e: any) => { // Use any for error to capture full object
      console.error("MapGL: Error loading map:", e);
    };

    return (
      <div className="relative w-full h-[500px] lg:h-full rounded-lg overflow-hidden shadow-lg bg-gray-200">
        {isLoading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <p className="ml-3 text-white text-lg">Loading route...</p>
          </div>
        )}

        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle={DEFAULT_MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          onLoad={onMapLoad}
          onError={onMapError}
          antialias={true}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation={true}
            showUserHeading={true}
            position="top-left"
          />
          <ScaleControl position="bottom-left" />

          {routeGeoJSON && (
            <Source id="route-source" type="geojson" data={routeGeoJSON}>
              <Layer {...routeLayerStyle} />
            </Source>
          )}

          {startMarker && (
            <Marker longitude={startMarker[0]} latitude={startMarker[1]} anchor="bottom">
              <MapPin className="text-green-500 w-8 h-8" fill="currentColor" />
            </Marker>
          )}

          {endMarker && (
            <Marker longitude={endMarker[0]} latitude={endMarker[1]} anchor="bottom">
              <MapPin className="text-red-500 w-8 h-8" fill="currentColor" />
            </Marker>
          )}
        </Map>
      </div>
    );
  }
);

MapSection.displayName = "MapSection";