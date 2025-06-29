// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/Index'; // Correct import based on your confirmation (default export)
import { Toaster } from './components/ui/toaster';
import { Loader2 } from 'lucide-react';
import LoginPage from './pages/Login'; // Import the LoginPage
import SignupPage from './pages/Signup'; // Import the SignupPage
import SimulationPage from './pages/SimulationPage';

// Import QueryClient and QueryClientProvider from @tanstack/react-query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client instance of QueryClient outside of the component to prevent re-creation on re-renders
const queryClient = new QueryClient();

// A component to protect routes, ensuring only authenticated users can access them
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    console.log("ProtectedRoute: isLoadingAuth:", isLoadingAuth, "isAuthenticated:", isAuthenticated); // Debug
  }, [isLoadingAuth, isAuthenticated]);

  // If still checking authentication status, show a loader
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg text-gray-600"></p>
      </div>
    );
  }

  // If not authenticated and not loading, redirect to the landing page
  if (!isAuthenticated) {
    console.log("ProtectedRoute: Not authenticated, redirecting to /."); // Debug
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the children (the protected content)
  console.log("ProtectedRoute: Authenticated, rendering children."); // Debug
  return <>{children}</>;
};

const App: React.FC = () => {
  console.log("App: Root component rendering."); // Debug
  return (
    // QueryClientProvider must wrap any component that uses @tanstack/react-query hooks.
    // It's usually placed at the highest level of your application.
    <QueryClientProvider client={queryClient}>
      <AuthProvider> {/* AuthProvider still wraps Router to provide context */}
        <Router>
          <Routes> {/* All Route components MUST be children of Routes */}
            {/* Public routes (accessible to anyone) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected routes (require authentication) */}
            <Route
              path="/dashboard/*" // Use /* to catch nested dashboard routes
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Example of other protected routes */}
            <Route
              path="/dashboard/saved"
              element={
                <ProtectedRoute>
                  <div>Saved Routes Page</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/simulation"
              element={
                <ProtectedRoute>
                  <SimulationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <div>Settings Page</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        <Toaster /> {/* Shadcn Toaster for notifications */}
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;