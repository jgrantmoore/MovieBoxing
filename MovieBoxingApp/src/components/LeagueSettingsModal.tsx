import React, { useState, useEffect, useContext } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Switch
} from 'react-native';
import { X, Save, Calendar, ShieldCheck, Trash2 } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { apiRequest } from '../api/client';
import { RefreshContext } from '@/src/context/RefreshContext';

interface LeagueSettingsProps {
    visible: boolean;
    onClose: () => void;
    leagueId: string | number;
    onUpdateSuccess: () => void;
}

export const LeagueSettingsModal = ({
    visible,
    onClose,
    leagueId,
    onUpdateSuccess
}: LeagueSettingsProps) => {
    const { triggerRefresh } = useContext(RefreshContext);

    // Status States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form State
    const [leagueName, setLeagueName] = useState("");
    const [starters, setStarters] = useState("5");
    const [bench, setBench] = useState("3");
    const [joinPassword, setJoinPassword] = useState("");
    const [freeAgents, setFreeAgents] = useState(true);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    // Date Picker UI State
    const [pickerConfig, setPickerConfig] = useState<{
        visible: boolean,
        mode: 'start' | 'end',
        tempDate: Date
    }>({ visible: false, mode: 'start', tempDate: new Date() });

    useEffect(() => {
        if (visible) fetchSettings();
    }, [visible, leagueId]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/leagues?id=${leagueId}`);
            setLeagueName(data.LeagueName);
            setStarters(String(data.Rules?.Starting || 5));
            setBench(String(data.Rules?.Bench || 3));
            setFreeAgents(data.Rules?.FreeAgents ?? true);
            
            if (data.StartDate) {
                const s = new Date(data.StartDate);
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
                JoinPassword: joinPassword.trim().length > 0 ? joinPassword : undefined,
                PreferredReleaseDate: 'in'
            };

            await apiRequest(`/leagues/update?id=${leagueId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            Alert.alert("Success", "Arena updated.");
            onUpdateSuccess();
            onClose();
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
                            await apiRequest(`/leagues/delete?id=${leagueId}`, { method: 'DELETE' });
                            triggerRefresh();
                            onClose();
                            // If this was a page, we'd router.replace, 
                            // but as a modal, the parent should handle the redirect.
                        } catch (err: any) {
                            Alert.alert("Deletion Failed", err.message);
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') {
            setPickerConfig({ ...pickerConfig, visible: false });
            if (date) {
                pickerConfig.mode === 'start' ? setStartDate(date) : setEndDate(date);
            }
        } else if (date) {
            setPickerConfig({ ...pickerConfig, tempDate: date });
        }
    };

    const confirmIOSDate = () => {
        pickerConfig.mode === 'start' ? setStartDate(pickerConfig.tempDate) : setEndDate(pickerConfig.tempDate);
        setPickerConfig({ ...pickerConfig, visible: false });
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
                {/* Header */}
                <View className="p-6 pt-16 flex-row justify-between items-center border-b border-neutral-900 bg-slate-950">
                    <View>
                        <Text className="text-2xl font-black text-red-600 uppercase italic">Arena Settings</Text>
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest">Configuration</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="bg-neutral-900 p-2 rounded-full">
                        <X color="white" size={24} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="#dc2626" />
                    </View>
                ) : (
                    <ScrollView className="p-6" keyboardShouldPersistTaps="handled">
                        {/* Section: General */}
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
                                        placeholder="Update Password"
                                        placeholderTextColor="#404040"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Section: Schedule */}
                        <Text className="text-neutral-500 font-black uppercase text-[10px] tracking-widest mb-4">Season Schedule</Text>
                        <View className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 mb-6 flex-row justify-between">
                            <TouchableOpacity onPress={() => setPickerConfig({ visible: true, mode: 'start', tempDate: startDate })} className="flex-1 mr-2">
                                <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-1">Start Date</Text>
                                <View className="flex-row items-center">
                                    <Calendar size={14} color="#dc2626" />
                                    <Text className="text-white font-mono ml-2 italic">{startDate.toLocaleDateString()}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setPickerConfig({ visible: true, mode: 'end', tempDate: endDate })} className="flex-1 ml-2">
                                <Text className="text-neutral-400 text-[10px] font-bold uppercase mb-1">End Date</Text>
                                <View className="flex-row items-center">
                                    <Calendar size={14} color="#dc2626" />
                                    <Text className="text-white font-mono ml-2 italic">{endDate.toLocaleDateString()}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Section: Rules */}
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

                        {/* Actions */}
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className="bg-red-600 py-5 rounded-2xl flex-row items-center justify-center shadow-lg"
                        >
                            {saving ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Save size={20} color="white" />
                                    <Text className="text-white font-black uppercase italic text-lg ml-3">Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View className="mt-12 mb-20 pt-6 border-t border-neutral-900">
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
                                        <Trash2 size={16} color="#7f1d1d" />
                                        <Text className="text-red-900 font-black uppercase italic text-sm ml-2">Delete Arena</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                )}
            </KeyboardAvoidingView>

            {/* Nested iOS Date Picker Modal */}
            <Modal visible={pickerConfig.visible && Platform.OS === 'ios'} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-neutral-900 rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-white font-black italic uppercase">Select Date</Text>
                            <TouchableOpacity onPress={confirmIOSDate} className="bg-red-600 px-4 py-2 rounded-xl">
                                <Text className="text-white font-bold uppercase text-xs">Done</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={pickerConfig.tempDate}
                            mode="date"
                            display="spinner"
                            textColor="white"
                            onChange={onPickerChange}
                        />
                    </View>
                </View>
            </Modal>

            {/* Android Date Picker */}
            {pickerConfig.visible && Platform.OS === 'android' && (
                <DateTimePicker
                    value={pickerConfig.tempDate}
                    mode="date"
                    display="default"
                    onChange={onPickerChange}
                />
            )}
        </Modal>
    );
};