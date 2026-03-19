'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import MovieHeader from '../components/MovieHeader';

export default function LoginPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        document.title = "Movie Boxing - Login";
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // We use NextAuth's signIn to manage the session cookie automatically
            const res = await signIn('credentials', {
                username: formData.username,
                password: formData.password,
                redirect: false, // Handle the redirect manually to show errors
            });

            if (res?.error) {
                // This captures errors returned from your [...nextauth] authorize function
                setError("Invalid username or password. Please try again.");
            } else {
                // Success! NextAuth has set the session cookie.
                router.push('/dashboard'); 
                router.refresh(); // Forces Next.js to re-check the session state
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <div className="max-w-md mx-auto">
                <MovieHeader />

                <div className="bg-neutral-900 rounded-3xl border-2 border-neutral-800 p-6 md:p-8 mt-8">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-8 text-center text-white">
                        Login
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">
                                Username / Email
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="Enter your credentials"
                                className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                            />
                        </div>

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
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="text-center mt-8 pt-6 border-t border-neutral-800">
                        <p className="text-neutral-400 text-sm">
                            New to the league?{' '}
                            <a href="/register" className="text-white font-bold underline decoration-neutral-700 underline-offset-4 hover:decoration-white transition-all">
                                Create an Account
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}