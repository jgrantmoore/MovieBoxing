import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { LogOut, ChevronRight, Shield, User, Bell } from 'lucide-react-native';

export default function AccountSettings() {
    const { logout, session } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        Alert.alert(
            "Log Out?",
            "Are you sure you want to log out?",
            [
                { text: "Stay", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon, label, sublabel }: any) => (
        <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-neutral-900">
            <View className="flex-row items-center gap-x-4">
                <View className="bg-neutral-900 p-2 rounded-xl">{icon}</View>
                <View>
                    <Text className="text-white font-black uppercase italic text-sm">{label}</Text>
                    {sublabel && <Text className="text-neutral-500 text-[10px] font-mono">{sublabel}</Text>}
                </View>
            </View>
            <ChevronRight size={18} color="#404040" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-slate-950">
            <Stack.Screen options={{
                title: "ACCOUNT SETTINGS",
                headerStyle: { backgroundColor: '#020617' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '900' }
            }} />

            <ScrollView className="p-6">
                {/* <Text className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-4">Account</Text>
                <View className="bg-neutral-900/30 border border-neutral-800 rounded-[2rem] px-6 mb-8">
                    <SettingItem
                        icon={<User size={18} color="#dc2626" />}
                        label="Edit Profile"
                        sublabel={session?.user?.email}
                    />
                    <SettingItem
                        icon={<Shield size={18} color="#dc2626" />}
                        label="Privacy & Security"
                    />
                    <SettingItem
                        icon={<Bell size={18} color="#dc2626" />}
                        label="Notifications"
                    />
                </View> */}

                <Text className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-4">Account</Text>
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center justify-center bg-red-600/10 border border-red-600/20 py-5 rounded-2xl"
                >
                    <LogOut size={20} color="#dc2626" strokeWidth={3} />
                    <Text className="ml-3 text-red-600 font-black uppercase italic tracking-widest">
                        Log Out of Your Account
                    </Text>
                </TouchableOpacity>

                <View className="mt-8 items-center">
                    <Text className="text-neutral-700 font-mono text-[8px] uppercase tracking-widest">
                        Movie Boxing v1.0.4
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}