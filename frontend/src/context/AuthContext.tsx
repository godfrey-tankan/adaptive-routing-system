// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { toast } from '@/hooks/use-toast'; // Ensure this path is correct

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Define the User interface
interface User {
    name: string;
    email: string;
    avatarFallback: string; // e.g., "JD" for John Doe
    token: string; // The access token
}

// Define the AuthContextType
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoadingAuth: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

// Create the context with a default (null) value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize state based on localStorage for quicker initial load if tokens exist
    const initialUser = (() => {
        try {
            const storedUser = localStorage.getItem('currentUser');
            const storedToken = localStorage.getItem('authToken');
            if (storedUser && storedToken) {
                const parsedUser: User = JSON.parse(storedUser);
                // Basic validation: ensure the stored token matches the user's token
                if (parsedUser.token === storedToken) {
                    console.log("AuthContext: Found user and token in localStorage on init.");
                    return parsedUser;
                }
            }
        } catch (e) {
            console.error("Failed to parse user from localStorage:", e);
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
        }
        return null;
    })();

    const [user, setUser] = useState<User | null>(initialUser);
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser); // Set based on initialUser
    const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start true, then set false after check

    // This useEffect runs once on mount to verify tokens or set loading to false
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates on unmounted components

        const checkAuthStatus = async () => {
            console.log("AuthContext: checkAuthStatus initiated.");
            const authToken = localStorage.getItem('authToken');
            const refreshToken = localStorage.getItem('refreshToken');

            if (!authToken || !refreshToken) {
                // No tokens, so not authenticated.
                if (isMounted) {
                    setUser(null);
                    setIsAuthenticated(false);
                    setIsLoadingAuth(false);
                    console.log("AuthContext: No tokens found, not authenticated.");
                }
                return;
            }

            // If we have tokens, let's try to verify or refresh them
            try {

                console.log("AuthContext: Access token might be invalid or expired, trying refresh...");
                const refreshResponse = await axios.post(`${API_BASE_URL}/users/token/refresh/`, { refresh: refreshToken });
                const newAccessToken = refreshResponse.data.access;
                const newRefreshToken = refreshResponse.data.refresh; // Backend might return new refresh token too

                localStorage.setItem('authToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const updatedUser = { ...storedUser, token: newAccessToken };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser)); // Update user with new token

                if (isMounted) {
                    setUser(updatedUser);
                    setIsAuthenticated(true);
                    toast({
                        title: "Session Refreshed",
                        description: "Your session has been automatically renewed.",
                    });
                    console.log("AuthContext: Tokens refreshed, authenticated.");
                }
                // }

            } catch (error: any) {
                console.error("AuthContext: Failed to verify/refresh tokens:", error);
                // If refresh fails, clear tokens and set as unauthenticated
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('currentUser');
                if (isMounted) {
                    setUser(null);
                    setIsAuthenticated(false);
                    toast({
                        title: "Session Expired",
                        description: "Your session has expired. Please log in again.",
                        variant: "destructive"
                    });
                    console.log("AuthContext: Token refresh failed, cleared tokens, not authenticated.");
                }
            } finally {
                if (isMounted) {
                    setIsLoadingAuth(false); // Always set loading to false in the end
                    console.log("AuthContext: checkAuthStatus finished. isAuthenticated:", isAuthenticated);
                }
            }
        };

        checkAuthStatus();

        // Cleanup function for useEffect
        return () => {
            isMounted = false; // Prevent setting state if component unmounts during async operation
            console.log("AuthContext: useEffect cleanup.");
        };
    }, []); // Empty dependency array means this effect runs once on mount and once on unmount (due to Strict Mode in dev)

    // Memoize login, signup, logout to prevent unnecessary re-renders in consumers
    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoadingAuth(true); // Start loading in context
        console.log(`AuthContext: Attempting login for ${email}...`);

        try {
            const response = await axios.post(`${API_BASE_URL}/users/login/`, {
                email,
                password,
            });

            const data = response.data; // Assuming data contains access and refresh tokens and potentially user info
            const fetchedUser: User = {
                name: data.user?.name || email.split('@')[0], // Use name from backend or derive from email
                email: email,
                avatarFallback: data.user?.avatarFallback || email.substring(0, 2).toUpperCase(), // Use backend fallback or derive
                token: data.access, // Access token
            };

            setUser(fetchedUser);
            setIsAuthenticated(true);
            localStorage.setItem('currentUser', JSON.stringify(fetchedUser));
            localStorage.setItem('authToken', fetchedUser.token);
            localStorage.setItem('refreshToken', data.refresh);

            toast({
                title: "Login Successful",
                description: `Welcome back to ZimSmart Routes!`,
            });
            console.log("AuthContext: Login successful for:", email);
            return true;
        } catch (error: any) {
            console.error("AuthContext: Login failed:", error.response?.data || error.message);
            const errorMessage =
                (error.response?.data as { detail?: string; non_field_errors?: string[] })?.detail ||
                (error.response?.data as { non_field_errors?: string[] })?.non_field_errors?.[0] ||
                error.message ||
                "Login failed. Please check your credentials.";
            toast({
                title: "Login Failed",
                description: errorMessage,
                variant: "destructive"
            });
            return false;
        } finally {
            setIsLoadingAuth(false); // End loading in context
        }
    }, [toast]); // Dependencies for useCallback

    const signup = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
        setIsLoadingAuth(true);
        console.log(`AuthContext: Attempting signup for ${email}...`);
        try {
            const response = await axios.post(`${API_BASE_URL}/users/register/`, {
                name,
                email,
                password,
            });

            const data = response.data;

            // Assuming your backend returns tokens and potentially user info upon successful registration
            const newUser: User = {
                name: data.user?.name || name,
                email: email,
                avatarFallback: data.user?.avatarFallback || name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
                token: data.access,
            };

            setUser(newUser);
            setIsAuthenticated(true);
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            localStorage.setItem('authToken', newUser.token);
            localStorage.setItem('refreshToken', data.refresh);

            toast({
                title: "Signup Successful",
                description: `Your account for ${newUser.email} has been created.`,
            });
            console.log("AuthContext: Signup successful for:", email);
            return true;
        } catch (error: any) {
            console.error("AuthContext: Signup failed:", error.response?.data || error.message);
            const errorMessage =
                (error.response?.data as { detail?: string; email?: string[]; password?: string[]; non_field_errors?: string[] })?.detail ||
                (error.response?.data as { email?: string[] })?.email?.[0] || // Django REST Framework email error
                (error.response?.data as { password?: string[] })?.password?.[0] || // Django REST Framework password error
                (error.response?.data as { non_field_errors?: string[] })?.non_field_errors?.[0] ||
                error.message ||
                "Failed to create account. Please try again.";
            toast({
                title: "Signup Failed",
                description: errorMessage,
                variant: "destructive"
            });
            return false;
        } finally {
            setIsLoadingAuth(false);
        }
    }, [toast]);

    const logout = useCallback(() => {
        console.log("AuthContext: User logging out.");
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
        });
        // navigate('/'); // You might want to navigate to home here, but usually done in App or a higher component if context is global
    }, [toast]);

    const contextValue = React.useMemo(() => ({
        user,
        isAuthenticated,
        isLoadingAuth,
        login,
        signup,
        logout,
    }), [user, isAuthenticated, isLoadingAuth, login, signup, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};