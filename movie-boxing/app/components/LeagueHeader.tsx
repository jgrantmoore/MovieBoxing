'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export interface LeagueHeaderProps {
    leagueName?: string;
}

const LeagueHeader: React.FC<LeagueHeaderProps> = ({
    leagueName,
}) => {

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <div>
            <h1 className="text-4xl font-bold text-center mt-8 text-white p-4 tracking-tighter md:p-12 font-sans uppercase">{leagueName}</h1>
        </div>
    );
};

export default LeagueHeader;
