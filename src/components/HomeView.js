import React, { useState, useEffect } from 'react';
import { 
  Play, MoreVertical, Heart, Flame, Trophy, Star, Clock, ListMusic, 
  Sparkles, Zap, History, TrendingUp, Music2, Headphones, Activity,
  Sun, Sunset, Moon
} from 'lucide-react';
import { renderArtists } from '../utils';

const HomeView = ({ 
  recentlyPlayed, trendingTracks, playTrack, getImageUrl, formatTime, toggleLike, likedSongs, 
  handleSearch, setQuery, trendingPlaylists, fetchPlaylist, 
  ytmusicPlaylists, ytmusicHome, isYtmusicLoading, username = 'Tharun', greeting,
  setCurrentView, viewArtist
}) => {

  const [expandedSections, setExpandedSections] = useState({});
  const toggleSection = (idx) => {
    setExpandedSections(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const moodChips = [
    { label: 'Trending', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { label: 'Chill', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { label: 'Party', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    { label: 'Romance', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { label: 'Workout', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    { label: 'Night', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ];

  const onChipClick = (term) => {
    setQuery(term);
    handleSearch({ preventDefault: () => {} });
  };

  // Find "Listen Again" or similar from ytmusicHome
  const listenAgain = ytmusicHome?.find(s => s.title?.toLowerCase().includes('listen again') || s.title?.toLowerCase().includes('quick picks'));
  const otherSections = ytmusicHome?.filter(s => s !== listenAgain) || [];

  return (
    <div className="space-y-8 pb-32 pt-4 px-2 lg:px-6 view-transition">
      {/* 1. Dynamic Greeting & Stats */}
      <section className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold-700 text-white tracking-tight flex items-center gap-3">
          {greeting}
        </h2>
      </section>

      {/* 2. Top Quick Access Grid (First 6-8 recently played) */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 mb-8">
          {recentlyPlayed.slice(0, 8).map((track, i) => (
            <div 
              key={track.id || i} 
              onClick={() => playTrack(track, recentlyPlayed)}
              className="flex items-center bg-white/5 hover:bg-white/10 transition-all rounded-md overflow-hidden cursor-pointer group shadow-sm"
            >
              <div className="w-12 h-12 lg:w-20 lg:h-20 shrink-0 shadow-lg relative">
                <img src={getImageUrl(track)} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 px-3">
                <h4 className="font-bold-700 text-white text-xs lg:text-sm truncate">{track.title}</h4>
              </div>
              <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                <div className="w-10 h-10 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                  <Play className="text-black fill-black w-5 h-5 ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Mood Chips */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
        {moodChips.map((chip, i) => (
          <button
            key={i}
            onClick={() => onChipClick(chip.label)}
            className={`px-4 py-1.5 rounded-full border text-sm font-semibold-600 transition-all hover:scale-105 whitespace-nowrap ${chip.color}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 3. Jump Back In Row */}
      {recentlyPlayed && recentlyPlayed.length > 8 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-xl lg:text-2xl font-bold-700 text-white tracking-tight hover:underline cursor-pointer">
              Jump back in
            </h3>
            <span onClick={() => setCurrentView('history')} className="text-[10px] font-bold text-text-subdued hover:underline cursor-pointer uppercase tracking-widest">Show all</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {recentlyPlayed.slice(8, 14).map((track, i) => (
              <div 
                key={track.id || i} 
                onClick={() => playTrack(track, recentlyPlayed)}
                className="spotify-card group cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                  <img src={getImageUrl(track)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <div className="w-12 h-12 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                      <Play className="text-black fill-black w-5 h-5 ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="font-bold-700 text-white text-sm truncate mb-1">{track.title}</h4>
                <p className="text-xs text-text-subdued font-semibold-600 line-clamp-2">
                  {renderArtists(track, viewArtist)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Listen Again / Quick Picks */}
      {listenAgain && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-xl lg:text-2xl font-bold-700 text-white tracking-tight hover:underline cursor-pointer">
              {listenAgain.title}
            </h3>
            <span onClick={() => setCurrentView('ytmusic-history')} className="text-[10px] font-bold text-text-subdued hover:underline cursor-pointer uppercase tracking-widest">Show all</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {listenAgain.contents?.slice(0, 6).map((track, i) => (
              <div 
                key={i} 
                onClick={() => playTrack({
                  id: track.videoId,
                  title: track.title,
                  uploaderName: track.artists?.map(a => a.name).join(', ') || 'Unknown',
                  artists: track.artists?.map(a => ({ name: a.name, id: a.id || a.browseId })) || [],
                  thumbnail: track.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || '',
                  duration: track.duration_seconds || 0,
                  isYTMusic: true
                }, listenAgain.contents)}
                className="spotify-card group cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                  <img src={getImageUrl(track.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || track)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <div className="w-12 h-12 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                      <Play className="text-black fill-black w-5 h-5 ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="font-bold-700 text-white text-sm truncate mb-1">{track.title}</h4>
                <p className="text-xs text-text-subdued font-semibold-600 line-clamp-2">
                  {renderArtists(track, viewArtist)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Trending Playlists Row */}
      {ytmusicPlaylists && ytmusicPlaylists.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-xl lg:text-2xl font-bold-700 text-white tracking-tight hover:underline cursor-pointer">
              Made for you
            </h3>
            <span onClick={() => setCurrentView('library')} className="text-[10px] font-bold text-text-subdued hover:underline cursor-pointer uppercase tracking-widest">Show all</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {ytmusicPlaylists.slice(0, 6).map((playlist) => (
              <div 
                key={playlist.playlistId} 
                onClick={() => fetchPlaylist(playlist.playlistId)}
                className="spotify-card group cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                  <img src={getImageUrl(playlist.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || playlist)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <div className="w-12 h-12 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                      <Play className="text-black fill-black w-5 h-5 ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="font-bold-700 text-white text-sm truncate mb-1">{playlist.title}</h4>
                <p className="text-xs text-text-subdued font-semibold-600 line-clamp-2">
                  Playlist • Echonix
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Other Sections */}
      {otherSections.map((section, idx) => (
        <section key={idx}>
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-xl lg:text-2xl font-bold-700 text-white tracking-tight hover:underline cursor-pointer">
              {section.title}
            </h3>
            <span onClick={() => toggleSection(idx)} className="text-[10px] font-bold text-text-subdued hover:underline cursor-pointer uppercase tracking-widest">
              {expandedSections[idx] ? 'Show less' : 'Show all'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {(expandedSections[idx] ? section.contents : section.contents?.slice(0, 6))?.map((item, i) => {
              if (!item) return null;
              return (
                <div 
                  key={item.playlistId || item.videoId || i} 
                  onClick={() => {
                    if (item.playlistId) {
                      fetchPlaylist(item.playlistId);
                    } else if (item.browseId) {
                      viewArtist(item.title, item.browseId);
                    } else if (item.videoId) {
                      playTrack({
                        id: item.videoId,
                        title: item.title,
                        uploaderName: item.artists?.map(a => a.name).join(', ') || 'Unknown',
                        artists: item.artists?.map(a => ({ name: a.name, id: a.id || a.browseId })) || [],
                        thumbnail: item.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || '',
                        duration: item.duration_seconds || 0,
                        isYTMusic: true
                      });
                    }
                  }}
                  className="spotify-card group cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                    <img src={getImageUrl(item.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || item)} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <div className="w-12 h-12 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                        <Play className="text-black fill-black w-5 h-5 ml-1" />
                      </div>
                    </div>
                  </div>
                  <h4 className="font-bold-700 text-white text-sm truncate mb-1">{item.title}</h4>
                  <p className="text-xs text-text-subdued font-semibold-600 line-clamp-2">
                    {item.playlistId ? 'Playlist' : renderArtists(item, viewArtist)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default HomeView;
