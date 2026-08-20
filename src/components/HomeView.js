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
  setCurrentView, viewArtist, onOpenSettings
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

  const hasYtmusicData = ytmusicHome && ytmusicHome.length > 0;

  if (isYtmusicLoading) {
    return (
      <div className="space-y-8 pb-32 pt-4 px-2 lg:px-6 view-transition">
        {/* Skeleton greeting */}
        <div className="h-8 w-48 bg-white/5 rounded-md animate-pulse" />
        
        {/* Skeleton Mood chips */}
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-20 bg-white/5 rounded-full shrink-0 animate-pulse" />
          ))}
        </div>

        {/* Skeleton Quick Access Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center bg-white/5 border border-white/5 h-16 lg:h-20 rounded-md animate-pulse">
              <div className="w-12 h-12 lg:w-20 lg:h-20 bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2 px-3">
                <div className="h-3 w-3/4 bg-white/10 rounded" />
                <div className="h-2 w-1/2 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Card Grid */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3 animate-pulse">
                <div className="aspect-square w-full bg-white/10 rounded-md mb-4" />
                <div className="h-3 w-3/4 bg-white/10 rounded" />
                <div className="h-2.5 w-1/2 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 pt-4 px-2 lg:px-6 view-transition">
      {/* YTMusic Connection CTA Banner */}
      {!hasYtmusicData && (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0A0A0A] to-[#121212] p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <h3 className="text-xl lg:text-2xl font-bold-700 text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              Connect YouTube Music
            </h3>
            <p className="text-sm text-text-subdued max-w-xl font-semibold-600">
              Synchronize your personal history, favorite artists, customized mixtapes, and private playlists directly into Echonix.
            </p>
          </div>
          <button 
            onClick={() => {
              if (onOpenSettings) {
                onOpenSettings();
              } else {
                setCurrentView('settings'); // Fallback or route if available
              }
            }}
            className="shrink-0 px-6 py-3 rounded-full bg-white text-black font-bold-700 text-sm hover:scale-105 active:scale-95 transition-all shadow-lg self-start md:self-auto relative z-10"
          >
            Setup Connection
          </button>
        </div>
      )}

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
      {listenAgain && listenAgain.contents && listenAgain.contents.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-xl lg:text-2xl font-bold-700 text-white tracking-tight hover:underline cursor-pointer">
              {listenAgain.title}
            </h3>
            <span onClick={() => setCurrentView('ytmusic-history')} className="text-[10px] font-bold text-text-subdued hover:underline cursor-pointer uppercase tracking-widest">Show all</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {listenAgain.contents.slice(0, 6).map((track, i) => {
              if (!track) return null;
              const thumb = Array.isArray(track.thumbnails) 
                ? track.thumbnails.slice().sort((a,b) => (b?.width || 0) - (a?.width || 0))[0]?.url 
                : (track.thumbnail || '');
              return (
                <div 
                  key={track.videoId || track.id || i} 
                  onClick={() => playTrack({
                    id: track.videoId || track.id,
                    videoId: track.videoId || track.id,
                    title: track.title,
                    uploaderName: track.artists?.map(a => a?.name || '').filter(Boolean).join(', ') || 'Unknown',
                    artists: track.artists?.map(a => ({ name: a?.name, id: a?.id || a?.browseId })) || [],
                    thumbnail: thumb,
                    duration: track.duration_seconds || 0,
                    isYTMusic: true
                  }, listenAgain.contents.filter(Boolean))}
                  className="spotify-card group cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                    <img src={getImageUrl(thumb || track)} alt="" className="w-full h-full object-cover" />
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
              );
            })}
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
            {ytmusicPlaylists.slice(0, 6).map((playlist, idx) => {
              if (!playlist) return null;
              const thumb = Array.isArray(playlist.thumbnails) 
                ? playlist.thumbnails.slice().sort((a,b) => (b?.width || 0) - (a?.width || 0))[0]?.url 
                : (playlist.thumbnail || '');
              return (
                <div 
                  key={playlist.playlistId || playlist.id || idx} 
                  onClick={() => fetchPlaylist(playlist.playlistId || playlist.id)}
                  className="spotify-card group cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                    <img src={getImageUrl(thumb || playlist)} alt="" className="w-full h-full object-cover" />
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
              );
            })}
          </div>
        </section>
      )}

      {/* Other Sections */}
      {otherSections.map((section, idx) => {
        if (!section || !section.contents || section.contents.length === 0) return null;
        return (
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
              {(expandedSections[idx] ? section.contents : section.contents.slice(0, 6)).map((item, i) => {
                if (!item) return null;
                const thumb = Array.isArray(item.thumbnails) 
                  ? item.thumbnails.slice().sort((a,b) => (b?.width || 0) - (a?.width || 0))[0]?.url 
                  : (item.thumbnail || '');
                return (
                  <div 
                    key={item.playlistId || item.videoId || item.id || i} 
                    onClick={() => {
                      if (item.playlistId) {
                        fetchPlaylist(item.playlistId);
                      } else if (item.browseId) {
                        viewArtist(item.title, item.browseId);
                      } else if (item.videoId || item.id) {
                        playTrack({
                          id: item.videoId || item.id,
                          videoId: item.videoId || item.id,
                          title: item.title,
                          uploaderName: item.artists?.map(a => a?.name || '').filter(Boolean).join(', ') || 'Unknown',
                          artists: item.artists?.map(a => ({ name: a?.name, id: a?.id || a?.browseId })) || [],
                          thumbnail: thumb,
                          duration: item.duration_seconds || 0,
                          isYTMusic: true
                        });
                      }
                    }}
                    className="spotify-card group cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                      <img src={getImageUrl(thumb || item)} alt="" className="w-full h-full object-cover" />
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
        );
      })}
    </div>
  );
};

export default HomeView;
