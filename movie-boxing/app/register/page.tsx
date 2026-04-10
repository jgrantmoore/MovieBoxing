'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { signIn } from 'next-auth/react';
import Footer from '../components/Footer';

const REGISTER_URL = process.env.NEXT_PUBLIC_REGISTER_URL; // Adjust if the endpoint differs

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        document.title = "Movie Boxing - Register";
    }, []);

    useEffect(() => {
        // Just a "Ping" to wake up the Azure Function while the user is typing
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies`, { method: 'GET' })
            .catch(() => { }); // We don't care if it fails, we just want to wake it up
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (!REGISTER_URL) {
            setError('Registration service is not configured');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                })
            });

            if (res.ok) {
                // Assuming registration succeeds, redirect to login or dashboard
                setTimeout(() => {
                    router.push('/dashboard'); // Adjust route as needed
                }, 800);
            } else if (res.status === 409) {
                setError('Email or username already in use.');
            } else {
                const data = await res.json();
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again. ' + (err instanceof Error ? err.message : ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
            <div className="absolute top-0 left-0 w-full z-50">
                <Navbar />
            </div>

            <main className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-red-600/50 transition-colors group rounded-3xl border-2 p-6 md:p-8 shadow-2xl">
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-8 text-center text-white">
                            Register
                        </h1>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="John"
                                        className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        placeholder="johndoe123"
                                        className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="john@example.com"
                                    className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                        Confirm
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg">
                                    <p className="text-red-500 text-sm font-medium text-center">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {loading ? 'Creating Account...' : 'Join the League'}
                            </button>
                        </form>

                        <div className="text-center mt-8 pt-6 border-t border-neutral-800">
                            <button
                                onClick={() => signIn('google', { callbackUrl: '/leagues' })}
                                className="w-full bg-white text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all mb-4"
                            >
                                <img src="/google-icon.svg" className="w-5 h-5" alt="Google" />
                                Sign up with Google
                            </button>
                            <p className="text-neutral-400 text-sm">
                                Already have an account?{' '}
                                <a href="/login" className="text-white font-bold underline decoration-neutral-700 underline-offset-4 hover:decoration-white transition-all">
                                    Login
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}