'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { signIn } from 'next-auth/react';
import Footer from '../components/Footer';
import { useSession } from 'next-auth/react';

const REGISTER_URL = process.env.NEXT_PUBLIC_REGISTER_URL;
const CHECK_USERNAME_URL = `${process.env.NEXT_PUBLIC_API_URL}/auth/check-username`;

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

    // Username Check States
    const [usernameStatus, setUsernameStatus] = useState<{
        loading: boolean;
        available: boolean | null;
        message: string;
    }>({ loading: false, available: null, message: '' });

    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        document.title = "Movie Boxing - Register";
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace('/dashboard'); // Use replace to keep history clean
        }
    }, [status, router]);

    // --- DEBOUNCED USERNAME CHECK ---
    useEffect(() => {
        const checkUsernameAvailability = async () => {
            const user = formData.username.trim();
            if (user.length < 3) {
                setUsernameStatus({ loading: false, available: null, message: '' });
                return;
            }

            setUsernameStatus(prev => ({ ...prev, loading: true }));

            try {
                const res = await fetch(CHECK_USERNAME_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user })
                });
                const data = await res.json();

                setUsernameStatus({
                    loading: false,
                    available: data.available,
                    message: data.message
                });
            } catch (err) {
                setUsernameStatus({ loading: false, available: null, message: 'Check failed' });
            }
        };

        const timeoutId = setTimeout(() => {
            checkUsernameAvailability();
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (usernameStatus.available === false) {
            setError(usernameStatus.message);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(REGISTER_URL!, {
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
                router.replace('/login?registered=true');
            } else {
                const text = await res.text();
                setError(text || 'Registration failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
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
                                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="John"
                                        className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        autoCapitalize="none"
                                        placeholder="fighter123"
                                        className={`w-full px-4 py-3 bg-black border rounded-xl text-white focus:outline-none transition-colors ${usernameStatus.available === true ? 'border-green-500' :
                                            usernameStatus.available === false ? 'border-red-600' : 'border-neutral-700'
                                            }`}
                                    />
                                    {/* Availability Sub-text */}
                                    {formData.username.length >= 3 && (
                                        <p className={`text-[10px] mt-1 font-bold italic uppercase tracking-tight ${usernameStatus.available ? 'text-green-500' : 'text-red-600'
                                            }`}>
                                            {usernameStatus.loading ? 'Checking...' : usernameStatus.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    autoCapitalize="none"
                                    placeholder="john@example.com"
                                    className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors"
                                />
                            </div>


                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-400">Confirm</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg">
                                    <p className="text-red-500 text-xs font-bold uppercase italic text-center">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || usernameStatus.available === false}
                                className="w-full bg-red-600 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
                            >
                                {loading ? 'Registering...' : 'Step Into The Ring'}
                            </button>
                        </form>

                        <div className="text-center mt-8 pt-6 border-t border-neutral-800">
                            {/* <button
                                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all mb-4"
                            >
                                <img src="/google-icon.svg" className="w-5 h-5" alt="Google" />
                                <span className="uppercase tracking-tighter">Sign up with Google</span>
                            </button> */}
                            <p className="text-neutral-400 text-sm">
                                Already registered?{' '}
                                <a href="/login" className="text-white font-bold underline decoration-red-600 underline-offset-4 hover:decoration-white transition-all">
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