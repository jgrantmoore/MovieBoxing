import React from 'react';
import Navbar from "../components/Navbar";
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-400 selection:text-black">
            <Navbar />
            
            <div className="max-w-4xl mx-auto px-6 py-24">
                <header className="text-center mb-16">
                    <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">
                        Last Updated: March 22, 2026
                    </p>
                </header>

                <div className="space-y-12 bg-neutral-900/40 border border-neutral-800 p-8 md:p-12 rounded-3xl shadow-2xl">
                    
                    <section>
                        <h2 className="text-2xl font-black uppercase italic text-red-600 mb-4 tracking-tight">
                            1. Introduction
                        </h2>
                        <p className="text-neutral-300 leading-relaxed">
                            Welcome to <span className="text-white font-bold">MovieBoxing</span>. We value your privacy and are committed to protecting your personal data. This policy outlines how we handle your information when you use our fantasy movie league platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black uppercase italic text-red-600 mb-4 tracking-tight">
                            2. Data We Collect
                        </h2>
                        <p className="text-neutral-300 mb-4">
                            We collect minimal data to provide a functional competitive experience. This includes:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-neutral-400 font-medium">
                            <li><span className="text-white">Account Information:</span> Email address and display name (via Google OAuth or manual registration).</li>
                            <li><span className="text-white">Gameplay Data:</span> League participation, movie draft picks, and roster history.</li>
                            <li><span className="text-white">Authentication:</span> Secure session tokens provided by NextAuth.js.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black uppercase italic text-red-600 mb-4 tracking-tight">
                            3. How We Use Your Data
                        </h2>
                        <p className="text-neutral-300 leading-relaxed">
                            Your information is used strictly for core app functionality:
                        </p>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="p-4 bg-neutral-950/50 border border-neutral-800 rounded-xl">
                                <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Identity</p>
                                <p className="text-sm">To display your name on league leaderboards and draft boards.</p>
                            </div>
                            <div className="p-4 bg-neutral-950/50 border border-neutral-800 rounded-xl">
                                <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Communication</p>
                                <p className="text-sm">To send essential account-related notifications or league updates.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black uppercase italic text-red-600 mb-4 tracking-tight">
                            4. Data Sharing & Security
                        </h2>
                        <p className="text-neutral-300 leading-relaxed">
                            <span className="text-white font-bold underline decoration-red-600">We do not sell your personal data.</span> Data is stored securely using Azure and is only accessible to the application to facilitate gameplay. We do not share your information with third-party advertisers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black uppercase italic text-red-600 mb-4 tracking-tight">
                            5. Your Rights
                        </h2>
                        <p className="text-neutral-300 leading-relaxed">
                            You may request to view, edit, or delete your account data at any time. If you wish to withdraw your consent for data processing, please contact us at the email provided below.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-neutral-800">
                        <h2 className="text-xl font-bold text-white mb-2">Questions?</h2>
                        <p className="text-neutral-500 text-sm">
                            Contact the MovieBoxing team at: <span className="text-red-500 font-mono">jgrantmoore17@gmail.com</span>
                        </p>
                    </section>
                </div>

                <div className="mt-12 text-center">
                    <a href="/login" className="text-sm font-bold uppercase tracking-tighter text-neutral-500 hover:text-white transition-colors">
                        ← Back to Login
                    </a>
                </div>
            </div>
            <Footer />
        </div>
    );
}