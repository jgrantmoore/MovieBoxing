import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    Alert, ActivityIndicator, Switch, Platform, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Save, Calendar, ShieldCheck, X } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { apiRequest } from '../../../../src/api/client';
import { RefreshContext } from '@/src/context/RefreshContext';

export default function LeagueSettings() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { triggerRefresh } = useContext(RefreshContext);

    // Form State
    const [leagueName, setLeagueName] = useState("");
    const [starters, setStarters] = useState("5");
    const [bench, setBench] = useState("3");
    const [joinPassword, setJoinPassword] = useState("");
    const [freeAgents, setFreeAgents] = useState(true);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    // Picker UI State
    const [pickerConfig, setPickerConfig] = useState<{
        visible: boolean,
        mode: 'start' | 'end',
        tempDate: Date
    }>({ visible: false, mode: 'start', tempDate: new Date() });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await apiRequest(`/leagues?id=${id}`);
                setLeagueName(data.LeagueName);
                setStarters(String(data.Rules?.Starting || 5));
                setBench(String(data.Rules?.Bench || 3));
                setFreeAgents(data.Rules?.FreeAgents ?? true);
                // Inside fetchSettings, change how you set the dates:
                if (data.StartDate) {
                    const s = new Date(data.StartDate);
                    // Add the timezone offset minutes to keep it at local "midnight"
                    setStartDate(new Date(s.getTime() + s.getTimezoneOffset() * 60000));
                }
                if (data.EndDate) {
                    const e = new Date(data.EndDate);
                    setEndDate(new Date(e.getTime() + e.getTimezoneOffset() * 60000));
                }
            } catch (err) {
                Alert.alert("Error", "Could not load settings.");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [id]);

    const openPicker = (mode: 'start' | 'end') => {
        setPickerConfig({
            visible: true,
            mode,
            tempDate: mode === 'start' ? startDate : endDate
        });
    };

    const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') {
            setPickerConfig({ ...pickerConfig, visible: false });
            if (date) {
                pickerConfig.mode === 'start' ? setStartDate(date) : setEndDate(date);
            }
        } else {
            // iOS: Update temp date so user can see what they're picking before hitting "Done"
            if (date) setPickerConfig({ ...pickerConfig, tempDate: date });
        }
    };

    const confirmIOSDate = () => {
        if (pickerConfig.mode === 'start') {
            setStartDate(pickerConfig.tempDate);
        } else {
            setEndDate(pickerConfig.tempDate);
        }
        setPickerConfig({ ...pickerConfig, visible: false });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                LeagueName: leagueName,
                StartingNumber: parseInt(starters),
                BenchNumber: parseInt(bench),
                FreeAgentsAllowed: freeAgents,
                StartDate: startDate.toISOString().split('T')[0],
                EndDate: endDate.toISOString().split('T')[0],
                JoinPassword: joinPassword.trim().length > 0 ? joinPassword : undefined
            };

            await apiRequest(`/leagues/update?id=${id}`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            Alert.alert("Success", "Arena updated.");
            router.back();
        } catch (err: any) {
            Alert.alert("Update Failed", err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Destroy Arena?",
            "This will permanently delete the league and all drafted rosters. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await apiRequest(`/leagues/delete?id=${id}`, {
                                method: 'DELETE'
                            });
                            Alert.alert("Success", "Arena has been dismantled.");
                            triggerRefresh(); // Refresh league list on home screen
                            router.replace('/(tabs)/leagues'); // Navigate back to the league list
                        } catch (err: any) {
                            Alert.alert("Deletion Failed", err.message);
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) return (
        <View className="flex-1 bg-slate-950 items-center justify-center">
            <ActivityIndicator color="#dc2626" />
        </View>
    );

    return (
        <View className="flex-1 bg-slate-950">
            <Stack.Screen options={{ title: "ARENA SETTINGS" }} />

            <ScrollView className="p-6"
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                {/* General Info */}
                <Text className="text-neutral-500 font-black uppercase text-[10px] tracking-widest mb-4">General Info</Text>
                <View className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 mb-6">
                    <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">League Name</Text>
                    <TextInput
                        className="text-white font-black italic text-xl uppercase border-b border-neutral-800 pb-2"
                        value={leagueName}
                        onChangeText={setLeagueName}
                    />
                    <View className="mt-6">
                        <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">Join Password</Text>
                        <View className="flex-row items-center border-b border-neutral-800 pb-2">
                            <ShieldCheck size={16} color="#737373" />
                            <TextInput
                                secureTextEntry
                                className="flex-1 text-white font-mono ml-3"
                                value={joinPassword}
                                onChangeText={setJoinPassword}
                                placeholder="New Password"
                                placeholderTextColor="#404040"
                            />
                        </View>
                    </View>
                </View>

                {/* Season Schedule */}
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

                {/* Date Picker Modal (iOS Style) */}
                <Modal visible={pickerConfig.visible} transparent animationType="slide">
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-neutral-900 rounded-t-3xl p-6">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-white font-black italic uppercase">
                                    Select {pickerConfig.mode === 'start' ? 'Start' : 'End'} Date
                                </Text>
                                <TouchableOpacity onPress={confirmIOSDate} className="bg-red-600 px-4 py-2 rounded-xl">
                                    <Text className="text-white font-bold uppercase text-xs">Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={pickerConfig.tempDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                textColor="white"
                                onChange={onPickerChange}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Roster & Market */}
                <Text className="text-neutral-500 font-black uppercase text-[10px] tracking-widest mb-4">Roster & Market</Text>
                <View className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 mb-8">
                    <View className="flex-row justify-between mb-6">
                        <View className="w-[45%]">
                            <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">Starters</Text>
                            <TextInput
                                keyboardType="numeric"
                                className="text-white font-black italic text-3xl"
                                value={starters}
                                onChangeText={setStarters}
                            />
                        </View>
                        <View className="w-[45%]">
                            <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-2">Bench</Text>
                            <TextInput
                                keyboardType="numeric"
                                className="text-white font-black italic text-3xl"
                                value={bench}
                                onChangeText={setBench}
                            />
                        </View>
                    </View>
                    <View className="flex-row justify-between items-center pt-4 border-t border-neutral-800">
                        <View>
                            <Text className="text-white font-black italic uppercase">Free Agency</Text>
                            <Text className="text-neutral-500 text-[10px] font-mono">Allow mid-season adds</Text>
                        </View>
                        <Switch
                            value={freeAgents}
                            onValueChange={setFreeAgents}
                            trackColor={{ false: '#262626', true: '#dc2626' }}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className="bg-red-600 py-5 rounded-2xl flex-row items-center justify-center"
                >
                    {saving ? <ActivityIndicator color="white" /> : (
                        <>
                            <Save size={20} color="white" />
                            <Text className="text-white font-black uppercase italic text-lg ml-3">Update Arena</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Danger Zone */}
                <View className="mt-12 mb-10 pt-6 border-t border-neutral-900">
                    <Text className="text-red-900 font-black uppercase text-[10px] tracking-widest mb-4 text-center">Danger Zone</Text>
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={deleting || saving}
                        className="bg-transparent border-2 border-red-900/30 py-4 rounded-2xl items-center justify-center"
                    >
                        {deleting ? (
                            <ActivityIndicator color="#7f1d1d" />
                        ) : (
                            <View className="flex-row items-center">
                                <X size={16} color="#7f1d1d" />
                                <Text className="text-red-900 font-black uppercase italic text-sm ml-2">Delete League</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}