'use client';

import { useState, useEffect } from 'react';
import MovieCard from './components/MovieCard';
import MovieHeader from './components/MovieHeader';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfFyIGgGM1ijXqmsNF_QwTSfhsPtmAJZCJef1LhynJ7aamawhh0qpqY-9RpyH1W9bK/exec";
const TMDB_AUTH = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlMTdlOTMxYjY4MjM1NjBkNGNmMjc0YzhkZmZhMTc4YSIsIm5iZiI6MTc1MDE5MTEwOC40MjcsInN1YiI6IjY4NTFjYzA0YWViYTJkMmZlNGIzMTU0ZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Q-mtZuNx4NSIMwB1aO6vwA3MmzkiBOTALyFBLg8cwsc';

export default function Movies() {
    const [draft, setDraft] = useState<{ name: string; starting: string[]; bench: string[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [movieDetails, setMovieDetails] = useState<{ [key: string]: any }>({});
    const [editingPlayerName, setEditingPlayerName] = useState<string | null>(null);
    const [openBench, setOpenBench] = useState<Set<string>>(new Set());
    // Track which SPECIFIC player is saving
    const [savingPlayerName, setSavingPlayerName] = useState<string | null>(null);

    const [selectedForExchange, setSelectedForExchange] = useState<{ id: string, isBench: boolean } | null>(null);
    const [swapping, setSwapping] = useState<{ playerName: string, movieId: string, isBench: boolean } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const options = { method: 'GET', headers: { accept: 'application/json', Authorization: TMDB_AUTH } };

    useEffect(() => {
        document.title = "Movie Boxing - Home";
    }, []);

    useEffect(() => {
        async function fetchData() {
            try {
                const draftRes = await fetch(SCRIPT_URL);
                const draftData = await draftRes.json();
                setDraft(draftData);

                const allIds = Array.from(new Set(draftData.flatMap((p: any) => [...p.starting, ...p.bench])));

                // Fetch details for all IDs found in the sheet
                const detailPromises = allIds.map(async (id: any) => {
                    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}`, options);
                    return await res.json();
                });

                const results = await Promise.all(detailPromises);
                const detailsMap: any = {};
                results.forEach(m => { if (m.id) detailsMap[String(m.id)] = m; });
                setMovieDetails(detailsMap);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        fetchData();
    }, []);

    const saveToSheet = async (playerName: string) => {
        const playerData = draft.find(p => p.name === playerName);
        if (!playerData) return;

        setSavingPlayerName(playerName); // Only this player shows "Saving..."
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(playerData)
            });
            setEditingPlayerName(null);
        } catch (e) { alert("Save failed."); }
        finally { setSavingPlayerName(null); }
    };

    const handleExchange = (playerName: string, movieId: string, isBench: boolean) => {
        if (!selectedForExchange) {
            setSelectedForExchange({ id: movieId, isBench });
            return;
        }
        if (selectedForExchange.isBench === isBench) {
            setSelectedForExchange({ id: movieId, isBench });
            return;
        }

        const startId = isBench ? selectedForExchange.id : movieId;
        const benchId = isBench ? movieId : selectedForExchange.id;
        const startDetails = movieDetails[startId];

        const startDate = startDetails?.release_date ? new Date(startDetails.release_date) : null;
        if (startDate && startDate <= new Date() && startDate.getFullYear() <= 2026) {
            alert("Cannot swap a released starter (unless 2027+).");
            setSelectedForExchange(null);
            return;
        }

        const newDraft = draft.map(p => {
            if (p.name !== playerName) return p;
            return {
                ...p,
                starting: p.starting.map(id => id === startId ? benchId : id),
                bench: p.bench.map(id => id === benchId ? startId : id)
            };
        });

        setDraft(newDraft);
        setSelectedForExchange(null);
    };

    const handleReplace = async (movie: any) => {
        if (!swapping) return;
        const newId = String(movie.id);

        // Fetch new details if we don't have them
        if (!movieDetails[newId]) {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${newId}`, options);
            const data = await res.json();
            setMovieDetails(prev => ({ ...prev, [newId]: data }));
        }

        const newDraft = draft.map(p => {
            if (p.name !== swapping.playerName) return p;
            const update = (list: string[]) => list.map(id => id === swapping.movieId ? newId : id);
            return swapping.isBench ? { ...p, bench: update(p.bench) } : { ...p, starting: update(p.starting) };
        });

        setDraft(newDraft);
        setSwapping(null);
    };

    if (loading && draft.length === 0) return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <MovieHeader />
            <div className="bg-black text-white flex items-center justify-center font-black italic tracking-widest animate-pulse">LOADING...</div>
        </div>
    );



    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto">
                <MovieHeader />
                {swapping && (
                    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4">
                        <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-bold mb-4">Replace Movie</h3>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search movies..."
                                className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 mb-4 focus:border-blue-500 outline-none"
                                onChange={(e) => {
                                    if (e.target.value.length > 2) {
                                        fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(e.target.value)}`, options)
                                            .then(r => r.json()).then(d => setSearchResults(d.results || []));
                                    }
                                }}
                            />
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {searchResults.map(m => (
                                    <div
                                        key={m.id}
                                        onClick={() => handleReplace(m)}
                                        className="p-3 bg-neutral-800 hover:bg-blue-600 cursor-pointer rounded flex justify-between items-center group transition-colors"
                                    >
                                        <span className="font-medium text-sm">{m.title}</span>
                                        {/* Added Release Year back here */}
                                        <span className="text-[10px] font-bold bg-black/40 px-2 py-1 rounded text-neutral-400 group-hover:text-white">
                                            {m.release_date ? m.release_date.split('-')[0] : 'TBD'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => { setSwapping(null); setSearchResults([]); }}
                                className="w-full mt-6 text-sm font-bold text-neutral-500 hover:text-white transition-colors"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-10 w-full">
                    {draft.map((player) => {
                        const isEditing = editingPlayerName === player.name;
                        return (
                            <div key={player.name} className={`bg-neutral-900 border p-6 rounded-xl transition-all ${isEditing ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-neutral-800'}`}>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className='text-2xl font-bold text-blue-500'>{player.name}</h2>
                                        <button
                                            // Disable if ANYONE is saving
                                            disabled={savingPlayerName !== null}
                                            onClick={() => isEditing ? saveToSheet(player.name) : setEditingPlayerName(player.name)}
                                            className={`text-[10px] uppercase font-black px-4 py-2 rounded-full border transition-all duration-200
        ${savingPlayerName === player.name
                                                    ? 'bg-orange-600 border-orange-600 text-white animate-pulse cursor-wait w-[160px]' // Fixed width prevents jumping
                                                    : isEditing
                                                        ? 'bg-green-600 border-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20'
                                                        : 'border-neutral-700 text-neutral-500 hover:text-white hover:border-neutral-500'} 
        ${savingPlayerName !== null && savingPlayerName !== player.name ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            {savingPlayerName === player.name ? (
                                                "⌛ SAVING... DON'T LEAVE"
                                            ) : isEditing ? (
                                                '💾 Save Changes'
                                            ) : (
                                                '✎ Edit'
                                            )}
                                        </button>
                                    </div>
                                    <button onClick={() => { const next = new Set(openBench); next.has(player.name) ? next.delete(player.name) : next.add(player.name); setOpenBench(next); }} className='px-4 py-2 bg-neutral-800 rounded-lg text-sm'>
                                        {openBench.has(player.name) ? 'Hide Bench' : 'Show Bench'}
                                    </button>
                                </div>

                                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4'>
                                    {[...player.starting.map(id => ({ id, isBench: false })),
                                    ...(openBench.has(player.name) ? player.bench.map(id => ({ id, isBench: true })) : [])
                                    ].map((obj, idx) => {
                                        const details = movieDetails[obj.id];
                                        const isSelected = selectedForExchange?.id === obj.id;
                                        const key = `${player.name}-${obj.isBench ? 'bench' : 'starting'}-${idx}`;

                                        return (
                                            <MovieCard
                                                key={key}
                                                playerName={player.name}
                                                movieId={obj.id}
                                                isBench={obj.isBench}
                                                details={details}
                                                isSelected={isSelected}
                                                isEditing={isEditing}
                                                selectedForExchange={selectedForExchange}
                                                setSwapping={setSwapping}
                                                handleExchange={handleExchange}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}