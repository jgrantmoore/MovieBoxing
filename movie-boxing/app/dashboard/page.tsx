'use client';

import { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import MovieHeader from '../components/MovieHeader';
import Navbar from '../components/Navbar';
import LeagueHeader from '../components/LeagueHeader';
import Footer from '../components/Footer';

export default function Movies() {
    const [draft, setDraft] = useState<{ name: string; starting: string[]; bench: string[] }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document.title = "Movie Boxing - Dashboard";
    }, []);


    if (loading) return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            <Navbar />
            <div className="min-h-screen bg-slate-950 text-white p-4 md:p-12 font-sans">
                <div className="bg-slate-950 text-white flex items-center justify-center font-black italic tracking-widest animate-pulse">LOADING...</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            <Navbar />
            <div className="min-h-screen bg-slate-950 text-white p-4 md:p-12 font-sans">
                <LeagueHeader leagueName="Your Dashboard" />
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}``