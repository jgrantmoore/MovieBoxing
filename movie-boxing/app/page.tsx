'use client';

import Link from "next/link";
import Navbar from "./components/Navbar";
import { useSession } from 'next-auth/react';
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import Footer from "./components/Footer";

function LandingPageContent() {
  const { data: session } = useSession();
  // Mock session for styling toggle - change to 'false' to see the logged-out state
  const isDemoLoggedIn = true; 

  useEffect(() => {
        document.title = "Movie Boxing";
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <main className="relative overflow-hidden pt-20 pb-32">
        {/* Visual Flair: Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-96 bg-red-600/10 blur-[120px] rounded-full" />
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          <div className="inline-block px-4 py-1.5 mb-6 border border-red-600/30 rounded-full bg-red-600/5 text-red-600 text-xs font-bold uppercase tracking-widest">
            Open Beta Now Live
          </div>
          <h2 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] uppercase italic tracking-tighter">
            The Box Office <br />
            <span className="text-red-600">Is Your Ring</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Draft blockbusters, scout the indie sleepers, and trade your way to the top. 
            The premier fantasy league for your cinephile friends.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={session ? "/leagues" : "/register"} className="w-full sm:w-auto bg-red-600 text-black font-black text-xl px-10 py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]">
              {session ? "Enter the Arena" : "Get Started"}
            </Link>
            <a href="#rules" className="w-full sm:w-auto border border-slate-700 font-bold text-xl px-10 py-5 rounded-2xl hover:bg-slate-900 transition-colors">
              Rules of Engagement
            </a>
            <a href="/leagues/123" className="w-full sm:w-auto border border-slate-700 font-bold text-xl px-10 py-5 rounded-2xl hover:bg-slate-900 transition-colors">
              Temp Link to the Original League
            </a>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Live Details", desc: "Real-time data for every major theatrical release." },
            { title: "Auto Scoring", desc: "Automated scoring based on global box office performance data." },
            { title: "Dirty Trading", desc: "Negotiate trades for upcoming films to save your season." }
          ].map((feature, i) => (
            <div key={i} className="p-10 rounded-[2rem] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-red-600/50 transition-colors group">
              <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center mb-6 text-red-600 font-bold text-xl group-hover:bg-red-600 group-hover:text-black transition-all">
                0{i + 1}
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase italic">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rules Section (The Playbook) */}
      <section id="rules" className="max-w-6xl mx-auto px-6 py-24 border-t border-slate-900">
        <div className="mb-16">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter">
            The <span className="text-red-600">Official</span> Playbook
          </h2>
          <p className="text-slate-400 mt-2">Know the regulations before you step into the ring.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Rule 1: Drafting */}
          <div className="flex gap-6">
            <span className="text-4xl font-black text-slate-800 italic">01</span>
            <div>
              <h3 className="text-xl font-bold uppercase text-red-600 mb-2 italic">The Draft Phase</h3>
              <p className="text-slate-300 leading-relaxed">
                Build your core stable. Draft your movies and finalize your starting lineup once the draft concludes. These are your heavy hitters.
              </p>
            </div>
          </div>

          {/* Rule 2: Swapping */}
          <div className="flex gap-6">
            <span className="text-4xl font-black text-slate-800 italic">02</span>
            <div>
              <h3 className="text-xl font-bold uppercase text-red-600 mb-2 italic">Benching & Rosters</h3>
              <p className="text-slate-300 leading-relaxed">
                Flexibility is key. Freely swap benched movies into your starting 5 if both are unreleased. If a starter is delayed past the league window, you can sub in a released bench movie to keep your score climbing.
              </p>
            </div>
          </div>

          {/* Rule 3: Trading */}
          <div className="flex gap-6">
            <span className="text-4xl font-black text-slate-800 italic">03</span>
            <div>
              <h3 className="text-xl font-bold uppercase text-red-600 mb-2 italic">The Trade Block</h3>
              <p className="text-slate-300 leading-relaxed">
                Keep the market moving. One-for-one movie trades are allowed throughout the season. Negotiate with rivals to optimize your portfolio.
              </p>
            </div>
          </div>

          {/* Rule 4: Free Agency */}
          <div className="flex gap-6">
            <span className="text-4xl font-black text-slate-800 italic">04</span>
            <div>
              <h3 className="text-xl font-bold uppercase text-red-600 mb-2 italic">Free Agent Signings</h3>
              <p className="text-slate-300 leading-relaxed">
                Scout the wire. Once per period (typically monthly), sign any unclaimed movie by discarding an unreleased film. Discarded movies (even those previously drafted) are fair game for the rest of the league.
              </p>
            </div>
          </div>

        </div>

        {/* Final Scoring Callout */}
        <div className="mt-20 p-8 rounded-3xl bg-red-600 text-black">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black uppercase italic">Final Calculations</h3>
              <p className="font-medium opacity-90">
                Total box office includes all earnings up to the final second of the League timeframe. 
                We use the official **TMDB Numbers** as our source of truth.
              </p>
            </div>
            <div className="text-4xl font-black italic opacity-20 hidden md:block">
              SCOREBOARD
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function LandingPage() {
  return (
    <SessionProvider>
      <LandingPageContent />
    </SessionProvider>
  );
}