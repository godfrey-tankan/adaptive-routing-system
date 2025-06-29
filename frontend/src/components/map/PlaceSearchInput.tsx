// src/components/map/PlaceSearchInput.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Search, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from '@/hooks/use-toast';

export type GeoPoint = {
    name: string;
    coordinates: [number, number];
    address: string;
    placeId: string;
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
        google: any;
    }
}

const MIN_LETTERS_FOR_SEARCH = 4;
const DEBOUNCE_TIME = 800;
const MAX_PREDICTIONS = 5;

const PlaceSearchInputComponent: React.FC<PlaceSearchInputProps> = ({
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
    const [serviceStatus, setServiceStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
    const debouncedSearchTerm = useDebounce(inputValue, DEBOUNCE_TIME);

    const autocompleteServiceRef = useRef<any>(null);
    const placesServiceRef = useRef<any>(null);
    const lastRequestIdRef = useRef(0);
    const isMountedRef = useRef(true);

    // Debug log function
    const debugLog = (message: string, data?: any) => {
        console.log(`[PlaceSearchInput] ${message}`, data || '');
    };

    // Initialize Google Maps services
    useEffect(() => {
        isMountedRef.current = true;
        setServiceStatus('initializing');
        debugLog('Component mounted, initializing services');

        const initServices = () => {
            if (!isMountedRef.current) return;

            if (window.google?.maps?.places) {
                try {
                    debugLog('Google Maps API detected, initializing services');

                    // Try to use AutocompleteService (legacy)
                    if (window.google.maps.places.AutocompleteService) {
                        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
                        debugLog('AutocompleteService initialized');
                    }

                    placesServiceRef.current = new window.google.maps.places.PlacesService(
                        document.createElement('div')
                    );
                    debugLog('PlacesService initialized');

                    setServiceStatus('ready');
                } catch (error) {
                    debugLog('Error initializing services', error);
                    setServiceStatus('error');
                    toast({
                        title: "Map Service Error",
                        description: "Failed to initialize map services",
                        variant: "destructive"
                    });
                }
            } else {
                debugLog('Google Maps API not loaded yet, retrying...');
                setTimeout(initServices, 300);
            }
        };

        initServices();

        return () => {
            debugLog('Component unmounting');
            isMountedRef.current = false;
        };
    }, []);

    // Sync input value with external value
    useEffect(() => {
        if (value && value.name !== inputValue) {
            debugLog('External value changed, updating input', value);
            setInputValue(value.name);
        } else if (!value && inputValue !== '') {
            debugLog('External value cleared, resetting input');
            setInputValue('');
        }
    }, [value]);

    // Main search effect
    useEffect(() => {
        if (!isMountedRef.current || serviceStatus !== 'ready') {
            debugLog('Skipping search - component not ready', {
                mounted: isMountedRef.current,
                serviceStatus
            });
            return;
        }

        const currentInput = debouncedSearchTerm.trim();
        const currentInputLength = currentInput.length;

        debugLog('Debounced search term changed', {
            term: currentInput,
            length: currentInputLength
        });

        // Skip if search term is too short
        if (currentInputLength < MIN_LETTERS_FOR_SEARCH) {
            debugLog('Search term too short, clearing results');
            if (searchResults.length > 0) setSearchResults([]);
            return;
        }

        const requestId = ++lastRequestIdRef.current;
        setIsLoading(true);
        debugLog('Starting search request', { requestId });

        const requestConfig: any = {
            input: currentInput,
            componentRestrictions: { country: 'zw' },
            types: ['geocode', 'establishment'],
        };

        if (currentMapCenter) {
            requestConfig.locationBias = {
                center: new window.google.maps.LatLng(currentMapCenter[1], currentMapCenter[0]),
                radius: 50000,
            };
            debugLog('Added location bias to request', requestConfig.locationBias);
        }

        // Get predictions
        const getPredictions = () => {
            return new Promise<any[]>((resolve) => {
                debugLog('Getting place predictions');

                if (autocompleteServiceRef.current?.getPlacePredictions) {
                    autocompleteServiceRef.current.getPlacePredictions(
                        requestConfig,
                        (predictions: any[], status: string) => {
                            debugLog('Received place predictions', {
                                status,
                                count: predictions?.length || 0
                            });

                            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                                resolve(predictions || []);
                            } else {
                                debugLog('Prediction error', status);
                                toast({
                                    title: "Search Error",
                                    description: `Failed to get predictions: ${status}`,
                                    variant: "destructive"
                                });
                                resolve([]);
                            }
                        }
                    );
                } else {
                    debugLog('AutocompleteService not available');
                    resolve([]);
                }
            });
        };

        // Process predictions
        const processPredictions = async () => {
            try {
                const predictions = await getPredictions();

                // Skip if request is outdated
                if (requestId !== lastRequestIdRef.current || !isMountedRef.current) {
                    debugLog('Skipping outdated request', { requestId });
                    return;
                }

                // Limit predictions to reduce requests
                const limitedPredictions = predictions.slice(0, MAX_PREDICTIONS);
                debugLog('Processing predictions', {
                    total: predictions.length,
                    limited: limitedPredictions.length
                });

                if (limitedPredictions.length === 0) {
                    debugLog('No predictions to process');
                    setSearchResults([]);
                    setIsLoading(false);
                    return;
                }

                // Fetch details for each prediction
                const detailsPromises = limitedPredictions.map(prediction => {
                    return new Promise<GeoPoint | null>((resolve) => {
                        debugLog('Fetching place details', { placeId: prediction.place_id });

                        placesServiceRef.current?.getDetails(
                            {
                                placeId: prediction.place_id,
                                fields: ['geometry', 'name', 'formatted_address']
                            },
                            (place: any, status: string) => {
                                if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                                    debugLog('Successfully fetched place details', {
                                        name: place.name,
                                        placeId: prediction.place_id
                                    });

                                    resolve({
                                        name: place.name || prediction.description,
                                        coordinates: [
                                            place.geometry.location.lng(),
                                            place.geometry.location.lat()
                                        ],
                                        address: place.formatted_address || prediction.description,
                                        placeId: prediction.place_id,
                                    });
                                } else {
                                    debugLog('Failed to fetch place details', {
                                        status,
                                        placeId: prediction.place_id
                                    });
                                    resolve(null);
                                }
                            }
                        );
                    });
                });

                const results = await Promise.all(detailsPromises);
                const validResults = results.filter(Boolean) as GeoPoint[];

                debugLog('Processed place details', {
                    requested: limitedPredictions.length,
                    valid: validResults.length
                });

                // Skip if request is outdated
                if (requestId !== lastRequestIdRef.current || !isMountedRef.current) {
                    debugLog('Skipping outdated results', { requestId });
                    return;
                }

                setSearchResults(validResults);
                setIsLoading(false);

            } catch (error) {
                debugLog('Error in search process', error);

                if (requestId === lastRequestIdRef.current && isMountedRef.current) {
                    setIsLoading(false);
                    setSearchResults([]);
                    toast({
                        title: "Search Error",
                        description: "An error occurred during search",
                        variant: "destructive"
                    });
                }
            }
        };

        processPredictions();

    }, [debouncedSearchTerm, currentMapCenter, serviceStatus]);

    const handleSelect = useCallback((selectedPoint: GeoPoint) => {
        debugLog('Place selected', selectedPoint);
        setInputValue(selectedPoint.name);
        onSelect(selectedPoint);
        setOpen(false);
    }, [onSelect]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        debugLog('Clearing search');
        setInputValue('');
        setSearchResults([]);
        onSelect(null);
        setOpen(false);
        lastRequestIdRef.current++; // Cancel any pending requests
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
                        {serviceStatus !== 'ready' ? (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {serviceStatus === 'error'
                                    ? "Map service unavailable"
                                    : "Initializing map services..."}
                            </div>
                        ) : isLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                            </div>
                        ) : searchResults.length === 0 && inputValue.length >= MIN_LETTERS_FOR_SEARCH ? (
                            <CommandEmpty>No results found for "{inputValue}"</CommandEmpty>
                        ) : searchResults.length === 0 ? (
                            <CommandEmpty>Type at least {MIN_LETTERS_FOR_SEARCH} characters to search</CommandEmpty>
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

export const PlaceSearchInput = React.memo(PlaceSearchInputComponent);