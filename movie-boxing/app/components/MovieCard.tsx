import React from 'react';

export interface MovieCardProps {
    movieId: number;
    isBench: boolean;
    title: string;
    posterUrl: string | null;
    boxOffice: number;
    releaseDate: string | null;
}

// Inside MovieCard.tsx
const MovieCard: React.FC<MovieCardProps> = ({
    movieId,
    isBench,
    title,
    posterUrl,
    boxOffice,
    releaseDate,
}) => {
    const isEmpty = movieId === 0;

    let cardStyle = isEmpty
        ? 'border-neutral-800 bg-neutral-900/20 border-dashed opacity-50'
        : 'border-neutral-700 bg-neutral-800/50';

    if (releaseDate && !isEmpty) {
        const rel = new Date(releaseDate);
        if (rel <= new Date())
            cardStyle = 'border-green-500/30 bg-green-500/5';
        else if (
            rel <=
            new Date(new Date().setMonth(new Date().getMonth() + 1))
        )
            cardStyle = 'border-orange-500/30 bg-orange-500/5';
    }

    return (
        <div className={`p-4 rounded-lg border flex flex-col justify-between min-h-[160px] transition-all ${cardStyle}`}>
            <div>
                <div className="w-full aspect-[2/3] bg-neutral-950 rounded overflow-hidden flex items-center justify-center">
                    {posterUrl ? (
                        <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-[10px] uppercase font-black text-neutral-400 tracking-widest text-center px-2">
                            {isEmpty ? "Open Roster Spot" : "No Poster"}
                        </div>
                    )}
                </div>
                <div>
                    <p className={`font-bold text-xs md:text-sm line-clamp-2 mt-2 mb-1 ${isEmpty ? 'text-neutral-400 italic' : 'text-white'}`}>
                        {isEmpty ? "Unpicked Movie" : title}
                    </p>
                    <p className="text-[9px] uppercase text-neutral-400 font-bold tracking-widest">
                        {isBench ? 'Bench' : 'Starting'}
                    </p>
                </div>
            </div>

            <div className="mt-2 pt-2 border-t border-neutral-800/50">
                <p className={`text-lg font-mono font-black ${isEmpty ? 'text-neutral-400' : 'text-white'}`}>
                    {(() => {
                        const rev = boxOffice || 0;
                        if (rev >= 1000000000) {
                            return `$${(rev / 1000000000).toFixed(2)}B`;
                        }
                        return `$${(rev / 1000000).toFixed(1)}M`;
                    })()}
                </p>
            </div>
        </div>
    );
};

export default MovieCard;