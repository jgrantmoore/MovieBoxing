'use client';
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { useSession, signOut } from 'next-auth/react';
import { useState } from "react";
import { useRouter } from 'next/navigation';



export default function Leagues() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState({
        LeagueName: '',
        LeagueType: '',
        StartDate: '',
        EndDate: '',
        Password: '',
        StartingNumber: 5,
        BenchNumber: 3,
        PreferredReleaseDate: '',
        FreeAgentsAllowed: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.accessToken) {
            setError("You must be logged in to create a league. Please re-login.");
            return;
        }

        setError('');
        setLoading(true);

        try {
            // We use NextAuth's signIn to manage the session cookie automatically
            const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/leagues/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken || ''}`
                },
                body: JSON.stringify({
                    LeagueName: formData.LeagueName,
                    LeagueType: formData.LeagueType,
                    StartDate: formData.StartDate,
                    EndDate: formData.EndDate,
                    JoinPassword: formData.Password,
                    StartingNumber: Number(formData.StartingNumber),
                    BenchNumber: Number(formData.BenchNumber),
                    PreferredReleaseDate: formData.PreferredReleaseDate,
                    FreeAgentsAllowed: formData.FreeAgentsAllowed === 'true'
                })
            });

            // Success! NextAuth has set the session cookie.
            router.push('/dashboard');
            router.refresh(); // Forces Next.js to re-check the session state

        } catch (err) {
            setError('An unexpected error occurred. Please try again...' + err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
            {/* Navigation */}
            <Navbar />
            <div className="max-w-6xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-black mb-8 uppercase italic tracking-tighter text-center">
                    Create a New League
                </h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-12">
                        <label htmlFor="LeagueName" className="block mb-2 text-sm font-medium text-white">League Name</label>
                        <input
                            type="text"
                            id="LeagueName"
                            name="LeagueName"
                            value={formData.LeagueName}
                            onChange={handleChange}
                            className="bg-neutral-900 border border-neutral-800 text-white rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600"
                            placeholder="Enter your league name"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="mb-6">
                            <label htmlFor="LeagueType" className="block mb-2 text-sm font-medium text-white">League Type</label>
                            <select
                                id="LeagueType"
                                name="LeagueType"
                                value={formData.LeagueType}
                                onChange={handleChange}
                                className={`bg-neutral-900 border border-neutral-800 rounded-lg block w-full p-3 pb-3.75 focus:ring-red-600 focus:border-red-600 ${formData.LeagueType === '' ? 'text-gray-400' : 'text-white'
                                    }`} required
                            >
                                <option value="">Select a league type</option>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <label htmlFor="StartDate" className="block mb-2 text-sm font-medium text-white">Start Date</label>
                            <input
                                type="date"
                                id="StartDate"
                                name="StartDate"
                                value={formData.StartDate}
                                onChange={handleChange}
                                className={`bg-neutral-900 border border-neutral-800 rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600 ${formData.StartDate === '' ? 'text-gray-400' : 'text-white'
                                    }`}
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="EndDate" className="block mb-2 text-sm font-medium text-white">End Date</label>
                            <input
                                type="date"
                                id="EndDate"
                                name="EndDate"
                                value={formData.EndDate}
                                onChange={handleChange}
                                className={`bg-neutral-900 border border-neutral-800 rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600 ${formData.EndDate === '' ? 'text-gray-400' : 'text-white'
                                    }`}
                                required
                            />
                        </div>
                    </div>
                    {formData.LeagueType === 'private' ?
                        (
                            <div className="mb-12">
                                <label htmlFor="Password" className="block mb-2 text-sm font-medium text-white">Password</label>
                                <input
                                    type="Password"
                                    id="Password"
                                    name="Password"
                                    value={formData.Password}
                                    onChange={handleChange}
                                    className="bg-neutral-900 border border-neutral-800 text-white rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600"
                                    placeholder="Enter a password for private league"
                                    required
                                />
                            </div>
                        ) :
                        (null)
                    }
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-8 mb-6 ">
                        <div className="mb-6">
                            <label htmlFor="StartingNumber" className="block mb-2 text-sm font-medium text-white">Starting Movies</label>
                            <input
                                type="text"
                                id="StartingNumber"
                                name="StartingNumber"
                                value={formData.StartingNumber == 0 ? 'Enter Starting #' : formData.StartingNumber}
                                onChange={(e) => {
                                    const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({ ...formData, StartingNumber: parseInt(onlyNums) || 0 });
                                }}
                                className={`bg-neutral-900 border border-neutral-800 rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600 ${formData.StartingNumber == 0 ? 'text-gray-400' : 'text-white'
                                    }`}
                                min={1}
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="BenchNumber" className="block mb-2 text-sm font-medium text-white">Bench Movies</label>
                            <input
                                type="text"
                                id="BenchNumber"
                                name="BenchNumber"
                                value={formData.BenchNumber == 0 ? 'Enter Bench #' : formData.BenchNumber}
                                onChange={(e) => {
                                    const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({ ...formData, BenchNumber: parseInt(onlyNums) || 0 });
                                }}
                                className={`bg-neutral-900 border border-neutral-800 rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600 ${formData.BenchNumber == 0 ? 'text-gray-400' : 'text-white'
                                    }`}
                                min={0}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-8 mb-6 ">
                        <div className="mb-6">
                            <label htmlFor="PreferredReleaseDate" className="block mb-2 text-sm font-medium text-white">
                                Preferred Release Date</label>
                            <select
                                id="PreferredReleaseDate"
                                name="PreferredReleaseDate"
                                value={formData.PreferredReleaseDate}
                                onChange={handleChange}
                                className={`bg-neutral-900 border border-neutral-800 rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600 ${formData.PreferredReleaseDate === '' ? 'text-gray-400' : 'text-white'
                                    }`}
                                required
                            >
                                <option value="">Select date type</option>
                                <option value="us">US Release Date</option>
                                <option value="intl">International Release Date</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <label htmlFor="FreeAgentsAllowed" className="block mb-2 text-sm font-medium text-white">
                                Free Agents Allowed</label>
                            <select
                                id="FreeAgentsAllowed"
                                name="FreeAgentsAllowed"
                                value={formData.FreeAgentsAllowed}
                                onChange={handleChange}
                                className={`bg-neutral-900 border border-neutral-800 rounded-lg block w-full p-3 focus:ring-red-600 focus:border-red-600 ${formData.FreeAgentsAllowed === '' ? 'text-gray-400' : 'text-white'
                                    }`}
                                required
                            >
                                <option value="">Select an option</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
                        Create League
                    </button>
                    <div>
                        {error && (
                            <p className="text-red-500 mt-4">{error}</p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}