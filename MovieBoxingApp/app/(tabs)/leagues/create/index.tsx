import React, { useContext, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    Alert, ActivityIndicator, Platform, Modal, Switch
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Calendar, ShieldCheck, Info, ChevronLeft } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { apiRequest } from '../../../../src/api/client'; // Adjust path to your API client
import { RefreshContext } from '@/src/context/RefreshContext';

export default function CreateLeague() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { triggerRefresh } = useContext(RefreshContext);

    // Form State
    const [formData, setFormData] = useState({
        LeagueName: '',
        LeagueType: 'public', // Default to public
        Password: '',
        StartingNumber: '5',
        BenchNumber: '3',
        PreferredReleaseDate: 'us',
        FreeAgentsAllowed: true,
    });

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), 11, 31)); // Default Dec 31

    // Picker State
    const [pickerConfig, setPickerConfig] = useState<{
        visible: boolean,
        mode: 'start' | 'end',
        tempDate: Date
    }>({ visible: false, mode: 'start', tempDate: new Date() });

    const openPicker = (mode: 'start' | 'end') => {
        setPickerConfig({
            visible: true,
            mode,
            tempDate: mode === 'start' ? startDate : endDate
        });
    };

    const handleCreate = async () => {
        if (!formData.LeagueName) return Alert.alert("Error", "League name is required");

        setLoading(true);
        try {
            const payload = {
                LeagueName: formData.LeagueName,
                LeagueType: formData.LeagueType,
                StartDate: startDate.toISOString().split('T')[0],
                EndDate: endDate.toISOString().split('T')[0],
                JoinPassword: formData.LeagueType === 'private' ? formData.Password : null,
                StartingNumber: parseInt(formData.StartingNumber),
                BenchNumber: parseInt(formData.BenchNumber),
                PreferredReleaseDate: formData.PreferredReleaseDate,
                FreeAgentsAllowed: formData.FreeAgentsAllowed
            };

            await apiRequest('/leagues/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            triggerRefresh(); //trigger league list refresh on home screen
            Alert.alert("Success", "Arena Created!");
            router.replace('/');
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to create league");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-slate-950">
            <Stack.Screen options={{
                title: "NEW ARENA",
                headerStyle: { backgroundColor: '#020617' },
                headerTintColor: '#fff',
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        // Fixed width/height + flex centering
                        className="w-10 h-10 items-center justify-center pr-1"
                    >
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView className="p-6"
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                <Text className="text-4xl font-black text-white italic uppercase tracking-tighter mb-8">
                    Create a New League
                </Text>

                {/* Section: Identity */}
                <View className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 mb-6">
                    <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">League Name</Text>
                    <TextInput
                        className="text-white font-black italic text-xl uppercase border-b border-neutral-800 pb-2"
                        placeholder="THE MAIN EVENT"
                        placeholderTextColor="#404040"
                        value={formData.LeagueName}
                        onChangeText={(txt) => setFormData({ ...formData, LeagueName: txt })}
                    />

                    <View className="flex-row justify-between items-center mt-6">
                        <View>
                            <Text className="text-white font-black italic uppercase">Privacy</Text>
                            <Text className="text-neutral-500 text-[10px] font-mono">
                                {formData.LeagueType === 'private' ? 'Private (Require Password)' : 'Public (Open to All)'}
                            </Text>
                        </View>
                        <View className="flex-row bg-neutral-800 p-1 rounded-xl">
                            <TouchableOpacity
                                onPress={() => setFormData({ ...formData, LeagueType: 'public' })}
                                className={`px-4 py-2 rounded-lg ${formData.LeagueType === 'public' ? 'bg-red-600' : ''}`}
                            >
                                <Text className="text-white font-bold text-xs">PUB</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setFormData({ ...formData, LeagueType: 'private' })}
                                className={`px-4 py-2 rounded-lg ${formData.LeagueType === 'private' ? 'bg-red-600' : ''}`}
                            >
                                <Text className="text-white font-bold text-xs">PVT</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {formData.LeagueType === 'private' && (
                        <View className="mt-4 pt-4 border-t border-neutral-800">
                            <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">Join Password</Text>
                            <View className="flex-row items-center">
                                <ShieldCheck size={16} color="#737373" />
                                <TextInput
                                    secureTextEntry
                                    className="flex-1 text-white font-mono ml-3 border-b border-neutral-800 pb-1"
                                    placeholder="Required for entry"
                                    placeholderTextColor="#404040"
                                    value={formData.Password}
                                    onChangeText={(txt) => setFormData({ ...formData, Password: txt })}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Section: Schedule */}
                <Text className="text-neutral-500 font-black uppercase text-[10px] tracking-widest mb-4">Season Schedule</Text>
                <View className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 mb-6 flex-row justify-between">
                    <TouchableOpacity onPress={() => openPicker('start')} className="flex-1 mr-2">
                        <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-1">Start Date</Text>
                        <View className="flex-row items-center">
                            <Calendar size={14} color="#dc2626" />
                            <Text className="text-white font-mono ml-2">{startDate.toLocaleDateString()}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => openPicker('end')} className="flex-1 ml-2">
                        <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-1">End Date</Text>
                        <View className="flex-row items-center">
                            <Calendar size={14} color="#dc2626" />
                            <Text className="text-white font-mono ml-2">{endDate.toLocaleDateString()}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Section: Roster Rules */}
                <Text className="text-neutral-500 font-black uppercase text-[10px] tracking-widest mb-4">Roster Rules</Text>
                <View className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 mb-6">
                    <View className="flex-row justify-between mb-6">
                        <View className="w-[45%]">
                            <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">Starting</Text>
                            <TextInput
                                keyboardType="numeric"
                                className="text-white font-black italic text-3xl"
                                value={formData.StartingNumber}
                                onChangeText={(txt) => setFormData({ ...formData, StartingNumber: txt })}
                            />
                        </View>
                        <View className="w-[45%]">
                            <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">Bench</Text>
                            <TextInput
                                keyboardType="numeric"
                                className="text-white font-black italic text-3xl"
                                value={formData.BenchNumber}
                                onChangeText={(txt) => setFormData({ ...formData, BenchNumber: txt })}
                            />
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center pt-4 border-t border-neutral-800">
                        <View>
                            <Text className="text-white font-black italic uppercase">Release Region</Text>
                            <Text className="text-neutral-500 text-[10px] font-mono">Which date determines scoring</Text>
                        </View>
                        <View className="flex-row bg-neutral-800 p-1 rounded-xl">
                            <TouchableOpacity
                                onPress={() => setFormData({ ...formData, PreferredReleaseDate: 'us' })}
                                className={`px-3 py-1 rounded-lg ${formData.PreferredReleaseDate === 'us' ? 'bg-neutral-600' : ''}`}
                            >
                                <Text className="text-white font-bold text-[10px]">US</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setFormData({ ...formData, PreferredReleaseDate: 'in' })}
                                className={`px-3 py-1 rounded-lg ${formData.PreferredReleaseDate === 'in' ? 'bg-neutral-600' : ''}`}
                            >
                                <Text className="text-white font-bold text-[10px]">INTL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center pt-4 mt-4 border-t border-neutral-800">
                        <View>
                            <Text className="text-white font-black italic uppercase">Free Agency</Text>
                            <Text className="text-neutral-500 text-[10px] font-mono">Allow mid-season pickups</Text>
                        </View>
                        <Switch
                            value={formData.FreeAgentsAllowed}
                            onValueChange={(val) => setFormData({ ...formData, FreeAgentsAllowed: val })}
                            trackColor={{ false: '#262626', true: '#dc2626' }}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={loading}
                    className="bg-red-600 py-5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-red-600/20 mb-12"
                >
                    {loading ? <ActivityIndicator color="white" /> : (
                        <Text className="text-white font-black uppercase italic text-lg tracking-widest">Ignite League</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Date Picker Modal */}
            <Modal visible={pickerConfig.visible} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/60">
                    <View className="bg-neutral-900 rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-white font-black italic uppercase">Select Date</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (pickerConfig.mode === 'start') setStartDate(pickerConfig.tempDate);
                                    else setEndDate(pickerConfig.tempDate);
                                    setPickerConfig({ ...pickerConfig, visible: false });
                                }}
                                className="bg-red-600 px-6 py-2 rounded-xl"
                            >
                                <Text className="text-white font-bold uppercase text-xs">Set</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={pickerConfig.tempDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            textColor="white"
                            onChange={(e, d) => {
                                if (d) setPickerConfig({ ...pickerConfig, tempDate: d });
                                if (Platform.OS === 'android') {
                                    setPickerConfig({ ...pickerConfig, visible: false });
                                    if (d) {
                                        if (pickerConfig.mode === 'start') setStartDate(d);
                                        else setEndDate(d);
                                    }
                                }
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}