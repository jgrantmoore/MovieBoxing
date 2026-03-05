import React from 'react';

export interface MovieCardProps {
    playerName: string;
    movieId: string;
    isBench: boolean;
    details: any;
    isSelected: boolean;
    isEditing: boolean;
    selectedForExchange: { id: string; isBench: boolean } | null;
    setSwapping: React.Dispatch<
        React.SetStateAction<
            { playerName: string; movieId: string; isBench: boolean } | null
        >
    >;
    handleExchange: (
        playerName: string,
        movieId: string,
        isBench: boolean
    ) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({
    playerName,
    movieId,
    isBench,
    details,
    isSelected,
    isEditing,
    selectedForExchange,
    setSwapping,
    handleExchange,
}) => {
    // compute style based on release date and selection state
    let cardStyle =
        isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-900/10'
            : 'border-neutral-700 bg-neutral-800/50';

    if (details?.release_date && !isSelected) {
        const rel = new Date(details.release_date);
        if (rel <= new Date())
            cardStyle = 'border-green-500/30 bg-green-500/5';
        else if (
            rel <=
            new Date(new Date().setMonth(new Date().getMonth() + 1))
        )
            cardStyle = 'border-orange-500/30 bg-orange-500/5';
    }

    return (
        <div
            className={`p-4 rounded-lg border flex flex-col justify-between min-h-[160px] transition-all ${cardStyle}`}
        >
            <div className="">
                <div className="w-full aspect-[2/3] bg-neutral-900 rounded overflow-hidden">
                    {details?.poster_path ? (
                        <img
                            src={`https://image.tmdb.org/t/p/w400${details.poster_path}`}
                            alt={details?.title || 'Movie Poster'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                            No Image
                        </div>
                    )}
                </div>
                <div>
                    <p className="font-bold text-xs md:text-sm line-clamp-2 h-8.8 mt-1 mb-1">
                        <a
                            target="_blank"
                            className="hover:text-blue-300 hover:underline"
                            href={`https://www.themoviedb.org/movie/${movieId}`}
                        >
                            {details?.title || 'Loading...'}
                        </a>
                    </p>
                    <p className="text-[9px] uppercase text-neutral-500 font-bold">
                        {isBench ? 'Bench' : 'Starting'}
                    </p>
                </div>
            </div>
            <div className="mt-1 pt-1 border-t border-neutral-800/50">
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() =>
                                setSwapping({
                                    playerName,
                                    movieId,
                                    isBench,
                                })
                            }
                            className="bg-white text-black text-[9px] font-black py-1.5 rounded"
                        >
                            REPLACE
                        </button>
                        <button
                            onClick={() => handleExchange(playerName, movieId, isBench)}
                            className={`text-[9px] font-black py-1.5 rounded ${
                                isSelected ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                        >
                            {isSelected
                                ? 'CANCEL'
                                : selectedForExchange
                                ? 'CONFIRM'
                                : 'SWAP'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <p className="text-lg font-mono font-bold">
                            {(() => {
                                const rev = details?.revenue || 0;
                                if (rev >= 1000000000) {
                                    return `$${(rev / 1000000000).toFixed(2)}B`;
                                }
                                return `$${(rev / 1000000).toFixed(1)}M`;
                            })()}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                            {details?.release_date || 'TBD'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieCard;