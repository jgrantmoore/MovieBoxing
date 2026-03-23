import React from 'react';

export interface MovieCardProps {
    movieId?: number;       // Optional: helps handle "Open Slot" logic
    isBench?: boolean;     // Optional: defaults to false in the component
    title?: string;        // Optional: for "Unpicked Movie" placeholders
    posterUrl?: string | null;
    boxOffice?: number;
    releaseDate?: string | null;
}

// Inside MovieCard.tsx
const MovieCard: React.FC<MovieCardProps> = ({
    movieId = 0,            // Default to 0 if missing
    isBench = false,
    title = "Open Slot",    // Fallback title
    posterUrl = null,
    boxOffice = 0,          // Default to 0 for calculations
    releaseDate = null,
}) => {
    const isEmpty = movieId === 0;

    // Use a default style if releaseDate is missing
    let cardStyle = isEmpty
        ? 'border-neutral-800 bg-neutral-900/20 border-dashed opacity-50'
        : 'border-neutral-700 bg-neutral-800/50';

    // Safe Check for releaseDate
    if (releaseDate && !isEmpty) {
        try {
            const rel = new Date(releaseDate);
            const now = new Date();
            const oneMonthFromNow = new Date();
            oneMonthFromNow.setMonth(now.getMonth() + 1);

            if (rel <= now) {
                cardStyle = 'border-green-500/40 bg-green-500/10 shadow-[0_0_15px_-5px_rgba(34,197,94,0.2)]';
            } else if (rel <= oneMonthFromNow) {
                cardStyle = 'border-orange-500/40 bg-orange-500/10 shadow-[0_0_15px_-5px_rgba(249,115,22,0.2)]';
            }
        } catch (e) {
            console.error("Invalid date passed to MovieCard:", releaseDate);
        }
    }

    return (
        <div className={`p-4 rounded-3xl border flex flex-col justify-between min-h-[220px] transition-all duration-300 group hover:scale-[1.02] ${cardStyle}`}>
            <div>
                <div className="w-full aspect-[2/3] bg-neutral-950 rounded-2xl overflow-hidden flex items-center justify-center relative border border-neutral-800/50">
                    {posterUrl ? (
                        <img src={posterUrl} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                        <div className="text-[10px] uppercase font-black text-neutral-600 tracking-widest text-center px-4 leading-tight">
                            {isEmpty ? "Open Roster Spot" : "Poster Pending"}
                        </div>
                    )}
                    
                    {/* Badge for Bench vs Starting */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase tracking-widest">
                        {isBench ? 'Bench' : 'Start'}
                    </div>
                </div>
                
                <div className="mt-4">
                    <p className={`font-black text-xs md:text-sm uppercase italic leading-tight line-clamp-2 ${isEmpty ? 'text-neutral-600' : 'text-white'}`}>
                        {title}
                    </p>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/50 flex items-center justify-between">
                <p className={`text-lg font-mono font-black tracking-tighter ${isEmpty ? 'text-neutral-700' : 'text-white'}`}>
                    {(() => {
                        const rev = boxOffice || 0;
                        if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(2)}B`;
                        if (rev >= 1000000) return `$${(rev / 1000000).toFixed(1)}M`;
                        if (rev > 0) return `$${(rev / 1000).toFixed(0)}K`;
                        return "$0.0";
                    })()}
                </p>
            </div>
        </div>
    );
};

export default MovieCard;