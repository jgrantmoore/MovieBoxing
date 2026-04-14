'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import {
    Terminal,
    RefreshCw,
    Database,
    ShieldAlert,
    CheckCircle2,
    AlertCircle,
    Activity
} from 'lucide-react';

// Hardcoded authorized email - Change this to your actual email
const ADMIN_EMAIL = "jgrantmoore17@gmail.com";

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // 1. Protection Guard
    if (status === "loading") return <div className="min-h-screen bg-slate-950" />;

    if (!session || session.user?.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center">
                    <ShieldAlert size={48} className="text-red-600 mx-auto mb-4" />
                    <h1 className="text-white font-black italic text-2xl uppercase">Access Denied</h1>
                    <p className="text-neutral-500 font-mono text-sm mt-2">Unauthorized Developer Access Attempt Detected.</p>
                </div>
            </div>
        );
    }

    // 2. API Trigger Handler
    const triggerApiAction = async (actionName: string, endpoint: string) => {
        setLoadingAction(actionName);
        setMessage(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies/local-box-office-update`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: `${actionName}: Successfully executed.` });
            } else {
                throw new Error(data.message || "Execution failed");
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: `${actionName}: ${err.message}` });
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Terminal size={16} className="text-red-600" />
                            <span className="text-red-600 font-black uppercase text-[10px] tracking-[0.3em]">Developer Console</span>
                        </div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Admin Dashboard</h1>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-2xl flex items-center gap-3">
                        <Activity size={16} className="text-green-500" />
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">System: Operational</span>
                    </div>
                </div>

                {/* Status Feedback */}
                {message && (
                    <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
                        }`}>
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <p className="font-bold text-sm uppercase italic">{message.text}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Action Card: Data Sync */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8">
                        <Database size={24} className="text-neutral-500 mb-6" />
                        <h2 className="text-xl font-black italic uppercase mb-2">Manual Data Sync</h2>
                        <p className="text-neutral-500 text-sm mb-8">Force refresh box office numbers from TMDB and update all active league standings.</p>

                        <button
                            onClick={() => triggerApiAction("Data Sync", "/api/movies/local-box-office-update")}
                            disabled={loadingAction !== null}
                            className="w-full bg-white hover:bg-neutral-200 disabled:opacity-50 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
                        >
                            {loadingAction === "Data Sync" ? (
                                <RefreshCw className="animate-spin text-black" size={20} />
                            ) : (
                                <>
                                    <RefreshCw size={20} className="text-black" />
                                    <span className="text-black font-black uppercase italic">Trigger Sync</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Action Card: Maintenance */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8">
                        <ShieldAlert size={24} className="text-neutral-500 mb-6" />
                        <h2 className="text-xl font-black italic uppercase mb-2">Cleanup Services</h2>
                        <p className="text-neutral-500 text-sm mb-8">Remove expired join invitations and clear system cache logs older than 30 days.</p>

                        <button
                            onClick={() => triggerApiAction("System Cleanup", "/api/admin/cleanup")}
                            disabled={loadingAction !== null}
                            className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border border-neutral-700"
                        >
                            {loadingAction === "System Cleanup" ? (
                                <RefreshCw className="animate-spin text-white" size={20} />
                            ) : (
                                <>
                                    <ShieldAlert size={20} className="text-white" />
                                    <span className="text-white font-black uppercase italic">Run Cleanup</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}