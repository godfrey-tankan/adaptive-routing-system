// src/components/map/PlaceSearchInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Search, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/hooks/use-toast';

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
    currentMapCenter?: [number, number] | null; // For biasing results
}

// Ensure the Google Maps API script has loaded.
// This type declaration helps TypeScript recognize `google.maps`
declare global {
    interface Window {
        google: typeof import('@googlemaps/google-maps-services-js').google.maps;
    }
}

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

    // Ref to store the AutocompleteService instance
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null); // For fetching place details

    // Initialize Google Maps services once the script is loaded
    useEffect(() => {
        // A small delay to ensure the `google.maps` object is fully ready.
        // In many cases, simply checking `window.google` is enough, but a slight delay
        // can help if the script loads asynchronously.
        const checkGoogleMaps = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                if (!autocompleteServiceRef.current) {
                    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
                }
                if (!placesServiceRef.current) {
                    // PlacesService requires a map or a HTMLDivElement. We can create a dummy div.
                    // For just place details, a dummy div is sufficient and doesn't need to be in the DOM.
                    placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
                }
                console.log("PlaceSearchInput: Google Maps Places services initialized.");
            } else {
                console.warn("PlaceSearchInput: Google Maps JavaScript API or Places library not loaded yet. Retrying in 100ms...");
                setTimeout(checkGoogleMaps, 100); // Retry after 100ms
            }
        };

        checkGoogleMaps(); // Initial call
    }, []); // Run once on component mount

    useEffect(() => {
        if (value && value.name !== inputValue) {
            setInputValue(value.name);
        } else if (!value && inputValue !== '') {
            setInputValue('');
        }
    }, [value]);

    useEffect(() => {
        const fetchPlaces = () => {
            console.log("PlaceSearchInput: Debounced search term changed:", debouncedSearchTerm);

            if (!debouncedSearchTerm) {
                setSearchResults([]);
                setIsLoading(false);
                return;
            }

            if (!autocompleteServiceRef.current || !placesServiceRef.current) {
                console.warn("PlaceSearchInput: Google Maps services not ready. Cannot search yet.");
                setIsLoading(false); // Make sure not to show spinner indefinitely
                return;
            }

            setIsLoading(true);
            try {
                const request: google.maps.places.AutocompletionRequest = {
                    input: debouncedSearchTerm,
                    componentRestrictions: { country: 'zw' }, // Restrict to Zimbabwe
                    types: ['geocode', 'establishment'], // Prioritize general locations and businesses
                    // 'address' type can also be useful
                };

                if (currentMapCenter) {
                    // Ensure currentMapCenter is valid [lng, lat]
                    if (currentMapCenter[0] !== undefined && currentMapCenter[1] !== undefined) {
                        request.locationBias = {
                            center: new window.google.maps.LatLng(currentMapCenter[1], currentMapCenter[0]), // lat, lng
                            radius: 50000, // 50km radius for biasing
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
                        const detailedResultsPromises = predictions.map((prediction) => {
                            return new Promise<GeoPoint | null>((resolve) => {
                                // Check if PlacesService is available before calling getDetails
                                if (placesServiceRef.current) {
                                    placesServiceRef.current.getDetails(
                                        {
                                            placeId: prediction.place_id,
                                            fields: ['geometry', 'name', 'formatted_address'], // Request only necessary fields
                                        },
                                        (place, detailsStatus) => {
                                            if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                                                resolve({
                                                    name: place.name || prediction.description, // Use place name if available, fallback to prediction
                                                    coordinates: [place.geometry.location.lng(), place.geometry.location.lat()], // [longitude, latitude]
                                                    address: place.formatted_address || prediction.description,
                                                    placeId: prediction.place_id,
                                                });
                                            } else {
                                                // If details fail, at least use prediction info, but mark coordinates as unknown
                                                console.warn(`Could not get full details for ${prediction.description} (status: ${detailsStatus}). Using prediction info.`);
                                                resolve({
                                                    name: prediction.description,
                                                    coordinates: [0, 0], // Indicate unknown coordinates if details failed
                                                    address: prediction.description,
                                                    placeId: prediction.place_id,
                                                });
                                            }
                                        }
                                    );
                                } else {
                                    console.error("PlaceSearchInput: PlacesService is not available when trying to get details.");
                                    resolve(null); // Resolve with null if service is not ready
                                }
                            });
                        });

                        Promise.all(detailedResultsPromises).then((results) => {
                            // Filter out any null results from failed detail fetches
                            setSearchResults(results.filter(Boolean) as GeoPoint[]);
                            setIsLoading(false);
                        });
                    } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        console.log("PlaceSearchInput: No results found for query.");
                        setSearchResults([]);
                        setIsLoading(false);
                    } else {
                        console.error("PlaceSearchInput: Error fetching Google Places predictions:", status);
                        toast({ title: "Search Error", description: `Failed to fetch place suggestions: ${status}.`, variant: "destructive" });
                        setSearchResults([]);
                        setIsLoading(false);
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
    }, [debouncedSearchTerm, currentMapCenter]); // Dependencies for useEffect

    const handleSelect = (selectedPoint: GeoPoint) => {
        setInputValue(selectedPoint.name);
        onSelect(selectedPoint);
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the popover from closing immediately
        setInputValue('');
        setSearchResults([]);
        onSelect(null); // Clear the selected point in the parent component
        setOpen(false); // Close the popover
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className={cn("relative flex items-center", className)}>
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-8 pr-8"
                        onFocus={() => setOpen(true)} // Open popover when input is focused
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
                    {/* CommandInput is hidden because the main Input handles the typing */}
                    <CommandInput
                        placeholder="Search locations..."
                        value={inputValue}
                        onValueChange={setInputValue}
                        className="sr-only" // Hide visually but keep accessible if needed
                    />
                    <CommandList>
                        {isLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                            </div>
                        ) : searchResults.length === 0 && debouncedSearchTerm ? (
                            <CommandEmpty>No results found for "{debouncedSearchTerm}".</CommandEmpty>
                        ) : searchResults.length === 0 && !debouncedSearchTerm ? (
                            <CommandEmpty>Start typing to search for a place.</CommandEmpty>
                        ) : (
                            <CommandGroup>
                                {searchResults.map((point) => (
                                    <CommandItem
                                        key={point.placeId}
                                        value={point.name} // Value for keyboard navigation/selection
                                        onSelect={() => handleSelect(point)}
                                        className="flex items-center justify-between"
                                    >
                                        <span>{point.name}</span>
                                        {/* Display a truncated address if it's long, or just the remainder */}
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