// src/pages/Signup.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Map, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios'; // Import axios
import { useMutation } from '@tanstack/react-query'; // Import useMutation
import { Checkbox } from '@radix-ui/react-checkbox';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Note: 'name' field is not directly used by Django's default User,
    // but your CustomUser might have first_name/last_name.
    // For now, we'll include it for the UI and map it to something if needed.
    // Assuming you have 'first_name' and 'last_name' in CustomUser, or just 'name' mapped to first_name
    name: '',
    email: '',
    password: '',
    confirmPassword: '', // This will be password2 for Django
    transportPreference: '', // This maps to preferred_transport
    phoneNumber: '', // Add this field
    avoidTolls: false, // Add this field
    avoidHighways: false, // Add this field
    locationAnonymization: false, // Add this field
  });

  const [isLoading, setIsLoading] = useState(false); // State for loading indicator

  // Mutation for signup
  const signupMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      setIsLoading(true); // Start loading
      const payload = {
        email: userData.email,
        password: userData.password,
        password2: userData.confirmPassword, // Map to password2 for Django
        phone_number: userData.phoneNumber, // Correct field name for Django
        preferred_transport: userData.transportPreference, // Correct field name for Django
        avoid_tolls: userData.avoidTolls,
        avoid_highways: userData.avoidHighways,
        location_anonymization: userData.locationAnonymization,
        // If your backend User model has first_name/last_name, you can split 'name' here:
        // first_name: userData.name.split(' ')[0] || '',
        // last_name: userData.name.split(' ').slice(1).join(' ') || '',
        // Otherwise, if your CustomUser model expects 'name', just pass it as 'name':
        // name: userData.name,
      };
      console.log("Signup payload:", payload); // Debugging line to check payload structure
      const response = await axios.post(`${API_BASE_URL}/users/register/`, payload);
      console.log("Signup response:", response.data); // Debugging line to check response
      setIsLoading(false); // Stop loading after request
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Account Created Successfully",
        description: "Welcome to ZimSmart Routes! You can now start planning your routes.",
      });
      navigate('/login'); // Redirect to login after successful signup
    },
    onError: (error: import('axios').AxiosError) => {
      setIsLoading(false); // Stop loading on error
      let errorMessage = "Registration failed.";
      if (error.response && error.response.data) {
        // Handle specific error messages from your Django backend
        const data = error.response.data as unknown;
        if (typeof data === 'object' && data !== null) {
          const d = data as {
            email?: string[];
            password?: string[];
            password2?: string[];
            phone_number?: string[];
            detail?: string;
            [key: string]: unknown;
          };
          if (d.email) {
            errorMessage = `Email: ${d.email.join(', ')}`;
          } else if (d.password) {
            errorMessage = `Password: ${d.password.join(', ')}`;
          } else if (d.password2) {
            errorMessage = `Confirm Password: ${d.password2.join(', ')}`;
          } else if (d.phone_number) {
            errorMessage = `Phone Number: ${d.phone_number.join(', ')}`;
          } else if (d.detail) {
            errorMessage = d.detail;
          } else {
            errorMessage = JSON.stringify(d); // Catch all
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false); // Stop loading after success or error
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }
    signupMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
                ZimSmart Routes
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-montserrat font-bold text-foreground">
                Join ZimSmart Routes
              </h1>
              <p className="text-muted-foreground mt-2">
                Create your account and start navigating Zimbabwe smarter
              </p>
            </div>
          </div>

          {/* Signup Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-xl">Create Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="h-12"
                    required
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel" // Use type="tel" for phone numbers
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., 0771234567"
                    className="h-12"
                    required
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
                    placeholder="Create a secure password"
                    className="h-12"
                    required
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transport">Primary Transport Mode</Label>
                  <Select
                    value={formData.transportPreference}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, transportPreference: value }))}
                    required // Make transport preference required
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your preferred transport" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Ensure these values match your Django model's choices for preferred_transport */}
                      <SelectItem value="DRIVING">🚗 Private Car</SelectItem>
                      <SelectItem value="KOMBI">🚐 Kombi</SelectItem>
                      <SelectItem value="WALKING">🚶 Walking</SelectItem>
                      <SelectItem value="BICYCLE">🚴 Bicycle</SelectItem>
                      <SelectItem value="MIXED">🔄 Mixed Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* New Checkboxes for routing preferences and privacy */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="avoidTolls"
                      name="avoidTolls"
                      checked={formData.avoidTolls}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, avoidTolls: !!checked }))}
                    />
                    <Label htmlFor="avoidTolls" className="text-sm">
                      Avoid Tolls
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="avoidHighways"
                      name="avoidHighways"
                      checked={formData.avoidHighways}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, avoidHighways: !!checked }))}
                    />
                    <Label htmlFor="avoidHighways" className="text-sm">
                      Avoid Highways
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="locationAnonymization"
                      name="locationAnonymization"
                      checked={formData.locationAnonymization}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, locationAnonymization: !!checked }))}
                    />
                    <Label htmlFor="locationAnonymization" className="text-sm">
                      Anonymize my location data (for privacy)
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-lg"
                  disabled={isLoading} // Disable button while loading
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
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

      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-secondary/10 to-primary/10">
        <div className="absolute inset-0 bg-black/20"></div>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'linear-gradient(45deg, rgba(255,165,0,0.3) 0%, rgba(0,128,128,0.3) 100%), url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 20 0 L 0 0 0 20" fill="none" stroke="%23FFA500" stroke-width="0.5" opacity="0.3"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grid)"/%3E%3C/svg%3E")'
          }}
        ></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center space-y-6">
            <h2 className="text-4xl font-montserrat font-bold">
              Start Your Smart Journey
            </h2>
            <p className="text-lg opacity-90">
              Join thousands of Zimbabweans who trust ZimSmart Routes for their daily navigation needs. Experience the future of local transport.
            </p>
            <div className="text-6xl">🚐</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;