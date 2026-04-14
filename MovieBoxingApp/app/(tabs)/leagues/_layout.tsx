import { useRouter, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function LeaguesStack() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#020617' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900' },
        gestureEnabled: true, // Crucial for the swipe-back on iOS
      }}
    >
      {/* Search Page */}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />

      {/* League Arena - Use the relative path from THIS folder */}
      <Stack.Screen 
        name="[id]/index" 
        options={{ headerShown: false }} 
      />

      {/* Settings */}
      <Stack.Screen 
        name="[id]/settings" 
        options={{
            headerShown: true,
            title: "ARENA SETTINGS",
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 items-center justify-center -ml-2"
              >
                <ChevronLeft color="white" size={28} />
              </TouchableOpacity>
            )
        }} 
      />

      <Stack.Screen 
        name="[id]/draft/start" 
        options={{ title: "DRAFT BRIEFING" }} 
      />
    </Stack>
  );
}