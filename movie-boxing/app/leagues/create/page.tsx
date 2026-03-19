'use client';
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { useSession, signOut } from 'next-auth/react';

export default function Leagues() {
    const { data: session } = useSession();

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
            {/* Navigation */}
            <Navbar />
            <div className="max-w-6xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-black mb-8 uppercase italic tracking-tighter text-center">
                    Create a New League
                </h1>
                <form>
                    <div className="mb-6">
                        <label htmlFor="leagueName" className="block mb-2 text-sm font-medium text-white">League Name</label>
                        <input type="text" id="leagueName" name="leagueName" className="bg-neutral-900 border border-neutral-800 text-white rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600" placeholder="Enter your league name" required />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="leagueType" className="block mb-2 text-sm font-medium text-white">League Type</label>
                        <select id="leagueType" name="leagueType" className="bg-neutral-900 border border-neutral-800 text-white rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600" required>
                            <option value="">Select a league type</option>
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
                        Create League
                    </button>
                </form>
            </div>
        </div>
    );
}