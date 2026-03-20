'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";
import { useSession } from 'next-auth/react';

export default function Leagues() {
  const { data: session } = useSession();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBench, setOpenBench] = useState<Set<number>>(new Set());

  // Default League Rules (Can be dynamic later)
  const STARTING_SLOTS = 5;
  const BENCH_SLOTS = 3;
  const TOTAL_SLOTS = STARTING_SLOTS + BENCH_SLOTS;

  useEffect(() => {
    async function fetchData() {
      if (!session?.accessToken) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/my-teams`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl font-black mb-8 uppercase italic tracking-tighter">Your Leagues</h1>
          <p className="text-lg text-slate-400 animate-pulse">Loading Roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <h1 className="text-4xl font-black mb-12 uppercase italic tracking-tighter text-center">
          Your Movie Boxing Leagues
        </h1>

        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <p className="text-lg text-slate-400">
            {session ? `Welcome, ${session.user?.name}` : "Please log in to view your teams."}
          </p>
          <Link href="/leagues/create" className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 transition-all uppercase tracking-tight">
            Create New League
          </Link>
        </div>

        <div className="space-y-16">
          {teams.length > 0 ? (
            teams.map((team) => {
              // Calculate Total Box Office for STARTING movies only
              const totalBoxOffice = team.Picks.reduce((sum: number, pick: any) => {
                return pick.OrderDrafted <= STARTING_SLOTS ? sum + (pick.BoxOffice || 0) : sum;
              }, 0);

              return (
                <div key={team.LeagueName} className="bg-neutral-900/40 rounded-3xl border border-neutral-800 p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-8 border-b border-neutral-800/50 pb-6 md:flex-row flex-col gap-4">
                    <div>
                      <h2 className="text-4xl font-black uppercase italic text-red-600 tracking-tighter">
                        {team.LeagueName}
                      </h2>
                      <p className="text-s text-neutral-500 font-mono mt-1">{team.TeamName}</p>
                    </div>
                    <div className="text-left md:text-right flex flex-row md:flex-row-reverse justify-between items-center w-full md:w-auto items-end gap-6">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Team Total</p>
                        <p className="text-3xl font-mono font-black text-white">
                          ${(totalBoxOffice / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <button
                        onClick={() => { const next = new Set(openBench); next.has(team.TeamName) ? next.delete(team.TeamName) : next.add(team.TeamName); setOpenBench(next); }}
                        className='px-4 py-2 bg-neutral-800 rounded-lg text-sm'
                      >
                        {openBench.has(team.TeamName) ? 'Hide Bench' : 'Show Bench'}
                      </button>
                    </div>

                  </div>

                  {/* Single Unified Grid */}
                  {/* Updated Unified Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {Array.from({
                      // If team name is in the Set, show 8 (TOTAL), otherwise show 5 (STARTING)
                      length: openBench.has(team.TeamName) ? TOTAL_SLOTS : STARTING_SLOTS
                    }).map((_, idx) => {
                      const slotNumber = idx + 1;
                      const pick = team.Picks.find((p: any) => p.OrderDrafted === slotNumber);

                      if (pick) {
                        return (
                          <MovieCard
                            key={`pick-${team.TeamId}-${pick.MovieId}`}
                            movieId={pick.MovieId}
                            title={pick.Title}
                            posterUrl={pick.PosterUrl}
                            boxOffice={pick.BoxOffice}
                            releaseDate={pick.ReleaseDate}
                            // A pick is on the bench if its drafted order is > 5
                            isBench={slotNumber > STARTING_SLOTS}
                          />
                        );
                      } else {
                        return (
                          <MovieCard
                            key={`empty-${team.TeamId}-${slotNumber}`}
                            movieId={0}
                            title="Open Slot"
                            posterUrl={null}
                            boxOffice={0}
                            releaseDate={null}
                            isBench={slotNumber > STARTING_SLOTS}
                          />
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-neutral-900 rounded-3xl border-2 border-dashed border-neutral-800 p-20 text-center">
              <p className="text-slate-500 mb-6 text-xl italic font-medium">You haven't joined any leagues yet.</p>
              <Link href="/leagues/create" className="text-red-500 font-black hover:text-white transition-colors text-2xl uppercase italic tracking-tighter">
                Start a New League →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}