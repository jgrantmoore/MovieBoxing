'use client';

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from 'next-auth/react';
import BoxingGloveL from '@/public/images/Movies/boxingloveL.png';
import BoxingGloveR from '@/public/images/Movies/boxingloveR.png';
import Image from "next/image";
import { Menu, X } from "lucide-react"; // Optional: npm install lucide-react for icons

const Navbar: React.FC = () => {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <nav className="border-b border-slate-800 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
            <div className="flex items-center justify-between p-4 md:p-6 max-w-7xl mx-auto">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center">
                    <Image
                        src={BoxingGloveL}
                        alt="Movie Boxing Logo"
                        className="w-[30px] md:w-[50px] mx-1"
                    />
                    <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">
                        Movie<span className="text-red-600">Boxing</span>
                    </h1>
                    <Image
                        src={BoxingGloveR}
                        alt="Movie Boxing Logo"
                        className="w-[30px] md:w-[50px] ml-2"
                    />
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-6 font-medium">
                    {session ? (
                        <>
                            <Link href="#" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link>
                            <Link href="/leagues" className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all">
                                Leagues
                            </Link>
                            <button onClick={() => signOut()} className="text-slate-400 hover:text-white transition-colors">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="hover:text-red-500 transition-colors">Login</Link>
                            <Link href="/register" className="bg-white text-black px-5 py-2.5 rounded-full font-bold hover:bg-red-500 hover:text-white transition-all">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Hamburger Button */}
                <button 
                    className="md:hidden text-white p-2" 
                    onClick={toggleMenu}
                    aria-label="Toggle Menu"
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Sidebar/Menu */}
            <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 border-b border-slate-800' : 'max-h-0'}`}>
                <div className="flex flex-col space-y-4 p-6 bg-slate-950">
                    {session ? (
                        <>
                            <Link href="#" onClick={toggleMenu} className="text-lg font-medium">Dashboard</Link>
                            <Link href="/leagues" onClick={toggleMenu} className="text-lg font-medium text-red-500">Leagues</Link>
                            <button onClick={() => signOut()} className="text-left text-lg font-medium text-slate-400">Logout</button>
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