Adaptive Routing System: Architecture and Functionality
This document provides a detailed explanation of the Adaptive Routing System, covering its architecture, key functionalities, technologies used, limitations, and areas for future improvement.

1. Overview
The Adaptive Routing System is a web application designed to provide optimized route planning with integrated AI-powered insights and real-time simulation capabilities. It comprises a Django backend (Python) handling data, logic, and external API integrations, and a React frontend (TypeScript/Vite) providing an interactive user interface.

2. Core Components & Technologies
2.1. Backend (Django)
The backend is built with Django, a high-level Python web framework.

Django REST Framework (DRF): Provides a powerful toolkit for building Web APIs, including serializers, views, authentication, and throttling.

DEFAULT_AUTHENTICATION_CLASSES: Uses JWTAuthentication from rest_framework_simplejwt.

DEFAULT_PERMISSION_CLASSES: Ensures most endpoints require authentication (IsAuthenticatedOrReadOnly).

DEFAULT_THROTTLE_RATES: Implements rate limiting (anon, user, route_optimize) to prevent API abuse and manage external service costs.

Database (PostgreSQL with PostGIS):

django.contrib.gis: Django's geospatial extension, enabling the use of PostGIS for storing and querying geographical data (e.g., PointField for origin and destination coordinates in the Route model).

This choice allows for efficient spatial queries and ensures data integrity for location-based services.

Authentication & User Management:

Custom User Model (users.CustomUser): Extends Django's default user model to include additional fields like phone_number and preferred_transport.

dj_rest_auth & django-allauth: These libraries provide robust API endpoints for user registration, login, logout, password reset, and account management. django-allauth handles the underlying account logic, while dj_rest_auth exposes it via REST APIs.

djangorestframework-simplejwt: Implements JSON Web Token (JWT) based authentication.

ACCESS_TOKEN_LIFETIME / REFRESH_TOKEN_LIFETIME: Configurable token validity periods.

ROTATE_REFRESH_TOKENS: Enhances security by issuing a new refresh token with each refresh request.

JWT_AUTH_HTTPONLY: Stores tokens in HttpOnly cookies, preventing client-side JavaScript access and reducing XSS attack vectors.

External API Integrations:

Google Maps API (Maps_API_KEY):

Used via GoogleMapsService (likely in routing/services.py) to interact with Google's Directions API for calculating routes (distance, duration, polyline) and Places API for resolving place IDs to precise geographic coordinates.

Gemini API (GEMINI_API_KEY):

Integrated via the ai_services app and the _get_ai_insights_for_route helper function.

Utilizes the gemini-2.0-flash model to generate context-aware, hyper-localized route insights. The prompt is designed to instruct Gemini to act as a "Zimbabwean transportation expert," providing advice on kombi ranks, typical fares, peak hours, parking, safety, and weather impacts (though real-time weather integration is a future improvement).

AI insights are generated during the route optimization process (RouteOptimizationView) and stored in the Route model.

OpenWeather API (OPENWEATHER_API_KEY):

Used by the WeatherView to fetch current weather conditions for a given location, primarily for the start point of a route.

CORS and Security:

corsheaders: Handles Cross-Origin Resource Sharing, allowing the frontend to make requests to the backend. CORS_ALLOWED_ORIGINS explicitly lists trusted frontend URLs.

CSRF_TRUSTED_ORIGINS: Defines origins for CSRF protection.

core.middleware.ZimbabweSecurityMiddleware: A custom middleware (as indicated by settings) likely implementing specific security checks or headers relevant to the application's context.

Production security settings (SECURE_HSTS_SECONDS, SECURE_SSL_REDIRECT, etc.) are enabled when DEBUG is False.

django-apscheduler: Configured for scheduled tasks, though specific jobs are not detailed in settings.py. This indicates a capability for background processing, e.g., for data cleanup, periodic updates, or notifications.

Logging: Basic logging setup to console and debug.log for debugging and operational insights.

2.2. Frontend (React with Vite)
The frontend is a modern React application providing an interactive user experience.

React & TypeScript: Provides a robust and scalable framework for building user interfaces with strong typing.

Vite: A fast development build tool for frontend projects.

Mapbox GL JS: Used for rendering interactive maps., providing map rendering, layers (for routes, markers), and camera control.

Axios: HTTP client for making API requests to the Django backend.

Shadcn/ui & Radix UI: Provides accessible and customizable UI components, ensuring a polished and responsive design.

Functionality:

Route Planning (RouteControlPanel): Users input start/end locations, select transport mode (driving, transit, walking, bicycling), and choose avoidance options (highways, tolls).

Route Display: The calculated route (polyline) and markers for start/end points are displayed on the MapLibre map.

Route Summary: Presents key route details like distance, duration, estimated fuel cost (for driving), and estimated kombi fare (for transit).

AI Route Insights (AIChatCard): Displays the context-aware advice generated by the Gemini API, providing localized tips. This is now fetched directly as part of the main route optimization request, avoiding redundant API calls.

Route Simulation (SimulationControlPanel): Allows users to "play through" a route, simulating movement of a vehicle icon along the polyline.

Route History (RouteHistoryPanel): Fetches and displays a list of previously saved routes with options to view them on the map and delete them.

Weather Display: Fetches and shows current weather conditions for the starting location.

3. How Route Optimization and Simulation Work
User Input: The user provides start and end locations (via a search input which likely uses Google Places Autocomplete to get place IDs), preferred transport mode, and any avoidance criteria on the RouteControlPanel.

Frontend Request: The frontend sends a POST request to the backend's /api/route/optimize/ endpoint.

Backend Processing (RouteOptimizationView):

Receives location details (names and coordinates).

Calls GoogleMapsService to use the Directions API to calculate the optimal route, including distance_value, duration_value, and polyline (an encoded string representing the route's path).

Invokes the _get_ai_insights_for_route helper function, passing the route details and location names.

The _get_ai_insights_for_route function calls the Gemini API with a carefully crafted prompt to generate localized advice.

The calculated route details and the generated AI insights are then saved to the PostgreSQL database via the Route model, associating them with the authenticated user.

The backend returns the primary route data (including the polyline, distance, duration), the AI insights, and any alternative routes to the frontend.

Frontend Display:

The RouteControlPanel receives the response.

It decodes the polyline into a series of [lng, lat] coordinates.

These coordinates are used to create a GeoJSON LineString feature.

MapLibre GL JS is instructed to add a new geojson source and a line layer to display the route on the map.

Start and end point markers are also added.

The Route Summary card displays the distance, duration, and calculated costs (fuel/bus fare).

The AIChatCard displays the AI insights already included in the backend response.

Simulation (SimulationControlPanel):

For simulation, a separate simulate_route endpoint is used on the backend, which also calculates the route and gets AI insights similar to route/optimize.

The SimulationControlPanel on the frontend then takes the decoded polyline.

An animation loop (animateVehicle) interpolates a position along this polyline over the route's duration, simulating vehicle movement. It calculates the bearing between segments to correctly rotate the simulation object.

This provides a visual representation of the journey.

4. Why These Tools and Technologies?
Django & DRF: Chosen for rapid API development, strong community support, built-in ORM, and comprehensive security features. Its "batteries included" philosophy accelerates backend development.

React & Vite: React for its component-based architecture, enabling modular and reusable UI elements. Vite for its lightning-fast development server and optimized build process.

PostGIS: Essential for geographical applications, allowing efficient storage and querying of spatial data, crucial for route-based features.

Google Maps Platform: The industry standard for mapping and routing, offering reliable and accurate directions, place data, and geocoding.

Google Gemini API: Chosen for its advanced conversational AI capabilities, enabling the generation of contextually relevant and localized insights, enhancing the user experience beyond simple route information. gemini-2.0-flash provides a good balance of performance and cost.

OpenWeatherMap API: Provides current weather data, an important factor for route planning (though its integration could be expanded).

JWT (Simple JWT): A modern, stateless, and secure method for API authentication, suitable for single-page applications.

Shadcn/ui & Radix UI: Provides pre-built, accessible, and themeable UI components, significantly speeding up frontend development and ensuring a professional look.

5. Limitations
Live Weather Simulation: Weather data is only fetched for the start point at the time of route calculation. A more advanced system would fetch and integrate weather updates along the route during simulation.

Public Transport Data: Kombi fare calculation is currently heuristic-based (distance from CBD). A more accurate system would integrate with a General Transit Feed Specification (GTFS) data feed for precise public transport routes and fares.

Complex Route Alternatives: The system primarily focuses on the "primary" route and only provides a count of alternatives. It doesn't present detailed information or visualizations for each alternative.

Scalability of AI Calls: Frequent and rapid AI calls can incur costs by increasing server resources. The current setup is designed for few number of  user queries, not high-volume batch processing.

Offline Functionality: The application heavily relies on online API access and does not support offline route calculation or map viewing.

Custom Map Data: Relies solely on Google Maps for route data; custom map overlays or specific local knowledge points are not directly integrated beyond what Google Maps provides.

6. Areas for Improvement
Advanced Traffic Prediction: To Integrate predictive traffic models or more granular real-time traffic updates to provide more accurate duration estimates and adapt routes dynamically during simulation.

Real-time Weather Along Route: To Fetch and display weather conditions at various points along the route and at different times during the simulation. This could inform AI insights further.

GTFS Integration for Public Transport: To Integrate actual GTFS data for Zimbabwean public transport (kombis) to provide accurate routes, schedules, stops, and fare information.

Turn-by-Turn Navigation:To Implement interactive turn-by-turn navigation features directly on the map for real-world use.

User-Contributed Data/Feedback: To Allow users to report road conditions, incidents, or suggest improvements to routes, feeding into a community-driven layer.

Route Sharing & Social Features: To Enable users to share saved routes with others.

Geofencing & Notifications: To Implement geofencing to trigger alerts or AI insights when entering specific areas during navigation or simulation.

Route Optimization Preferences: To Allow users to specify more granular preferences for route optimization (e.g., "most scenic," "least turns," "best views").

Caching for Map Tiles and Data: To Implement client-side caching for map tiles and frequently requested route data to improve performance and potentially support limited offline functionality.

Admin Dashboard for Content Moderation: To Create a Admin-based interface to review and moderate user-generated content or problematic AI insights.

Integration with IoT/Vehicle Data: For future extensions, integrate with vehicle telematics for personalized driving insights.

This system provides a solid foundation for adaptive routing in Zimbabwe, leveraging modern web technologies and AI to offer intelligent and localized transportation solutions.