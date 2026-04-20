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
                        Contact Us
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">
                        Have questions or feedback? Reach out to us!
                    </p>
                </header>

                <div className="space-y-12 bg-neutral-900/40 border border-neutral-800 p-8 md:p-12 rounded-3xl shadow-2xl">
                    <form action="https://formsubmit.co/jgrantmoore17@gmail.com" method="POST" >
                        <div className="mb-6">
                            <label htmlFor="name" className="block text-sm font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                placeholder="Your Name"
                                className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-2xl text-white focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-neutral-700 font-bold"
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="email" className="block text-sm font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                placeholder="Your Email"
                                className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-2xl text-white focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-neutral-700 font-bold"
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="message" className="block text-sm font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                required
                                placeholder="Your Message"
                                rows={5}
                                className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-2xl text-white focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-neutral-700 font-bold"
                            />
                        </div>

                        <button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl transition-colors"
                        >
                            Send Message
                        </button>
                    </form>
                    
                </div>
            </div>
            <Footer />
        </div>
    );
}