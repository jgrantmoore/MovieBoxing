import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // We'll store the whole session object to match your web logic
    const [session, setSession] = useState<{ accessToken: string; user: any } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStorage() {
            try {
                const token = await SecureStore.getItemAsync('userToken');
                const userData = await SecureStore.getItemAsync('userData');

                if (token && userData) {
                    setSession({
                        accessToken: token,
                        user: JSON.parse(userData)
                    });
                }
            } catch (e) {
                console.error("Failed to load auth state", e);
            } finally {
                setLoading(false);
            }
        }
        loadStorage();
    }, []);

    // src/context/AuthContext.tsx

    const login = async (token: string, user: any) => {
        if (!token || !user) {
            // This is where your error was firing
            console.error("Login failed: Missing data", { token, user });
            return;
        }

        try {
            const userString = JSON.stringify(user);

            await SecureStore.setItemAsync('userToken', token);
            await SecureStore.setItemAsync('userData', userString);

            setSession({ accessToken: token, user });
        } catch (err) {
            console.error("SecureStore Save Error:", err);
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ session, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);