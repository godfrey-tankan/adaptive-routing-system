// src/components/map/PlaceSearchInput.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Search, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/hooks/use-toast';
// Import Google Maps types for TypeScript
import type { } from '@types/google.maps';

// Define a type for a geographic point
export type GeoPoint = {
    name: string; // The primary name of the place
    coordinates: [number, number]; // [longitude, latitude]
    address: string; // Full address
    placeId: string; // Google Place ID
};

interface PlaceSearchInputProps {
    value: GeoPoint | null;
    onSelect: (point: GeoPoint | null) => void;
    placeholder?: string;
    className?: string;
    currentMapCenter?: [number, number] | null;
}

declare global {
    interface Window {
        google: typeof import('@googlemaps/google-maps-services-js').google.maps;
    }
}

// Component function for use with React.memo
const minLettersForSearch = 4;

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
    value,
    onSelect,
    placeholder = 'Search for a location...',
    className,
    currentMapCenter,
}) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value ? value.name : '');
    const [searchResults, setSearchResults] = useState<GeoPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedSearchTerm = useDebounce(inputValue, 500);

    // New state for "4 new letters" logic
    const [lastSearchInputLength, setLastSearchInputLength] = useState(0);

    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

    // Effect to initialize Google Maps services
    useEffect(() => {
        const checkGoogleMaps = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                if (!autocompleteServiceRef.current) {
                    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
                }
                if (!placesServiceRef.current) {
                    placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
                }
                console.log("PlaceSearchInput: Google Maps Places services initialized.");
            } else {
                console.warn("PlaceSearchInput: Google Maps JavaScript API or Places library not loaded yet. Retrying in 100ms...");
                setTimeout(checkGoogleMaps, 100);
            }
        };

        checkGoogleMaps();
    }, []);

    // Effect to synchronize inputValue with the external 'value' prop
    useEffect(() => {
        if (value) {
            if (value.name !== inputValue) {
                setInputValue(value.name);
                setLastSearchInputLength(value.name.length);
            }
        } else if (inputValue !== '') {
            setInputValue('');
            setLastSearchInputLength(0); // Reset length when input is cleared
        }
    }, [value]); // Only depend on 'value' to react to external changes

    useEffect(() => {
        const fetchPlaces = async () => { // Made async for potential future async operations if needed
            console.log("PlaceSearchInput: Debounced search term changed:", debouncedSearchTerm);

            const currentInputLength = debouncedSearchTerm.length;

            if (!debouncedSearchTerm || currentInputLength < minLettersForSearch) {
                console.log("PlaceSearchInput: Search term is empty or too short, clearing results.");
                setSearchResults([]);
                setIsLoading(false);
                setLastSearchInputLength(0); // Reset length when input is cleared
                return;
            }

            if (!autocompleteServiceRef.current || !placesServiceRef.current) {
                console.warn("PlaceSearchInput: Google Maps services not ready. Cannot search yet.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const request: google.maps.places.AutocompletionRequest = {
                    input: debouncedSearchTerm,
                    componentRestrictions: { country: 'zw' },
                    types: ['geocode', 'establishment'],
                };

                if (currentMapCenter) {
                    if (currentMapCenter[0] !== undefined && currentMapCenter[1] !== undefined) {
                        request.locationBias = {
                            center: new window.google.maps.LatLng(currentMapCenter[1], currentMapCenter[0]),
                            radius: 50000,
                        };
                        console.log("PlaceSearchInput: Adding location bias:", request.locationBias);
                    } else {
                        console.warn("PlaceSearchInput: currentMapCenter is invalid, not applying location bias.");
                    }
                }

                console.log("PlaceSearchInput: Calling getPlacePredictions with request:", request);
                autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
                    console.log("PlaceSearchInput: getPlacePredictions callback - Status:", status, "Predictions:", predictions);

                    if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                        // Crucially, update lastSearchInputLength ONLY on a successful API response
                        setLastSearchInputLength(currentInputLength);

                        const detailedResultsPromises = predictions.map((prediction) => {
                            return new Promise<GeoPoint | null>((resolve) => {
                                if (placesServiceRef.current) {
                                    placesServiceRef.current.getDetails(
                                        {
                                            placeId: prediction.place_id,
                                            fields: ['geometry', 'name', 'formatted_address'],
                                        },
                                        (place, detailsStatus) => {
                                            if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                                                resolve({
                                                    name: place.name || prediction.description,
                                                    coordinates: [place.geometry.location.lng(), place.geometry.location.lat()],
                                                    address: place.formatted_address || prediction.description,
                                                    placeId: prediction.place_id,
                                                });
                                            } else {
                                                console.warn(`Could not get full details for ${prediction.description} (status: ${detailsStatus}). Using prediction info.`);
                                                resolve({
                                                    name: prediction.description,
                                                    coordinates: [0, 0],
                                                    address: prediction.description,
                                                    placeId: prediction.place_id,
                                                });
                                            }
                                        }
                                    );
                                } else {
                                    console.error("PlaceSearchInput: PlacesService is not available when trying to get details.");
                                    resolve(null);
                                }
                            });
                        });

                        Promise.all(detailedResultsPromises).then((results) => {
                            setSearchResults(results.filter(Boolean) as GeoPoint[]);
                            setIsLoading(false);
                        });
                    } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        console.log("PlaceSearchInput: No results found for query.");
                        setSearchResults([]);
                        setIsLoading(false);
                        setLastSearchInputLength(currentInputLength); // Still update length to avoid re-triggering immediately on next key
                    } else {
                        console.error("PlaceSearchInput: Error fetching Google Places predictions:", status);
                        toast({ title: "Search Error", description: `Failed to fetch place suggestions: ${status}.`, variant: "destructive" });
                        setSearchResults([]);
                        setIsLoading(false);
                        setLastSearchInputLength(currentInputLength); // Still update length to avoid re-triggering immediately on next key
                    }
                });
            } catch (error) {
                console.error("PlaceSearchInput: An unhandled error occurred with Google Places API request:", error);
                toast({ title: "Search Error", description: "An unexpected error occurred while searching for places.", variant: "destructive" });
                setSearchResults([]);
                setIsLoading(false);
            }
        };

        fetchPlaces();
    }, [debouncedSearchTerm, currentMapCenter, lastSearchInputLength]); // ADD lastSearchInputLength to dependencies

    // Memoize handleSelect and handleClear to prevent new function references on every render,
    // which helps if they were passed down as props to memoized children (though not directly here)
    const handleSelect = useCallback((selectedPoint: GeoPoint) => {
        setInputValue(selectedPoint.name);
        onSelect(selectedPoint);
        setOpen(false);
        setLastSearchInputLength(selectedPoint.name.length); // Update length when a selection is made
    }, [onSelect]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setInputValue('');
        setSearchResults([]);
        onSelect(null);
        setOpen(false);
        setLastSearchInputLength(0); // Reset length when input is cleared
    }, [onSelect]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className={cn("relative flex items-center", className)}>
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-8 pr-8"
                        onFocus={() => setOpen(true)}
                    />
                    <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
                    {inputValue && (
                        <XCircle
                            className="absolute right-2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                            onClick={handleClear}
                        />
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]">
                <Command>
                    <CommandInput
                        placeholder="Search locations..."
                        value={inputValue}
                        onValueChange={setInputValue}
                        className="sr-only"
                    />
                    <CommandList>
                        {isLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                            </div>
                        ) : searchResults.length === 0 && debouncedSearchTerm && debouncedSearchTerm.length >= minLettersForSearch ? (
                            <CommandEmpty>No results found for "{debouncedSearchTerm}".</CommandEmpty>
                        ) : searchResults.length === 0 && (!debouncedSearchTerm || debouncedSearchTerm.length < minLettersForSearch) ? (
                            <CommandEmpty>Start typing to search for a place (min {minLettersForSearch} letters).</CommandEmpty>
                        ) : (
                            <CommandGroup>
                                {searchResults.map((point) => (
                                    <CommandItem
                                        key={point.placeId}
                                        value={point.name}
                                        onSelect={() => handleSelect(point)}
                                        className="flex items-center justify-between"
                                    >
                                        <span>{point.name}</span>
                                        {point.address && (
                                            <span className="text-muted-foreground text-xs ml-2 text-right overflow-hidden text-ellipsis whitespace-nowrap max-w-[60%]">
                                                {point.address?.replace(`${point.name}, `, '')}
                                            </span>
                                        )}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                value?.placeId === point.placeId
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

// Export the memoized component
export const MemoizedPlaceSearchInput = React.memo(PlaceSearchInput);