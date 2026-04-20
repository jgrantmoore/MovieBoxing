import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

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
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // We'll store the whole session object to match your web logic
    const [session, setSession] = useState<{ accessToken: string; user: User } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStorage() {
            try {
                // 1. Pull everything from SecureStore
                const accessToken = await SecureStore.getItemAsync('accessToken');
                const refreshToken = await SecureStore.getItemAsync('refreshToken');
                const userData = await SecureStore.getItemAsync('userData');

                if (!refreshToken || !userData) {
                    // No session at all, send them to login
                    setLoading(false);
                    return;
                }

                const parsedUser = JSON.parse(userData);

                // 2. Try to refresh the session immediately on boot
                // This ensures the accessToken is fresh for the first API calls
                try {
                    const response = await fetch('https://api.movieboxing.com/api/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken })
                    });

                    if (response.ok) {
                        const data = await response.json(); // Backend sends { accessToken }

                        // Update SecureStore with the fresh access token
                        await SecureStore.setItemAsync('accessToken', data.accessToken);

                        setSession({
                            accessToken: data.accessToken,
                            user: parsedUser
                        });
                    } else {
                        // Refresh token was revoked or expired in the DB
                        await logout();
                    }
                } catch (refreshErr) {
                    console.error("Silent refresh failed network call:", refreshErr);
                    // If the network is just down, use the old token as a fallback
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

            // Store everything
            await SecureStore.setItemAsync('accessToken', accessToken);
            await SecureStore.setItemAsync('refreshToken', refreshToken);
            await SecureStore.setItemAsync('userData', userString);

            setSession({ accessToken, user });
        } catch (err) {
            console.error("SecureStore Save Error:", err);
        }
    };

    const logout = async () => {
        try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');

            // 1. Tell the backend to kill the session
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
            // 2. Always clear local storage regardless of API success
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('userData');
            setSession(null);
        }
    };

    return (
        <AuthContext.Provider value={{ session, login, logout, loading }}>
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
