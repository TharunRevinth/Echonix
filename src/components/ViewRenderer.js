import React from 'react';
import HomeView from './HomeView';
import { Search, Radio, Download, Plus, Play, Cpu, Mic2, Heart, Music2, Clock, Sparkles, ListMusic } from 'lucide-react';

const ViewRenderer = ({ 
  currentView, searchResults, handleSearch, query, setQuery, isAiMode, setIsAiMode, isAiLoading,
  playTrack, getImageUrl, formatTime, recentlyPlayed, likedSongs, toggleLike, handleDownload, addToQueue,
  radioStations, isRadioLoading, radioQuery, setRadioQuery, fetchRadioStations, playRadioStation,
  setIsMixtapeView, isMixtapeView, queue, currentIndex, setQueue, setCurrentIndex,
  lyrics, currentTime, lyricsRef,
  playlistData, isPlaylistLoading, trendingPlaylists, trendingTracks, fetchPlaylist,
  searchType, setSearchType,
  ytmusicPlaylists, ytmusicHistory, ytmusicHome, isYtmusicLoading, username
}) => {
  switch (currentView) {
    case 'home':
      return <HomeView 
        recentlyPlayed={recentlyPlayed} 
        trendingTracks={trendingTracks} 
        playTrack={playTrack} 
        getImageUrl={getImageUrl} 
        formatTime={formatTime} 
        toggleLike={toggleLike} 
        likedSongs={likedSongs} 
        handleSearch={handleSearch} 
        setQuery={setQuery} 
        trendingPlaylists={trendingPlaylists} 
        fetchPlaylist={fetchPlaylist} 
        ytmusicPlaylists={ytmusicPlaylists}
        ytmusicHome={ytmusicHome}
        isYtmusicLoading={isYtmusicLoading}
        username={username}
      />;

    case 'library':
      return (
        <section className="pb-24">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white">Your YouTube Music Library</h3>
            <button 
              onClick={() => setIsMixtapeView(true)}
              className="px-6 py-2 rounded-full bg-accent-teal text-white font-bold text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:scale-105 transition-all"
            >
              Generate Mixtape
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
            {/* Liked Songs Shortcut */}
            <div onClick={() => playTrack(likedSongs[0], likedSongs)} className="group cursor-pointer">
              <div className="relative aspect-square rounded-3xl overflow-hidden mb-3 border border-accent-purple/20 bg-gradient-to-br from-accent-purple to-accent-blue shadow-2xl flex items-center justify-center">
                <Heart className="w-16 h-16 text-white fill-white" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <Play className="text-white fill-white w-12 h-12" />
                </div>
              </div>
              <h4 className="font-bold text-white text-sm">Liked Songs</h4>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{likedSongs.length} Tracks</p>
            </div>

            {/* Playlists */}
            {ytmusicPlaylists.map((p, i) => (
              <div key={p.playlistId || i} onClick={() => fetchPlaylist(p.playlistId)} className="group cursor-pointer">
                <div className="relative aspect-square rounded-3xl overflow-hidden mb-3 border border-white/5 shadow-2xl">
                  <img src={getImageUrl(p.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || p)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <Play className="text-white fill-white w-8 h-8" />
                  </div>
                </div>
                <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-accent-purple transition-colors">{p.title}</h4>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{p.count || p.itemCount || 0} Tracks</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'ytmusic-history':
      return (
        <section className="pb-24">
          <h3 className="text-2xl font-bold text-white mb-8">YouTube Music History</h3>
          <div className="grid gap-2">
            {ytmusicHistory.map((track, i) => (
              <div key={track.id + i} onClick={() => playTrack(track, ytmusicHistory)} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-glass-bg border border-transparent hover:border-glass-border transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                    <img src={getImageUrl(track)} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="text-white fill-white w-5 h-5 ml-0.5" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-accent-purple transition-colors line-clamp-1">{track.title}</h4>
                    <p className="text-xs text-text-secondary">{track.uploaderName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(track); }} className="p-2 text-text-secondary hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                  <span className="text-xs font-mono text-text-secondary w-10 text-right">{formatTime(track.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'search':
      const suggestions = ['Tamil Hits', 'Bollywood', 'Lo-fi Study', 'Workout', 'Party Mix', 'Deep House', 'Relaxing Piano'];
      return (
        <section className="pb-32 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 section-accent">
            <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Discover <Sparkles className="w-6 h-6 text-accent-purple opacity-50" />
            </h3>
            <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 shadow-inner">
              <button 
                onClick={() => setSearchType('tracks')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${searchType === 'tracks' ? 'bg-white text-black shadow-2xl scale-105' : 'text-text-secondary hover:text-white'}`}
              >
                TRACKS
              </button>
              <button 
                onClick={() => setSearchType('playlists')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${searchType === 'playlists' ? 'bg-white text-black shadow-2xl scale-105' : 'text-text-secondary hover:text-white'}`}
              >
                PLAYLISTS
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mb-8 relative max-w-3xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-purple w-6 h-6 transition-colors" />
            <input 
              className="w-full bg-white/[0.03] border border-white/5 rounded-3xl py-5 pl-16 pr-40 text-lg text-white outline-none focus:border-accent-purple/30 focus:bg-white/[0.05] transition-all duration-500 shadow-2xl placeholder:text-text-secondary/30"
              placeholder={isAiMode ? "Describe a mood, activity, or vibe..." : (searchType === 'playlists' ? "Explore any public playlist..." : "Search for songs or paste a URL...")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setIsAiMode(!isAiMode)}
              className={`absolute right-4 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all ${isAiMode ? 'bg-accent-purple text-white shadow-glow-purple border border-white/20' : 'bg-white/5 text-text-secondary hover:bg-white/10 border border-white/5'}`}
            >
              {isAiMode ? 'AI MODE' : 'STANDARD'}
            </button>
          </form>

          {/* Genre Chips */}
          <div className="flex flex-wrap gap-3 mb-12">
            {suggestions.map(s => (
              <button 
                key={s}
                onClick={() => { setQuery(s); handleSearch({ preventDefault: () => {} }); }}
                className="px-5 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-bold text-text-secondary hover:text-white hover:bg-white/[0.08] hover:border-accent-purple/30 transition-all active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>

          {isAiLoading && (
            <div className="flex flex-col items-center py-32 border border-white/5 rounded-[48px] bg-white/[0.01] mb-12">
              <div className="w-16 h-16 border-4 border-accent-purple border-t-transparent rounded-full animate-spin mb-8 shadow-glow-purple" />
              <p className="text-white font-black text-xl uppercase tracking-widest animate-pulse">Synthesizing Personal Mix</p>
              <p className="text-text-secondary text-[10px] font-bold mt-2 uppercase tracking-[0.4em] opacity-40">Consulting Global Music Archives</p>
            </div>
          )}

          {searchResults.length === 0 && !isAiLoading && (
            <div className="flex flex-col items-center justify-center py-40 opacity-20 border-2 border-dashed border-white/5 rounded-[64px]">
              <Search className="w-20 h-20 mb-8" />
              <p className="text-2xl font-black uppercase tracking-[0.3em]">Start Exploring</p>
              <p className="text-sm font-bold mt-2">Search for an artist, song, or vibe to begin</p>
            </div>
          )}

          <div className={searchType === 'playlists' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8" : "grid gap-3"}>
            {searchResults.map((item, i) => {
              const isPlaylist = searchType === 'playlists' || item.videoCount !== undefined;
              
              if (isPlaylist) {
                return (
                  <div key={item.id + i} onClick={() => fetchPlaylist(item.id)} className="group cursor-pointer">
                    <div className="relative aspect-square rounded-[40px] overflow-hidden mb-5 border border-white/5 shadow-2xl bg-white/[0.02]">
                      <img src={getImageUrl(item)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                        <Play className="text-white fill-white w-10 h-10 transform scale-75 group-hover:scale-100 transition-transform" />
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-accent-purple transition-colors px-1">{item.title}</h4>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1 opacity-40 px-1 truncate">{item.videoCount} Tracks • {item.uploaderName}</p>
                  </div>
                );
              }

              return (
                <div key={item.id + i} onClick={() => playTrack(item, searchResults)} className="group flex items-center justify-between p-4 rounded-[28px] bg-white/[0.02] border border-transparent hover:border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer shadow-sm hover:shadow-2xl">
                  <div className="flex items-center gap-5">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-white/5">
                      <img src={getImageUrl(item)} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="text-white fill-white w-6 h-6 ml-1" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-accent-purple transition-colors line-clamp-1 tracking-tight">{item.title}</h4>
                      <p className="text-[10px] text-text-secondary font-black tracking-widest mt-1 opacity-60 uppercase">{item.uploaderName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="p-2 text-text-secondary/40 hover:text-white transition-all hover:scale-110"><Download className="w-5 h-5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); addToQueue(item); }} className="p-2 text-text-secondary/40 hover:text-white transition-all hover:scale-110"><Plus className="w-6 h-6" /></button>
                    </div>
                    <span className="text-[10px] font-mono font-black text-text-secondary/40 w-12 text-right">{formatTime(item.duration || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );

    case 'radio':
      return (
        <section className="pb-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 section-accent">
            <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Retro FM <Radio className="w-6 h-6 text-accent-purple opacity-50 animate-pulse" />
            </h3>
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-purple w-5 h-5 transition-colors" />
              <input 
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-accent-purple/30 transition-all shadow-xl"
                placeholder="Scan global frequencies..."
                value={radioQuery}
                onChange={(e) => setRadioQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRadioStations(radioQuery)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {radioStations.map((station, i) => (
              <div 
                key={station.stationuuid} 
                onClick={() => playRadioStation(station)} 
                className="p-6 rounded-[32px] bg-white/[0.02] border-l-4 border-transparent hover:border-accent-purple border border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer group shadow-sm hover:shadow-2xl relative overflow-hidden"
              >
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-accent-purple/10 flex items-center justify-center group-hover:bg-accent-purple transition-colors shadow-inner">
                    <Radio className="w-7 h-7 text-accent-purple group-hover:text-white" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-white truncate group-hover:text-accent-purple transition-colors tracking-tight">{station.name}</h4>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1 opacity-60 truncate">{station.country} • {station.codec} • {station.bitrate}kbps</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'liked':
      return (
        <section className="pb-24">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white">Your Collection</h3>
            <button 
              onClick={() => setIsMixtapeView(true)}
              className="px-6 py-2 rounded-full bg-accent-teal text-white font-bold text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:scale-105 transition-all"
            >
              Generate Mixtape
            </button>
          </div>
          <div className="grid gap-2">
            {likedSongs.map((track) => (
              <div key={track.url} onClick={() => playTrack(track, likedSongs)} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-glass-bg border border-transparent hover:border-glass-border transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                    <Play className="text-accent-purple fill-accent-purple w-4 h-4 ml-0.5" />
                  </div>
                  <h4 className="font-bold text-white group-hover:text-accent-purple transition-colors line-clamp-1">{track.title}</h4>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(track); }} className="p-2 text-text-secondary hover:text-white transition-colors"><Download className="w-5 h-5" /></button>
                  <span className="text-xs font-mono text-text-secondary">3:42</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'queue':
      const currentTrack = queue[currentIndex];
      return (
        <section className="pb-32 relative">
          {/* Blurred Album Art Background */}
          {currentTrack && (
            <div className="absolute inset-0 -top-24 -mx-10 opacity-10 pointer-events-none">
              <img src={getImageUrl(currentTrack)} alt="" className="w-full h-full object-cover blur-[120px]" />
            </div>
          )}

          <div className="flex items-center justify-between mb-12 section-accent relative z-10">
            <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Up Next <ListMusic className="w-6 h-6 text-accent-purple opacity-50" />
            </h3>
            <button 
              onClick={() => setQueue([])} 
              className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20"
            >
              Clear Queue
            </button>
          </div>

          {queue.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-40 opacity-20 border-2 border-dashed border-white/5 rounded-[64px] relative z-10">
               <ListMusic className="w-20 h-20 mb-8" />
               <p className="text-2xl font-black uppercase tracking-[0.3em]">Queue is Empty</p>
               <p className="text-sm font-bold mt-2">Add some tracks to keep the vibe going</p>
             </div>
          ) : (
            <div className="grid gap-4 relative z-10">
              {queue.map((track, i) => (
                <div 
                  key={i} 
                  onClick={() => playTrack(track)} 
                  className={`
                    flex items-center justify-between p-5 rounded-[32px] border transition-all cursor-pointer group shadow-sm
                    ${currentIndex === i 
                      ? 'bg-accent-purple/10 border-accent-purple/30 shadow-glow-purple scale-[1.02]' 
                      : 'bg-white/[0.02] border-transparent hover:border-white/10 hover:bg-white/[0.05] hover:shadow-xl'}
                  `}
                >
                  <div className="flex items-center gap-6">
                    <span className={`text-[10px] font-mono font-black w-6 text-center ${currentIndex === i ? 'text-accent-purple' : 'text-text-secondary/30 group-hover:text-white/40'}`}>
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/5 shadow-lg">
                      <img src={getImageUrl(track)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className={`font-bold tracking-tight ${currentIndex === i ? 'text-accent-purple' : 'text-white'}`}>{track.title}</h4>
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1 opacity-60">{track.uploaderName}</p>
                    </div>
                  </div>
                  {currentIndex === i && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple text-white text-[10px] font-black uppercase tracking-widest shadow-glow-purple">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Now Playing
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      );

    case 'history':
      return (
        <section className="pb-24">
           <h3 className="text-2xl font-bold text-white mb-8">Recently Played</h3>
           <div className="grid gap-2">
             {recentlyPlayed.map((track, i) => (
                <div key={i} onClick={() => playTrack(track, recentlyPlayed)} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-glass-bg border border-transparent hover:border-glass-border transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <img src={getImageUrl(track)} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <h4 className="font-bold text-white group-hover:text-accent-purple transition-colors line-clamp-1">{track.title}</h4>
                  </div>
                  <span className="text-xs font-mono text-text-secondary">{formatTime(track.duration || 0)}</span>
                </div>
             ))}
           </div>
        </section>
      );

    case 'playlist':
      return (
        <section className="pb-24">
          {isPlaylistLoading ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-12 h-12 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mb-4" />
            </div>
          ) : playlistData && (
            <>
              <div className="flex flex-col md:flex-row items-end gap-6 mb-10">
                <div className="w-48 h-48 rounded-3xl bg-glass-bg border border-glass-border flex items-center justify-center overflow-hidden shadow-2xl">
                   {playlistData.thumbnail || playlistData.items?.[0] ? (
                     <img src={getImageUrl(playlistData.thumbnail || playlistData.items[0])} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <Music2 className="w-16 h-16 text-text-secondary" />
                   )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-accent-purple uppercase tracking-[0.2em] mb-2">YouTube Music</p>
                  <h3 className="text-5xl font-black text-white mb-4 tracking-tighter">{playlistData.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span className="font-bold text-white">{playlistData.uploader}</span>
                    <span>•</span>
                    <span>{playlistData.itemCount} tracks</span>
                    <button 
                      onClick={() => playTrack(playlistData.items[0], playlistData.items)}
                      className="ml-4 px-6 py-2 rounded-full bg-white text-black font-bold hover:scale-105 transition-all"
                    >
                      Play All
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {playlistData.items.map((track, i) => (
                  <div key={track.id + i} onClick={() => playTrack(track, playlistData.items)} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-glass-bg border border-transparent hover:border-glass-border transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-text-secondary w-6 text-center group-hover:hidden">{i + 1}</span>
                      <Play className="hidden group-hover:block w-4 h-4 text-white fill-white ml-1" />
                      <div>
                        <h4 className="font-bold text-white group-hover:text-accent-purple transition-colors line-clamp-1">{track.title}</h4>
                        <p className="text-xs text-text-secondary">{track.uploaderName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(track); }} className="p-2 text-text-secondary hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                      <span className="text-xs font-mono text-text-secondary w-10 text-right">{formatTime(track.duration)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      );

    default:
      return null;
  }
};

export default ViewRenderer;
