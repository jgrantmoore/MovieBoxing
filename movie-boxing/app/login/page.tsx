'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

/**
 * Inner component to handle search params and form logic.
 * This must be wrapped in <Suspense> to fix the Next.js build error.
 */
function LoginFormContent() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();

    const justRegistered = searchParams.get('registered');

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace('/dashboard');
        }
    }, [status, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await signIn('credentials', {
                username: formData.username.trim().toLowerCase(),
                password: formData.password,
                callbackUrl: '',
                redirect: false,
            });

            if (res?.error) {
                setError("Ref stopped the fight: Invalid username or password.");
            }
        } catch (err) {
            setError('The arena is unreachable. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-800 hover:border-red-600/50 transition-all group rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="mb-8 text-center">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
                    Login
                </h1>
                <div className="h-1 w-12 bg-red-600 mt-2 mx-auto rounded-full" />

                {justRegistered && !error && (
                    <p className="mt-4 text-green-500 text-xs font-bold uppercase tracking-widest italic">
                        Account Created. Step into the ring.
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                        Username / Email
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        autoCapitalize="none"
                        placeholder="Enter your credentials"
                        className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-neutral-700 font-bold"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-neutral-700 pr-12 font-bold"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors focus:outline-none"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-2xl">
                        <p className="text-red-600 text-xs font-bold uppercase italic text-center leading-tight">
                            {error}
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white font-black uppercase italic tracking-widest py-5 rounded-2xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                >
                    {loading ? 'Authenticating...' : (
                        <>
                            Enter the Ring
                            <ChevronRight size={20} strokeWidth={3} />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center mt-8 pt-8 border-t border-neutral-900">
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
                    New to the league?{' '}
                    <a href="/register" className="text-red-600 font-black italic underline decoration-red-600/30 underline-offset-4 hover:decoration-red-600 transition-all ml-1">
                        Register Now
                    </a>
                </p>
            </div>
        </div>
    );
}

/**
 * Main Page Export
 */
export default function LoginPage() {
    useEffect(() => {
        document.title = "Movie Boxing - Login";
    }, []);

    return (
        <div className="relative min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
            <div className="absolute top-0 left-0 w-full z-50">
                <Navbar />
            </div>

            <main className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border-2 border-slate-800 rounded-[2.5rem]">
                            <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-red-600 font-black uppercase italic tracking-widest animate-pulse">Loading Arena...</p>
                        </div>
                    }>
                        <LoginFormContent />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </div>
    );
}