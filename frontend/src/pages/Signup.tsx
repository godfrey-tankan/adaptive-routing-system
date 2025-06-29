// src/pages/Signup.tsx (Example - adapt this if your file is different)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, ArrowLeft, Loader2 } from 'lucide-react'; // Added Loader2
import { toast } from '@/hooks/use-toast';

import { useAuth } from '@/context/AuthContext'; // Import useAuth hook

const SignupPage = () => { // Renamed from Signup to SignupPage for consistency
  const navigate = useNavigate();
  const { signup, isLoadingAuth } = useAuth(); // Get the signup function and loading state

  const [formData, setFormData] = useState({
    name: '', // Added name for signup
    email: '',
    password: '',
    confirmPassword: '' // For frontend validation
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("SignupPage: Handling submit for signup."); // Debug

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please re-enter.",
        variant: "destructive"
      });
      return;
    }

    const success = await signup(formData.name, formData.email, formData.password);
    if (success) {
      console.log("SignupPage: Signup successful via AuthContext, navigating to dashboard."); // Debug
      navigate('/dashboard');
    } else {
      console.log("SignupPage: Signup failed via AuthContext."); // Debug
      // AuthContext's toast handles the error message
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <Link to="/" className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            <div className="flex items-center justify-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Map className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-montserrat font-bold text-foreground">
                Adaptive Routing
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-montserrat font-bold text-foreground">
                Create Your Account
              </h1>
              <p className="text-muted-foreground mt-2">
                Sign up to start planning your journeys
              </p>
            </div>
          </div>

          {/* Signup Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-xl">Sign Up</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="h-12"
                    required
                    disabled={isLoadingAuth}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                    className="h-12"
                    required
                    disabled={isLoadingAuth}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    className="h-12"
                    required
                    disabled={isLoadingAuth}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="h-12"
                    required
                    disabled={isLoadingAuth}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-lg"
                  disabled={isLoadingAuth}
                >
                  {isLoadingAuth ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Image (Same as Login.tsx) */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="absolute inset-0 bg-black/20"></div>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'linear-gradient(45deg, rgba(0,128,128,0.3) 0%, rgba(255,165,0,0.3) 100%), url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 20 0 L 0 0 0 20" fill="none" stroke="%23008080" stroke-width="0.5" opacity="0.3"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grid)"/%3E%3C/svg%3E")'
          }}
        ></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center space-y-6">
            <h2 className="text-4xl font-montserrat font-bold">
              Seamless Journeys
            </h2>
            <p className="text-lg opacity-90">
              Join ZimSmart and unlock smart route planning, real-time insights, and a smoother travel experience across Zimbabwe.
            </p>
            <div className="text-6xl">🛣️</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage; // Ensure default export