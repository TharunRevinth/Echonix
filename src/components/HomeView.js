import React, { useState, useEffect } from 'react';
import { 
  Play, MoreVertical, Heart, Flame, Trophy, Star, Clock, ListMusic, 
  Sparkles, Zap, History, TrendingUp, Music2, Headphones, Activity,
  Sun, Sunset, Moon
} from 'lucide-react';

const HomeView = ({ 
  recentlyPlayed, trendingTracks, playTrack, getImageUrl, formatTime, toggleLike, likedSongs, 
  handleSearch, setQuery, trendingPlaylists, fetchPlaylist, 
  ytmusicPlaylists, ytmusicHome, isYtmusicLoading, username = 'Tharun'
}) => {
  const [greeting, setGreeting] = useState('');
  const [greetingIcon, setGreetingIcon] = useState(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
      setGreetingIcon(<Sun className="text-yellow-400 w-8 h-8" />);
    } else if (hour < 17) {
      setGreeting('Good afternoon');
      setGreetingIcon(<Sunset className="text-orange-400 w-8 h-8" />);
    } else {
      setGreeting('Good evening');
      setGreetingIcon(<Moon className="text-accent-purple w-8 h-8" />);
    }
  }, []);

  const moodChips = [
    { label: 'Trending', search: 'trending hits' },
    { label: 'Chill', search: 'chill lo-fi' },
    { label: 'Party', search: 'party dance hits' },
    { label: 'Romance', search: 'romantic songs' },
    { label: 'Workout', search: 'workout energy' },
    { label: 'Night', search: 'night vibes' },
  ];

  const stats = [
    { label: 'Songs Played', value: recentlyPlayed.length || 0, icon: Music2 },
    { label: 'Liked Tracks', value: likedSongs.length || 0, icon: Heart },
    { label: 'History Sync', value: 'Active', icon: Activity },
  ];

  const onChipClick = (term) => {
    setQuery(term);
    handleSearch({ preventDefault: () => {} });
  };

  // Find "Listen Again" or similar from ytmusicHome
  const listenAgain = ytmusicHome?.find(s => s.title?.toLowerCase().includes('listen again') || s.title?.toLowerCase().includes('quick picks'));
  const otherSections = ytmusicHome?.filter(s => s !== listenAgain) || [];

  return (
    <div className="space-y-16 pb-32 pt-4">
      {/* 1. Dynamic Greeting & Stats */}
      <section className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              {greetingIcon}
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                {greeting}, <span className="gradient-text">{username}</span>
              </h2>
            </div>
            <p className="text-text-secondary font-bold text-sm tracking-wide opacity-80 pl-12">
              "Here's your vibe for {greeting.toLowerCase().split(' ')[1]} — let's make it musical."
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/[0.03] p-4 rounded-3xl border border-white/5 backdrop-blur-md">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col items-center px-4 border-r border-white/5 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-3 h-3 text-accent-purple" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{s.label}</span>
                </div>
                <p className="text-sm font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Chips */}
        <div className="flex items-center gap-3 mt-10 overflow-x-auto pb-4 hide-scrollbar">
          {moodChips.map((chip, i) => (
            <button
              key={i}
              onClick={() => onChipClick(chip.search)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-accent-purple/30 transition-all whitespace-nowrap group active:scale-95"
            >
              <span className="text-xs font-black text-white/70 group-hover:text-white uppercase tracking-widest">{chip.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Hero Section (Last Played / Featured) */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <section className="relative group">
          <div className="absolute inset-0 -mx-10 opacity-20 group-hover:opacity-30 transition-opacity duration-1000 pointer-events-none">
            <img src={getImageUrl(recentlyPlayed[0])} alt="" className="w-full h-full object-cover blur-[100px] scale-150" />
          </div>

          <div 
            onClick={() => playTrack(recentlyPlayed[0], recentlyPlayed)}
            className="relative h-[380px] rounded-[56px] overflow-hidden border border-white/10 flex flex-col justify-end p-10 md:p-16 cursor-pointer group/hero shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/40 to-transparent z-10" />
            <img 
              src={getImageUrl(recentlyPlayed[0])} 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover group-hover/hero:scale-105 transition-transform duration-[3s]" 
            />
            
            <div className="relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-4 py-1.5 rounded-full bg-accent-purple text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-glow-purple">Featured Mix</div>
                  <div className="flex items-center gap-1.5 text-accent-teal">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Based on your history</span>
                  </div>
                </div>
                <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 leading-tight group-hover/hero:gradient-text transition-all duration-500">
                  {recentlyPlayed[0].title}
                </h3>
                <p className="text-xl md:text-2xl font-bold text-white/60 mb-8">{recentlyPlayed[0].uploaderName}</p>
                
                <div className="flex items-center gap-4">
                  <button className="px-10 py-4 rounded-full bg-white text-black font-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-glow-white">
                    <Play className="fill-current w-5 h-5" /> PLAY NOW
                  </button>
                  <button className="p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all">
                    <Heart className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="hidden lg:block w-64 h-64 rounded-[48px] overflow-hidden border-4 border-white/10 shadow-2xl group-hover/hero:scale-110 transition-transform duration-700">
                <img src={getImageUrl(recentlyPlayed[0])} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Jump Back In Row */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-10 section-accent">
            <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 italic">
              <History className="w-7 h-7 text-accent-purple" /> JUMP BACK IN
            </h3>
            <div className="h-px flex-1 bg-white/5 mx-8 hidden md:block" />
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Your Evolution</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {recentlyPlayed.slice(1, 7).map((track, i) => (
              <div 
                key={track.id || i} 
                onClick={() => playTrack(track, recentlyPlayed)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-square rounded-[40px] overflow-hidden mb-5 neon-card shadow-2xl">
                  <img src={getImageUrl(track)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[3px]">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                      <Play className="text-black fill-black w-6 h-6 ml-1" />
                    </div>
                  </div>
                  {/* Dominant Color Glow Placeholder */}
                  <div className="absolute inset-0 bg-accent-purple/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-accent-purple transition-colors px-2 leading-tight">{track.title}</h4>
                <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1.5 opacity-40 truncate px-2">{track.uploaderName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Listen Again / Quick Picks from YT Music */}
      {listenAgain && (
        <section>
          <div className="flex items-center justify-between mb-10 section-accent">
            <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 italic">
              <Zap className="w-7 h-7 text-accent-teal" /> {listenAgain.title?.toUpperCase()}
            </h3>
            <div className="h-px flex-1 bg-white/5 mx-8 hidden md:block" />
            <button 
              onClick={() => onChipClick(listenAgain.title)}
              className="text-[10px] font-black text-accent-teal uppercase tracking-[0.3em] hover:text-white transition-colors"
            >
              See All
            </button>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-6">
            {listenAgain.contents?.slice(0, 8).map((track, i) => (
              <div 
                key={i} 
                onClick={() => playTrack({
                  id: track.videoId,
                  title: track.title,
                  uploaderName: track.artists?.map(a => a.name).join(', ') || 'Unknown',
                  thumbnail: track.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || '',
                  duration: track.duration_seconds || 0,
                  isYTMusic: true
                }, listenAgain.contents)}
                className="group flex items-center justify-between p-4 rounded-[32px] hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all cursor-pointer shadow-sm hover:shadow-2xl"
              >
                <div className="flex items-center gap-5">
                  <div className="text-sm font-black text-white/20 w-4 group-hover:text-accent-teal transition-colors">{(i + 1).toString().padStart(2, '0')}</div>
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/5 shadow-lg shrink-0">
                    <img src={getImageUrl(track.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || track)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="text-white fill-white w-6 h-6 ml-1" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-accent-teal transition-colors line-clamp-1 tracking-tight">{track.title}</h4>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1 opacity-60">{track.artists?.map(a => a.name).join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-[10px] font-mono font-black text-text-secondary/40">{track.duration || ''}</span>
                  <Heart 
                    className="w-5 h-5 text-text-secondary/20 hover:text-white transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Trending Playlists Row */}
      <section>
        <div className="flex items-center justify-between mb-10 section-accent">
          <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 italic">
            <TrendingUp className="w-7 h-7 text-accent-purple" /> TRENDING PLAYLISTS
          </h3>
          <div className="h-px flex-1 bg-white/5 mx-8 hidden md:block" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {ytmusicPlaylists && ytmusicPlaylists.slice(0, 12).map((playlist) => (
            <div 
              key={playlist.playlistId} 
              onClick={() => fetchPlaylist(playlist.playlistId)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-square rounded-[48px] overflow-hidden mb-5 border border-white/5 shadow-2xl bg-white/[0.02]">
                <img src={getImageUrl(playlist.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || playlist)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[4px]">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                    <Play className="text-black fill-black w-8 h-8 ml-1" />
                  </div>
                </div>
              </div>
              <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-accent-purple transition-colors px-2 leading-tight tracking-tight">{playlist.title}</h4>
              <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1.5 opacity-40 px-2">
                {playlist.count || playlist.itemCount} Tracks
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Trending Playlists Row */}
      {otherSections.map((section, idx) => (
        <section key={idx}>
          <div className="flex items-center justify-between mb-10 section-accent">
            <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">{section.title}</h3>
            <div className="h-px flex-1 bg-white/5 mx-8 hidden md:block" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {section.contents?.map((item, i) => {
              if (!item) return null;
              return (
                <div 
                  key={item.playlistId || item.videoId || i} 
                  onClick={() => item.playlistId ? fetchPlaylist(item.playlistId) : playTrack({
                    id: item.videoId,
                    title: item.title,
                    uploaderName: item.artists?.map(a => a.name).join(', ') || 'Unknown',
                    thumbnail: item.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || '',
                    duration: item.duration_seconds || 0,
                    isYTMusic: true
                  })}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square rounded-[40px] overflow-hidden mb-5 border border-white/5 shadow-2xl bg-white/[0.03]">
                    <img src={getImageUrl(item.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || item)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500 backdrop-blur-[3px]">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                        <Play className="text-black fill-black w-6 h-6 ml-1" />
                      </div>
                    </div>
                  </div>
                  <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-accent-purple transition-colors px-2 leading-tight">{item.title}</h4>
                  <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1.5 opacity-40 px-2 truncate">
                    {item.playlistId ? 'Playlist' : (item.artists?.map(a => a.name).join(', ') || 'Track')}
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
