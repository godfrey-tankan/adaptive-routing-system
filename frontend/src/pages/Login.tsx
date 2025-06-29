// src/pages/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Map, ArrowLeft, Loader2 } from 'lucide-react'; // Added Loader2 for loading button
import { toast } from '@/hooks/use-toast';

import { useAuth } from '@/context/AuthContext'; // Import useAuth hook

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoadingAuth } = useAuth(); // Get the login function and loading state from AuthContext

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("LoginPage: Handling submit for login."); // Debug
    // Call the login function from AuthContext
    const success = await login(formData.email, formData.password);
    if (success) {
      console.log("LoginPage: Login successful via AuthContext, navigating to dashboard."); // Debug
      navigate('/dashboard');
    } else {
      console.log("LoginPage: Login failed via AuthContext."); // Debug
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
                Welcome Back
              </h1>
              <p className="text-muted-foreground mt-2">
                Sign in to your account to continue your journey
              </p>
            </div>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-xl">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    disabled={isLoadingAuth} // Disable while AuthContext is loading
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
                    placeholder="Enter your password"
                    className="h-12"
                    required
                    disabled={isLoadingAuth} // Disable while AuthContext is loading
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, rememberMe: !!checked }))
                      }
                      disabled={isLoadingAuth} // Disable while AuthContext is loading
                    />
                    <Label htmlFor="remember" className="text-sm">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-lg"
                  disabled={isLoadingAuth} // Control button loading with AuthContext's isLoadingAuth
                >
                  {isLoadingAuth ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Image */}
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
              Navigate Zimbabwe with Confidence
            </h2>
            <p className="text-lg opacity-90">
              Real-time traffic updates, smart route optimization, and local transport integration - all designed for Zimbabwe's unique road network.
            </p>
            <div className="text-6xl">🏙️</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;