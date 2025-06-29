// src/components/MapSection.tsx
import React, { useState, useRef, useEffect, memo, useCallback } from "react";
import Map, { Source, Layer, Marker, NavigationControl, MapRef, ScaleControl, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import type { AnyLayer } from 'maplibre-gl';
import { MapPin, Loader2, CarFront } from "lucide-react";

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const DEFAULT_MAP_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_API_KEY}`;

interface MapSectionProps {
  routeGeoJSON: any | null;
  startMarker: [number, number] | null;
  endMarker: [number, number] | null;
  isLoading: boolean;
  onMapInstanceReady?: (map: maplibregl.Map) => void;
  simulatedVehiclePosition?: [number, number] | null;
}

const routeLayerStyle: AnyLayer = {
  id: "route",
  type: "line",
  source: "route-source",
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
  ({ routeGeoJSON, startMarker, endMarker, isLoading, onMapInstanceReady, simulatedVehiclePosition }) => {
    const mapRef = useRef<MapRef | null>(null);
    const [viewState, setViewState] = useState({
      longitude: 31.0531,
      latitude: -17.8252,
      zoom: 12,
    });

    const cleanRouteGeoJSON = useCallback(() => {
      if (!routeGeoJSON) return null;

      // Ensure we have a proper GeoJSON Feature
      if (routeGeoJSON.type === 'LineString') {
        return {
          type: 'Feature',
          geometry: routeGeoJSON,
          properties: {}
        };
      }

      // If it's already a Feature, just return it
      if (routeGeoJSON.type === 'Feature') {
        return routeGeoJSON;
      }

      // If it's a FeatureCollection with one feature, extract it
      if (routeGeoJSON.type === 'FeatureCollection' && routeGeoJSON.features?.length > 0) {
        return routeGeoJSON.features[0];
      }

      return null;
    }, [routeGeoJSON]);

    useEffect(() => {
      const mapInstance = mapRef.current?.getMap();

      if (mapInstance && onMapInstanceReady) {
        onMapInstanceReady(mapInstance);
      }

      if (mapInstance) {
        const cleanGeoJSON = cleanRouteGeoJSON();
        if (cleanGeoJSON) {
          const bounds = new LngLatBounds();
          if (cleanGeoJSON.geometry.type === "LineString") {
            cleanGeoJSON.geometry.coordinates.forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
            mapInstance.fitBounds(bounds, { padding: 40, duration: 1000 });
          }
        } else if (startMarker && endMarker) {
          const bounds = new LngLatBounds();
          bounds.extend(startMarker);
          bounds.extend(endMarker);
          mapInstance.fitBounds(bounds, { padding: 80, duration: 1000 });
        } else if (startMarker) {
          mapInstance.flyTo({ center: startMarker, zoom: 14, duration: 1000 });
        } else if (endMarker) {
          mapInstance.flyTo({ center: endMarker, zoom: 14, duration: 1000 });
        }
      }
    }, [routeGeoJSON, startMarker, endMarker, onMapInstanceReady, cleanRouteGeoJSON]);

    const onMapLoad = () => {
      console.log("MapGL: Map loaded successfully.");
    };

    const onMapError = (e: any) => {
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

          {cleanRouteGeoJSON() && (
            <Source
              id="route-source"
              type="geojson"
              data={cleanRouteGeoJSON()}
            >
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

          {simulatedVehiclePosition && (
            <Marker longitude={simulatedVehiclePosition[0]} latitude={simulatedVehiclePosition[1]} anchor="center">
              <CarFront className="w-8 h-8 text-blue-600 drop-shadow-md" />
            </Marker>
          )}
        </Map>
      </div>
    );
  }
);

MapSection.displayName = "MapSection";