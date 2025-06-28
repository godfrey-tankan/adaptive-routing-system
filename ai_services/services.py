import google.generativeai as genai
import logging
import json # Import json to handle potential JSON parsing of AI response
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')
        self.system_instruction = (
            "You are a Zimbabwean traffic expert specializing in Harare routes. "
            "Provide concise, practical advice considering local conditions like "
            "kombi routes, road quality, and peak hours. Use kilometers and minutes "
            "for measurements. When suggesting alternatives, consider safety, "
            "especially in high-density suburbs. "
            "Always respond in valid JSON format."
        )
    
    def get_route_insights(self, route, user_prefs):
        """Generate AI insights for a given route"""
        try:
            prompt = self._build_prompt(route, user_prefs)
            response = self.model.generate_content(
                prompt,
                system_instruction=self.system_instruction
            )
            # Attempt to parse the response as JSON. If it fails, return raw text.
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                logger.warning(f"Gemini response not valid JSON: {response.text}")
                return {"raw_insight": response.text, "error": "AI response was not valid JSON."}
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return {"error": f"AI insights currently unavailable: {str(e)}"}
    
    def _build_prompt(self, route, user_prefs):
        """Build context-aware prompt for Zimbabwe"""
        return f"""
        Analyze this route for a user in Zimbabwe:
        - Origin: {route.get('origin', 'N/A')} # Ensure this is a string
        - Destination: {route.get('destination', 'N/A')} # Ensure this is a string
        - Distance: {route.get('distance', 0)/1000:.1f} km
        - Estimated time: {route.get('duration', 0)//60} minutes
        - Current time: {timezone.now().strftime('%H:%M')}
        - User preferences: {user_prefs}
        
        Provide:
        1. Safety assessment (1-5 rating, 5 being safest)
        2. 2 alternative route options if congestion is likely (>30% estimated delay or peak hours). Suggest routes with relevant context.
        3. Fuel/time saving tips specific to Zimbabwe roads/traffic patterns.
        4. Weather impact if relevant (e.g., rainy season affects unpaved roads).
        5. Kombi stop locations if applicable for public transport mode.
        
        Respond in JSON format with keys:
        safety_rating (integer), alternatives (list of strings), tips (list of strings), weather_impact (string), kombi_stops (list of strings)
        If a field is not applicable, provide an empty list or an empty string as appropriate.
        Example JSON:
        {{
            "safety_rating": 4,
            "alternatives": ["Try Mbare bypass if going to CBD during morning peak.", "Consider taking a kombi from Samora Machel Avenue to Avondale."],
            "tips": ["Avoid Harare Drive during rush hour.", "Check local radio for traffic updates."],
            "weather_impact": "Heavy rains can cause flash flooding on some low-lying bridges.",
            "kombi_stops": ["Fourth Street Rank", "Charge Office Rank"]
        }}
        """