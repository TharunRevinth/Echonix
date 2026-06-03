import React from 'react';
import { Play, MoreVertical, Heart, Flame, Trophy, Star } from 'lucide-react';

const HomeView = ({ recentlyPlayed, trendingTracks, playTrack, getImageUrl, formatTime, toggleLike, likedSongs, handleSearch, setQuery, trendingPlaylists, fetchPlaylist }) => {
  const featured = [
    { 
      title: 'BEST OF 2024', 
      artist: 'Year in Review', 
      bg: 'bg-gradient-to-br from-accent-purple to-accent-blue', 
      icon: Trophy,
      search: 'best songs 2024'
    },
    { 
      title: 'BEST OF 2025', 
      artist: 'Current Hits', 
      bg: 'bg-gradient-to-br from-accent-teal to-accent-purple', 
      icon: Star,
      search: 'best songs 2025'
    },
    { 
      title: 'TRENDING 2026', 
      artist: 'Future Vibes', 
      bg: 'bg-gradient-to-br from-warm-red to-cassette-orange', 
      icon: Flame,
      search: 'trending music 2026'
    },
  ];

  const onFeaturedClick = (term) => {
    setQuery(term);
    handleSearch({ preventDefault: () => {} });
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Featured Grid */}
      <section>
        <h3 className="text-2xl font-black text-white mb-8 tracking-tight">Curated Collections</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {featured.map((f, i) => {
            const Icon = f.icon;
            return (
              <div 
                key={i} 
                onClick={() => onFeaturedClick(f.search)}
                className={`
                  h-[240px] rounded-[32px] p-8 flex flex-col justify-between 
                  neon-card cursor-pointer group relative overflow-hidden
                `}
              >
                {/* Background Pattern */}
                <div className={`absolute inset-0 ${f.bg} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon size={160} />
                </div>

                <div className="relative z-10 flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <Icon className="text-white w-6 h-6" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-accent-purple flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-glow-purple">
                    <Play className="text-white fill-white w-4 h-4 ml-0.5" />
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="text-3xl font-black text-white tracking-tighter mb-1">{f.title}</h4>
                  <p className="text-text-secondary font-semibold uppercase tracking-widest text-xs">{f.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* YouTube Music Trends by Region */}
      {trendingPlaylists && !Array.isArray(trendingPlaylists) && Object.entries(trendingPlaylists).map(([region, playlists]) => (
        <section key={region}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white tracking-tight">{region} Trends</h3>
            <button 
              onClick={() => onFeaturedClick(`top ${region.toLowerCase()} music 2026`)}
              className="text-xs font-bold uppercase tracking-widest text-accent-purple hover:text-white transition-colors"
            >
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {playlists.map((playlist) => (
              <div 
                key={playlist.id} 
                onClick={() => fetchPlaylist(playlist.id)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-square rounded-[28px] overflow-hidden mb-4 border border-white/5 shadow-2xl">
                  <img src={getImageUrl(playlist)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="text-black fill-black w-5 h-5 ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-accent-purple transition-colors">{playlist.title}</h4>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 opacity-60">{playlist.videoCount} Tracks</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Legacy support for flat array if needed */}
      {trendingPlaylists && Array.isArray(trendingPlaylists) && trendingPlaylists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white tracking-tight">YouTube Music Trends</h3>
            <button className="text-xs font-bold uppercase tracking-widest text-accent-purple hover:text-white transition-colors">Browse all</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {trendingPlaylists.map((playlist) => (
              <div 
                key={playlist.id} 
                onClick={() => fetchPlaylist(playlist.id)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-square rounded-[32px] overflow-hidden mb-4 border border-white/5 shadow-2xl">
                  <img src={getImageUrl(playlist)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="text-black fill-black w-5 h-5 ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-accent-purple transition-colors">{playlist.title}</h4>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{playlist.videoCount} Tracks • {playlist.author}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-white tracking-tight">Trending Music</h3>
          <button 
            onClick={() => onFeaturedClick('trending official audio')}
            className="text-xs font-bold uppercase tracking-widest text-accent-purple hover:text-white transition-colors"
          >
            See all
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2">
          {trendingTracks && trendingTracks.length > 0 ? trendingTracks.slice(0, 12).map((track, i) => {
            const isLiked = likedSongs.find(s => s.url === track.url);
            return (
              <div 
                key={i} 
                onClick={() => playTrack(track, trendingTracks)}
                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-[18px] overflow-hidden border border-white/5">
                    <img src={getImageUrl(track)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="text-white fill-white w-6 h-6 ml-1" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-accent-purple transition-colors line-clamp-1">{track.title}</h4>
                    <p className="text-xs text-text-secondary font-medium mt-0.5">{track.uploaderName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <Heart 
                    onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                    className={`w-5 h-5 transition-all ${isLiked ? 'text-accent-purple fill-accent-purple' : 'text-text-secondary/40 hover:text-white'}`} 
                  />
                  <span className="text-[10px] font-mono text-text-secondary/60 w-10 text-right">{formatTime(track.duration || 0)}</span>
                  <button className="text-text-secondary/20 hover:text-white">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
              <p className="text-text-secondary font-bold uppercase tracking-widest">Awaiting Transmission...</p>
              <p className="text-[10px] text-text-secondary/40 mt-2 uppercase tracking-tighter">Connecting to Global Charts</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomeView;
