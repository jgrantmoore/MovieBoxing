import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '../utils/googleAuth';

interface User {
    userId: string;
    username: string;
    displayName: string;
    email: string;
}

interface AuthContextType {
    session: { accessToken: string; user: User } | null;
    loading: boolean;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    loginWithGoogle: () => Promise<void>; // Added this
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<{ accessToken: string; user: User } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '1036192699896-i3buhij8mq2j8g06a9046t0pbvv3voe1.apps.googleusercontent.com',
            iosClientId: '1036192699896-3orvss0jdjti8occh5ktjnffev0fkm68.apps.googleusercontent.com',
        });

        async function loadStorage() {
            try {
                const accessToken = await SecureStore.getItemAsync('accessToken');
                const refreshToken = await SecureStore.getItemAsync('refreshToken');
                const userData = await SecureStore.getItemAsync('userData');

                if (!refreshToken || !userData) {
                    setLoading(false);
                    return;
                }

                const parsedUser = JSON.parse(userData);

                try {
                    const response = await fetch('https://api.movieboxing.com/api/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        await SecureStore.setItemAsync('accessToken', data.accessToken);
                        setSession({ accessToken: data.accessToken, user: parsedUser });
                    } else {
                        await logout();
                    }
                } catch (refreshErr) {
                    console.error("Silent refresh failed network call:", refreshErr);
                    if (accessToken) {
                        setSession({ accessToken, user: parsedUser });
                    }
                }
            } catch (e) {
                console.error("Failed to load auth state", e);
            } finally {
                setLoading(false);
            }
        }
        loadStorage();
    }, []);

    const login = async (accessToken: string, refreshToken: string, user: any) => {
        try {
            const userString = JSON.stringify(user);
            await SecureStore.setItemAsync('accessToken', accessToken);
            await SecureStore.setItemAsync('refreshToken', refreshToken);
            await SecureStore.setItemAsync('userData', userString);
            setSession({ accessToken, user });
        } catch (err) {
            console.error("SecureStore Save Error:", err);
        }
    };

    /**
     * Handles the Google Sign-In flow and exchanges the Google ID Token
     * for a MovieBoxing session.
     */
    const loginWithGoogle = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const { data } = await GoogleSignin.signIn();
            const idToken = data?.idToken;

            if (!idToken) throw new Error("No ID Token received from Google");

            // Exchange the Google Token for our own JWTs
            const response = await fetch('https://api.movieboxing.com/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: idToken })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || "Failed to authenticate with backend");
            }

            const responseData = await response.json();

            // data should contain { accessToken, refreshToken, user }
            await login(responseData.accessToken, responseData.refreshToken, responseData.user);

        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled Google Sign-in");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Sign in already in progress");
            } else {
                console.error("Google Auth Error:", error);
                throw error; // Re-throw to handle in the UI (e.g., show an Alert)
            }
        }
    };

    const logout = async () => {
        try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');

            // Logout from Google nativeside as well so they can switch accounts
            const currentUser = GoogleSignin.getCurrentUser();
            if (currentUser) {
                await GoogleSignin.signOut();
            }

            if (refreshToken) {
                await fetch('https://api.movieboxing.com/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });
            }
        } catch (e) {
            console.error("Server-side logout failed", e);
        } finally {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('userData');
            setSession(null);
        }
    };

    return (
        <AuthContext.Provider value={{ session, login, loginWithGoogle, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};