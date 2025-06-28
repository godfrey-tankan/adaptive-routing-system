
import { ArrowRight, Star, Shield, Map, Car } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import HeroMap from "@/components/HeroMap";

const Index = () => {
  const features = [
    {
      icon: Map,
      title: "Real-time Traffic",
      description: "Live traffic updates and route optimization for Zimbabwe's roads"
    },
    {
      icon: Car,
      title: "Multi-modal Transport",
      description: "Car, kombi, walking, and cycling routes all in one platform"
    },
    {
      icon: Shield,
      title: "AI-Powered Insights",
      description: "Smart route suggestions based on traffic patterns and safety data"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-montserrat font-bold text-foreground">
              ZimSmart Routes
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/login" 
              className="text-foreground hover:text-primary transition-colors"
            >
              Login
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-montserrat font-bold text-foreground leading-tight">
                Smart Routing for{" "}
                <span className="text-primary">Zimbabwe's Roads</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Navigate Zimbabwe's cities with confidence. Get real-time traffic updates, 
                multi-modal transport options, and AI-powered route optimization designed 
                specifically for local conditions.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
                asChild
              >
                <Link to="/dashboard" className="flex items-center">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-primary text-primary hover:bg-primary/10 px-8 py-3 text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>

          <div className="relative animate-fade-in">
            <HeroMap />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-montserrat font-bold text-foreground mb-4">
            Why Choose ZimSmart Routes?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built specifically for Zimbabwe's unique transportation landscape
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm"
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-montserrat font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-montserrat font-bold text-foreground">
              Ready to Navigate Smarter?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of Zimbabweans already using ZimSmart Routes for their daily commute
            </p>
            <div className="flex items-center justify-center space-x-2 text-secondary mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-current" />
              ))}
              <span className="ml-2 text-foreground font-semibold">
                4.8/5 from 2,500+ users
              </span>
            </div>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white px-12 py-4 text-lg"
              asChild
            >
              <Link to="/signup">Start Your Journey</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                <Map className="w-4 h-4 text-white" />
              </div>
              <span className="font-montserrat font-bold text-foreground">
                ZimSmart Routes
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 ZimSmart Routes. Built for Zimbabwe's roads.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
