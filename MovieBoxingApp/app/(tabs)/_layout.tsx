import React from 'react';
import { Tabs } from 'expo-router';
import { Trophy, Home, User } from 'lucide-react-native';
import { HeaderLogo } from '../../src/components/HeaderLogo';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 1. Set the active icon/label color (Red 600)
        tabBarActiveTintColor: '#dc2626',
        // 2. Set the inactive icon/label color
        tabBarInactiveTintColor: '#525252',
        // 3. Style the actual bar
        tabBarStyle: {
          backgroundColor: '#020617', // slate-950
          borderTopColor: '#1e293b', // slate-800 for a subtle border
          paddingTop: 5,
        },
        headerStyle: {
          backgroundColor: '#020617', // Match the header too
          borderBottomColor: '#1e293b', // Add a subtle border at the bottom of the header
          borderBottomWidth: 1,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontFamily: 'System', // Use your black/italic font here if loaded
          fontWeight: '900',
        },
        // This centers the custom component on Android/iOS
        headerTitleAlign: 'center',
        // Pass your component here
        headerTitle: () => <HeaderLogo />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="leagues"
        options={{
          title: 'Leagues',
          tabBarIcon: ({ color }) => <Trophy color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="leagues/[id]"
        options={{
          href: null, // <--- Makes it not show in tab bar
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile/[id]"
        options={{
          href: null, // <--- Makes it not show in tab bar
        }}
      />
      <Tabs.Screen
        name="profile/settings"
        options={{
          href: null, // <--- Makes it not show in tab bar
        }}
      />  
    </Tabs>
  );
}