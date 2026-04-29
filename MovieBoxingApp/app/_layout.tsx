import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import "../global.css";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasOpened = await SecureStore.getItemAsync('HAS_OPENED_BEFORE');

        if (hasOpened === null) {
          // It's the first time!
          setIsFirstLaunch(true);
          // Mark as opened for next time
          await SecureStore.setItemAsync('HAS_OPENED_BEFORE', 'true');
        } else {
          setIsFirstLaunch(false);
        }
      } catch (e) {
        setIsFirstLaunch(false);
      }
    };

    checkFirstLaunch();
  }, []);

  useEffect(() => {
    // Wait for both Auth and First Launch check to finish
    if (loading || isFirstLaunch === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isFirstLaunch) {
      router.replace('/register');
      return;
    } else if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, isFirstLaunch, segments]);


  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right'
      }}
    >
      {/* Define your privacy screen specifically if you want to customize it */}
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="contact" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}