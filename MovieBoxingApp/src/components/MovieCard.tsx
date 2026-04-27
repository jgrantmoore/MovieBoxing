import React from 'react';
import { View, Text, Image, Dimensions } from 'react-native';

// 1. Define the Props Interface
interface MovieCardProps {
  movieId?: number;
  isBench?: boolean;
  title?: string;
  posterUrl?: string | null;
  boxOffice?: number;
  releaseDate?: string | null;
  compact?: boolean ; // Optional prop to control compact styling
}

const { width } = Dimensions.get('window');

export const MovieCard: React.FC<MovieCardProps> = ({ 
  movieId = 0, 
  isBench = false, 
  title = "Open Slot", 
  posterUrl = null, 
  boxOffice = 0, 
  releaseDate = null ,
  compact = false
}) => {
  const isEmpty = movieId === 0;
  
  // 2. Date Logic with Type Safety
  const dateStr = (releaseDate && !isEmpty) 
    ? (releaseDate.endsWith('Z') ? releaseDate : `${releaseDate}T00:00:00Z`) 
    : null;
    
  const relDateUTC = dateStr ? new Date(dateStr) : null;

  // 3. Box Office Formatter
  const formatRevenue = (rev: number) => {
    if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(2)}B`;
    if (rev >= 1000000) return `$${(rev / 1000000).toFixed(1)}M`;
    return "$0.0";
  };

  // 4. Dynamic Border Styling
  let borderClass = "border-neutral-800 bg-neutral-900/40";
  if (relDateUTC && !isNaN(relDateUTC.getTime())) {
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(now.getMonth() + 1);

    if (relDateUTC <= now) {
      borderClass = "border-green-500/40 bg-green-500/10";
    } else if (relDateUTC <= oneMonthFromNow) {
      borderClass = "border-orange-500/40 bg-orange-500/10";
    }
  }

  return (
    <View className={`p-3 rounded-3xl border ${borderClass} mr-3`} style={compact ? { width: 110 } : { width: 120 }}>
      <View className="w-full aspect-[2/3] bg-black rounded-2xl overflow-hidden items-center justify-center relative border border-neutral-800">
        {posterUrl ? (
          <Image 
            source={{ uri: `https://image.tmdb.org/t/p/w400${posterUrl}` }} 
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="px-4">
            <Text className="text-[10px] uppercase font-black text-neutral-600 text-center tracking-widest leading-tight">
              {isEmpty ? "Open Roster Spot" : "Poster Pending"}
            </Text>
          </View>
        )}
        
        <View className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 border border-white/10">
          <Text className="text-[8px] font-black uppercase text-white tracking-widest">
            {isBench ? 'Bench' : 'Starts'}
          </Text>
        </View>
      </View>

      <View className="mt-3 h-12 flex-col justify-between">
        <Text numberOfLines={2} className={`font-black text-xs uppercase italic leading-tight ${isEmpty ? 'text-neutral-600' : 'text-white'}`}>
          {title}
        </Text>
        <Text className={`text-[9px] font-black uppercase mt-1 ${isEmpty ? 'text-neutral-700' : 'text-neutral-500'}`}>
          {relDateUTC ? relDateUTC.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : 'Release Date TBD'}
        </Text>
      </View>

      <View className="mt-2 pt-2 border-t border-neutral-800/50 flex-row justify-between items-center">
        <Text className={`font-mono font-black text-sm ${isEmpty ? 'text-neutral-700' : 'text-white'}`}>
          {formatRevenue(boxOffice)}
        </Text>
        {/* Optional: Add a small calendar icon or date text here if you want to mirror the web version more closely */}
      </View>
    </View>
  );
};