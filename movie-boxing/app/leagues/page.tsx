'use client';
import Link from "next/link";
import Navbar from "../components/Navbar";
import { useSession, signOut } from 'next-auth/react';

export default function Leagues() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
      {/* Navigation */}
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-black mb-8 uppercase italic tracking-tighter text-center">
          Your Leagues
        </h1>
        <p className="text-lg text-slate-400 mb-12 text-center">
          {session ? `Welcome back, ${session.user?.name}! Here are your current leagues:` : "Please log in to view your leagues."}
        </p>
        <div className="flex justify-between mb-12">
          <div>Sort By</div>
          {session ? (
            <Link href="/leagues/create" className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
              Create New League
            </Link>
          ) : (
            <Link href="/login" className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
              Log In to Create a League
            </Link>
          )}
        </div>
        
        {/* Placeholder for league list */}
        <div className="bg-neutral-900 rounded-3xl border-2 border-neutral-800 p-6 md:p-8">
          <p className="text-center text-slate-500">No leagues found. Create or join a league to get started!</p>
        </div>
      </div>
    </div>
  );
}