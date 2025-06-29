// src/components/AIChatCard.tsx
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from '@/hooks/use-toast';
import { GeoPoint } from './map/PlaceSearchInput'; // Adjust path if needed

interface WeatherData {
    description: string;
    temperature: number; // in Celsius
    humidity: number; // in %
    windSpeed: number; // in m/s
    icon: string;
}

interface AIChatCardProps {
    routeDetails: any | null; // Pass route results to the AI for context
    startPoint: GeoPoint | null;
    endPoint: GeoPoint | null;
    weather: WeatherData | null;
}

const AIChatCard: React.FC<AIChatCardProps> = memo(({ routeDetails, startPoint, endPoint, weather }) => {
    const [aiInsights, setAiInsights] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateAIInsights = useCallback(async () => {
        if (!routeDetails || !startPoint || !endPoint) {
            setAiInsights("Please calculate a route first to get AI insights.");
            return;
        }
        setIsGenerating(true);
        setAiInsights("Generating insights..."); // Show immediate feedback

        try {
            // This URL should point to your Django backend endpoint
            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/gemini-insights/`, {
                start_location: startPoint.name,
                end_location: endPoint.name,
                distance: routeDetails.distance,
                duration: routeDetails.duration, // This duration now includes traffic
                traffic_info: `Expected travel time with traffic is ${routeDetails.duration}.`, // More descriptive
                weather_info: weather ? `${weather.description}, ${weather.temperature}°C, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} m/s.` : 'Weather data not available.',
                // Pass options to backend for more contextual insights
                avoid_highways: routeDetails.avoidHighways,
                avoid_tolls: routeDetails.avoidTolls,
                transport_mode: routeDetails.transportMode,
                current_time: new Date().toLocaleString(),
            });

            if (response.data && response.data.insights) {
                setAiInsights(response.data.insights);
            } else {
                setAiInsights("Failed to generate AI insights: No insights returned from backend.");
            }
        } catch (error) {
            console.error("Error fetching AI insights:", error);
            const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
                ? `Backend Error: ${error.response.data.detail}`
                : "Error connecting to backend or generating insights.";
            setAiInsights(`Error generating insights: ${errorMessage}`);
            toast({
                title: "AI Insights Failed",
                description: `Could not get insights from AI: ${errorMessage}`,
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    }, [routeDetails, startPoint, endPoint, weather]); // Dependencies for useCallback

    useEffect(() => {
        if (routeDetails) {
            generateAIInsights();
        } else {
            setAiInsights(null); // Clear insights if no route
        }
    }, [routeDetails, generateAIInsights]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <div className="w-5 h-5 mr-2 bg-gradient-to-r from-primary to-secondary rounded"></div>
                    AI Route Insights
                    {isGenerating && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {aiInsights ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{aiInsights}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {isGenerating ? "Generating insights..." : "AI Insights will appear here!"}
                    </p>
                )}
            </CardContent>
        </Card>
    );
});

AIChatCard.displayName = "AIChatCard";
export default AIChatCard;