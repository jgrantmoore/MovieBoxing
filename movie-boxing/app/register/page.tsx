'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MovieHeader from '../components/MovieHeader';

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
                router.push('/login'); // Adjust route as needed
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
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <div className="max-w-md mx-auto">
                <MovieHeader />

                <div className="bg-neutral-900 rounded-3xl border-2 border-neutral-800 p-6 md:p-8">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-6 text-center">
                        Register
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold uppercase tracking-wider mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white focus:outline-none focus:border-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-sm font-bold uppercase tracking-wider mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white focus:outline-none focus:border-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wider mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white focus:outline-none focus:border-white"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wider mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white focus:outline-none focus:border-white"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-bold uppercase tracking-wider mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white focus:outline-none focus:border-white"
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-black uppercase tracking-wider py-3 rounded hover:bg-neutral-200 disabled:opacity-50"
                        >
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-4">
                        Already have an account? <a href="/login" className="underline">Login here</a>
                    </p>
                </div>
            </div>
        </div>
    );
}