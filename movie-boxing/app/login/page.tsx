'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import MovieHeader from '../components/MovieHeader';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);

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
                callbackUrl: '',
                redirect: false, // Handle the redirect manually to show errors
            });

            if (res?.error) {
                // This captures errors returned from your [...nextauth] authorize function
                setError("Invalid username or password. Please try again.");
            } else {
                // Success! NextAuth has set the session cookie.
                setTimeout(() => {
                    router.push('/dashboard'); // Adjust route as needed
                }, 800);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
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
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-red-600/50 transition-colors group rounded-3xl border-2 p-6 md:p-8">
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

                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-neutral-400">
                                    Password
                                </label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? "text" : "password"} // Dynamic type
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600 pr-12" // pr-12 makes room for the button
                                    />
                                    <button
                                        type="button" // Important: prevents form submission
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-white transition-colors focus:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} strokeWidth={2.5} />
                                        ) : (
                                            <Eye size={18} strokeWidth={2.5} />
                                        )}
                                    </button>
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
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="text-center mt-8 pt-6 border-t border-neutral-800">
                            <button
                                onClick={() => signIn('google', { callbackUrl: '/leagues' })}
                                className="w-full bg-white text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all mb-4"
                            >
                                <img src="/google-icon.svg" className="w-5 h-5" alt="Google" />
                                Sign in with Google
                            </button>
                            <p className="text-neutral-400 text-sm">
                                New to the league?{' '}
                                <a href="/register" className="text-white font-bold underline decoration-neutral-700 underline-offset-4 hover:decoration-white transition-all">
                                    Create an Account
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