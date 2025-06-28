
import { useState, useEffect } from "react";

const HeroMap = () => {
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseKey(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-96 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-orange-50 opacity-30"></div>
      
      {/* Zimbabwe Map Outline */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-64 h-48">
          {/* Simplified Zimbabwe shape */}
          <svg
            viewBox="0 0 200 120"
            className="w-full h-full fill-primary/20 stroke-primary stroke-2"
          >
            <path d="M20,30 L180,30 L180,90 L20,90 Z" />
          </svg>
          
          {/* Traffic Hotspots */}
          <div className="absolute top-8 left-12">
            <div 
              key={`harare-${pulseKey}`}
              className="w-4 h-4 bg-secondary rounded-full animate-ping"
            ></div>
            <div className="absolute top-0 left-0 w-4 h-4 bg-secondary rounded-full"></div>
            <span className="absolute -bottom-6 -left-2 text-xs font-semibold text-foreground">
              Harare
            </span>
          </div>
          
          <div className="absolute top-16 left-8">
            <div 
              key={`bulawayo-${pulseKey}`}
              className="w-3 h-3 bg-primary rounded-full animate-ping animation-delay-1000"
            ></div>
            <div className="absolute top-0 left-0 w-3 h-3 bg-primary rounded-full"></div>
            <span className="absolute -bottom-6 -left-4 text-xs font-semibold text-foreground">
              Bulawayo
            </span>
          </div>
          
          <div className="absolute top-12 right-16">
            <div 
              key={`mutare-${pulseKey}`}
              className="w-3 h-3 bg-secondary rounded-full animate-ping animation-delay-2000"
            ></div>
            <div className="absolute top-0 left-0 w-3 h-3 bg-secondary rounded-full"></div>
            <span className="absolute -bottom-6 -left-2 text-xs font-semibold text-foreground">
              Mutare
            </span>
          </div>
        </div>
      </div>
      
      {/* Floating Route Lines */}
      <div className="absolute inset-0">
        <svg className="w-full h-full">
          <path
            d="M50,80 Q100,60 150,80"
            stroke="#008080"
            strokeWidth="3"
            fill="none"
            strokeDasharray="5,5"
            className="animate-pulse"
          />
          <path
            d="M70,120 Q120,100 170,120"
            stroke="#FFA500"
            strokeWidth="2"
            fill="none"
            strokeDasharray="3,3"
            className="animate-pulse"
            style={{ animationDelay: '1s' }}
          />
        </svg>
      </div>
      
      {/* Kombi Icons */}
      <div className="absolute top-20 left-20 text-2xl animate-bounce">🚐</div>
      <div className="absolute bottom-20 right-20 text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>🚗</div>
      
      {/* Overlay Stats */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-xs text-muted-foreground">Live Traffic</div>
        <div className="font-montserrat font-bold text-primary">Moderate</div>
      </div>
      
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-xs text-muted-foreground">Active Routes</div>
        <div className="font-montserrat font-bold text-secondary">2,547</div>
      </div>
    </div>
  );
};

export default HeroMap;
