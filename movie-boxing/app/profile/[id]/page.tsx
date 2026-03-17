'use client';

import { use, useState, useEffect } from 'react';
import MovieHeader from '../../components/MovieHeader';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfFyIGgGM1ijXqmsNF_QwTSfhsPtmAJZCJef1LhynJ7aamawhh0qpqY-9RpyH1W9bK/exec";
const TMDB_AUTH = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlMTdlOTMxYjY4MjM1NjBkNGNmMjc0YzhkZmZhMTc4YSIsIm5iZiI6MTc1MDE5MTEwOC40MjcsInN1YiI6IjY4NTFjYzA0YWViYTJkMmZlNGIzMTU0ZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Q-mtZuNx4NSIMwB1aO6vwA3MmzkiBOTALyFBLg8cwsc';


export default function Profile({params, }: {params: Promise<{ id: string}>;}) {
    const [loading, setLoading] = useState(true);
    const {id} = use(params);

    useEffect(() => {
        document.title = "Movie Boxing - " + id;
    }, []);

    useEffect(() => {
        async function fetchProfile() {
            try {
                //const profileRes = await fetch(SCRIPT_URL);
                //const profileData = await profileRes.json();
                console.log("skipping fetch");

            } catch (err) {
                console.error("Profile Error:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();

    }, []);

    if (loading) return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <MovieHeader />
            <div className="bg-black text-white flex items-center justify-center font-black italic tracking-widest animate-pulse">
                LOADING PROFILE...
            </div>
        </div>

    );

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <MovieHeader />
                <div className="space-y-6">
                    <div className="flex flex-col">
                        <img src=""/>
                        <h1>{id}</h1>
                    </div>
                    <div>
                        <div href="" className="ml-3 w-50p py-2 px-3 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-black uppercase italic tracking-tight">
                            Invite To League
                        </div>
                    </div>
                    <h2>Stats</h2>
                    <h2>Leagues</h2>
                </div>
            </div>
        </div>
    );
}