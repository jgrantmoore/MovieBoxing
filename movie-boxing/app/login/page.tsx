'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MovieHeader from '../components/MovieHeader';

const LOGIN_URL = process.env.LOGIN_URL; // Adjust if the endpoint differs

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

        if (!LOGIN_URL) {
            setError('Login service is not configured');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
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
            setError('An error occurred. Please try again.');
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
                        Login
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-bold uppercase tracking-wider mb-1">
                                Username/Email
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

                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-black uppercase tracking-wider py-3 rounded hover:bg-neutral-200 disabled:opacity-50"
                        >
                            {loading ? 'Logging In...' : 'Login'}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-4">
                        Don't have an account? <a href="/register" className="underline">Register here</a>
                    </p>
                </div>
            </div>
        </div>
    );
}