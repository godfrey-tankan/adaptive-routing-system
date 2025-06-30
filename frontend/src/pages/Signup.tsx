import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, isLoadingAuth } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    preferred_transport: 'DRIVING',
    avoid_tolls: false,
    avoid_highways: false,
    location_anonymization: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please re-enter.",
        variant: "destructive"
      });
      return;
    }

    const success = await signup({
      email: formData.email,
      password: formData.password,
      password2: formData.confirmPassword,
      phone_number: formData.phone_number,
      preferred_transport: formData.preferred_transport,
      avoid_tolls: formData.avoid_tolls,
      avoid_highways: formData.avoid_highways,
      location_anonymization: formData.location_anonymization
    });

    if (success) {
      navigate('/dashboard');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <Link to="/" className="inline-flex items-center space-x-2 text-primary hover:text-primary/80">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            <div className="flex items-center justify-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Map className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">Adaptive Routing</span>
            </div>

            <h1 className="text-3xl font-bold">Create Your Account</h1>
            <p className="text-muted-foreground">Sign up to start planning your journeys</p>
          </div>

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
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="+263..."
                    className="h-12"
                    required
                    disabled={isLoadingAuth}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_transport">Preferred Transport</Label>
                  <select
                    id="preferred_transport"
                    name="preferred_transport"
                    value={formData.preferred_transport}
                    onChange={handleInputChange}
                    className="h-12 w-full border rounded px-3"
                    required
                  >
                    <option value="DRIVING">Car</option>
                    <option value="BICYCLE">Bike</option>
                    <option value="WALKING">Walk</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
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
                    className="h-12"
                    required
                    disabled={isLoadingAuth}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="avoid_tolls"
                    checked={formData.avoid_tolls}
                    onChange={handleInputChange}
                    disabled={isLoadingAuth}
                  />
                  <Label htmlFor="avoid_tolls">Avoid Tolls</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="avoid_highways"
                    checked={formData.avoid_highways}
                    onChange={handleInputChange}
                    disabled={isLoadingAuth}
                  />
                  <Label htmlFor="avoid_highways">Avoid Highways</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="location_anonymization"
                    checked={formData.location_anonymization}
                    onChange={handleInputChange}
                    disabled={isLoadingAuth}
                  />
                  <Label htmlFor="location_anonymization">Anonymize Location</Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-white text-lg"
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
                    className="text-primary font-semibold hover:text-primary/80"
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
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="absolute inset-0 bg-black/20"></div>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(45deg, rgba(0,128,128,0.3), rgba(255,165,0,0.3)), url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'%23008080\' stroke-width=\'0.5\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")'
          }}
        ></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center space-y-6">
            <h2 className="text-4xl font-bold">Seamless Journeys</h2>
            <p className="text-lg opacity-90">
              Join Smart Adaptive Routing and unlock real-time insights and smarter travel across Zimbabwe.
            </p>
            <div className="text-6xl">🛣️</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
