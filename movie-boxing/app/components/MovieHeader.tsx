import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BoxingGloveL from '@/public/images/Movies/boxingloveL.png';
import BoxingGloveR from '@/public/images/Movies/boxingloveR.png';


const MovieCard: React.FC = ({}) => {

    return (
        <header className="text-center mb-16 md:mt-6 mt-12">
            <div className="flex items-center justify-center">
                <Image
                    src={BoxingGloveL}
                    alt="Movie Boxing Logo"
                    width={125}
                    height={50}
                    className="w-[50px] md:w-[125px] mb-4 mx-0 "
                />
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-4 mr-2 text-center min-w-[10ch]">
                    MOVIE BOXING
                </h1>
                <Image
                    src={BoxingGloveR}
                    alt="Movie Boxing Logo"
                    className="w-[50px] md:w-[125px] mb-4 mx-0 "
                />
            </div>
                    <div className="flex items-center justify-center gap-4 text-neutral-500 font-bold text-[10px] md:text-[12px] tracking-[0.2em] uppercase">
                        <Link href="/movies" className="text-blue-500 hover:text-blue-400 transition-colors">Home</Link>
                        <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
                        <Link href="/movies/leaderboard" className="text-blue-500 hover:text-blue-400 transition-colors">Leaderboard</Link>
                        <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
                        <Link href="/movies/release-order" className="text-blue-500 hover:text-blue-400 transition-colors">Release Order</Link>
                    </div>
                </header>
    );
};

export default MovieCard;