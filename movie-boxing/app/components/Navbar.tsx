'use client';

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from 'next-auth/react';
import BoxingGloveL from '@/public/images/Movies/boxingloveL.png';
import BoxingGloveR from '@/public/images/Movies/boxingloveR.png';
import Image from "next/image";
import { Menu, X } from "lucide-react";

const Navbar: React.FC = () => {
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const isAuthenticated = status === "authenticated";
    const userId = session?.user?.id;

    const toggleMenu = () => setIsOpen(!isOpen);

    // --- NEW LOGOUT LOGIC ---
    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            // 1. Grab the refreshToken we added to the NextAuth session
            const refreshToken = (session as any)?.refreshToken;

            if (refreshToken) {
                // 2. Tell Railway to delete the session row
                // Using the exact route we built for the mobile app
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });
            }
        } catch (error) {
            console.error("Failed to invalidate session on server:", error);
        } finally {
            // 3. Clear NextAuth cookie and redirect home
            signOut({ callbackUrl: '/' });
        }
    };

    return (
        <nav className="border-b border-slate-800 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
            <div className="flex items-center justify-between p-4 md:p-6 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center justify-center">
                    <Image src={BoxingGloveL} alt="Logo" className="w-[30px] md:w-[50px] mx-1" />
                    <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">
                        Movie<span className="text-red-600">Boxing</span>
                    </h1>
                    <Image src={BoxingGloveR} alt="Logo" className="w-[30px] md:w-[50px] ml-2" />
                </Link>

                <div className="hidden md:flex items-center space-x-6 font-medium">
                    {isAuthenticated ? (
                        <>
                            <Link href={`/profile/${userId}`} className="text-slate-400 py-2 hover:text-white transition-colors">Profile</Link>
                            <Link href="/leagues" className="text-slate-400 py-2 hover:text-white transition-colors">Leagues</Link>
                            <Link href="/dashboard" className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all">
                                Dashboard
                            </Link>
                            <button 
                                onClick={handleLogout} 
                                disabled={isLoggingOut}
                                className="text-slate-400 py-2 hover:text-white transition-colors disabled:opacity-50"
                            >
                                {isLoggingOut ? 'Leaving...' : 'Logout'}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="hover:text-red-500 py-2 transition-colors">Login</Link>
                            <Link href="/register" className="bg-white text-black px-5 py-2.5 rounded-full font-bold hover:bg-red-500 hover:text-white transition-all">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>

                <button className="md:hidden text-white p-2" onClick={toggleMenu}>
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 border-b border-slate-800' : 'max-h-0'}`}>
                <div className="flex flex-col space-y-4 p-6 bg-slate-950">
                    {isAuthenticated ? (
                        <>
                            <Link href={`/profile/${userId}`} onClick={toggleMenu} className="text-lg font-medium">Profile</Link>
                            <Link href="/leagues" onClick={toggleMenu} className="text-lg font-medium">Leagues</Link>
                            <Link href="/dashboard" onClick={toggleMenu} className="text-lg font-medium text-red-500">Dashboard</Link>
                            <button 
                                onClick={handleLogout} 
                                className="text-left text-lg font-medium text-slate-400"
                            >
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" onClick={toggleMenu} className="text-lg font-medium">Login</Link>
                            <Link href="/register" onClick={toggleMenu} className="bg-white text-black px-5 py-3 rounded-lg font-bold text-center">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;