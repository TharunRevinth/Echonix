import React from 'react';
import HomeView from './HomeView';
import { Search, Radio, Download, Plus, Play, Cpu, Mic2, Heart, Music2, Clock, Sparkles, ListMusic, MoreVertical } from 'lucide-react';

const ViewRenderer = ({ 
  currentView, setCurrentView, searchResults, handleSearch, query, setQuery, isAiMode, setIsAiMode, isAiLoading,
  playTrack, getImageUrl, formatTime, recentlyPlayed, likedSongs, toggleLike, handleDownload, addToQueue,
  radioStations, isRadioLoading, radioQuery, setRadioQuery, fetchRadioStations, playRadioStation,
  setIsMixtapeView, isMixtapeView, queue, currentIndex, setQueue, setCurrentIndex,
  lyrics, currentTime, lyricsRef,
  playlistData, isPlaylistLoading, trendingPlaylists, trendingTracks, fetchPlaylist,
  searchType, setSearchType,
  ytmusicPlaylists, ytmusicHistory, ytmusicHome, isYtmusicLoading, username, greeting, currentTrack
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
        greeting={greeting}
        setCurrentView={setCurrentView}
      />;

    case 'library':
      return (
        <section className="pb-24 view-transition pt-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold-700 text-white">Your YouTube Music Library</h3>
            <button 
              onClick={() => setIsMixtapeView(true)}
              className="px-6 py-2 rounded-full bg-text-bright-accent text-black font-bold-700 text-sm hover:scale-105 transition-all"
            >
              Generate Mixtape
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
            {/* Liked Songs Shortcut */}
            <div onClick={() => playTrack(likedSongs[0], likedSongs)} className="spotify-card group cursor-pointer">
              <div className="relative aspect-square rounded-md overflow-hidden mb-4 bg-gradient-to-br from-[#450eff] to-[#8e8ee5] flex items-center justify-center shadow-xl">
                <Heart className="w-16 h-16 text-white fill-white" />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                  <div className="w-12 h-12 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl">
                    <Play className="text-black fill-black w-6 h-6 ml-1" />
                  </div>
                </div>
              </div>
              <h4 className="font-bold-700 text-white text-sm">Liked Songs</h4>
              <p className="text-xs text-text-subdued font-semibold-600 mt-1">{likedSongs.length} Tracks</p>
            </div>

            {/* Playlists */}
            {ytmusicPlaylists.map((p, i) => (
              <div key={p.playlistId || i} onClick={() => fetchPlaylist(p.playlistId)} className="spotify-card group cursor-pointer">
                <div className="relative aspect-square rounded-md overflow-hidden mb-4 shadow-xl">
                  <img src={getImageUrl(p.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || p)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl">
                      <Play className="text-black fill-black w-5 h-5 ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="font-bold-700 text-white text-sm line-clamp-1">{p.title}</h4>
                <p className="text-xs text-text-subdued font-semibold-600 mt-1">{p.count || p.itemCount || 0} Tracks</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'ytmusic-history':
      return (
        <section className="pb-24 view-transition pt-4">
          <h3 className="text-2xl font-bold-700 text-white mb-8">YouTube Music History</h3>
          <div className="flex flex-col">
            {ytmusicHistory.map((track, i) => {
              const isActive = currentTrack && (currentTrack.id === track.id || currentTrack.url === track.url || currentTrack.videoId === track.videoId);
              return (
                <div key={track.id + i} onClick={() => playTrack(track, ytmusicHistory)} className="group flex items-center justify-between p-3 rounded-md hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className="w-8 flex items-center justify-center shrink-0">
                       {isActive ? (
                         <div className="eq-container">
                            <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                         </div>
                       ) : (
                         <span className="text-sm font-semibold-600 text-text-subdued group-hover:hidden">{i + 1}</span>
                       )}
                       {!isActive && <Play className="hidden group-hover:block w-4 h-4 text-white fill-white" />}
                    </div>
                    <img src={getImageUrl(track)} alt="" className="w-10 h-10 rounded shadow-lg" />
                    <div className="min-w-0 pr-4">
                      <h4 className={`font-semibold-600 text-sm truncate ${isActive ? 'text-accent-purple' : 'text-white'}`}>{track.title}</h4>
                      <p className="text-xs text-text-subdued truncate">{track.uploaderName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-text-subdued">
                    <Heart className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white" />
                    <span className="text-xs font-semibold-600 w-10 text-right text-white/60">{formatTime(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );

    case 'search':
      const genres = [
        { name: 'Tamil Hits', color: '#E8115B' },
        { name: 'Bollywood', color: '#E91429' },
        { name: 'Lo-fi Study', color: '#1E3264' },
        { name: 'Workout', color: '#E8115B' },
        { name: 'Party Mix', color: '#8D67AB' },
        { name: 'Deep House', color: '#509BF5' },
        { name: 'Romance', color: '#E13300' },
        { name: 'Night Vibes', color: '#0D73EC' },
        { name: 'Kollywood', color: '#148A08' },
        { name: 'Classical', color: '#E8115B' },
      ];

      const topResult = searchResults.length > 0 && searchType === 'tracks' ? searchResults[0] : null;
      const otherResults = searchResults.length > 0 && searchType === 'tracks' ? searchResults.slice(0, 5) : searchResults;

      return (
        <section className="pb-32 relative pt-4 px-2 lg:px-6 view-transition">
          {isAiLoading && (
            <div className="flex flex-col items-center py-20 bg-white/[0.02] rounded-lg mb-10">
              <div className="w-12 h-12 border-4 border-text-bright-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white font-bold-700 text-sm">Synthesizing Personal Mix...</p>
            </div>
          )}

          {/* Empty State: Colored Genre Cards */}
          {searchResults.length === 0 && !isAiLoading && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold-700 text-white">Browse all</h3>
                <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                  <button 
                    onClick={() => setIsAiMode(!isAiMode)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold-700 tracking-widest transition-all ${isAiMode ? 'bg-text-bright-accent text-black' : 'text-text-subdued hover:text-white'}`}
                  >
                    AI MODE
                  </button>
                  <button 
                    onClick={() => setIsAiMode(false)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold-700 tracking-widest transition-all ${!isAiMode ? 'bg-white text-black' : 'text-text-subdued hover:text-white'}`}
                  >
                    STANDARD
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                {genres.map(g => (
                  <div 
                    key={g.name}
                    onClick={() => { setQuery(g.name); handleSearch({ preventDefault: () => {} }); }}
                    className="aspect-square rounded-lg p-4 cursor-pointer overflow-hidden relative shadow-md hover:scale-[1.02] transition-transform"
                    style={{ backgroundColor: g.color }}
                  >
                    <h4 className="text-white font-bold-700 text-lg md:text-2xl tracking-tight relative z-10 w-2/3 leading-tight">{g.name}</h4>
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-black/20 rounded-md rotate-[25deg] shadow-xl" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && !isAiLoading && (
            <div>
              {searchType === 'tracks' ? (
                <div className="flex flex-col lg:flex-row gap-10">
                  {/* Top Result Card */}
                  {topResult && (
                    <div className="lg:w-[400px] flex flex-col shrink-0">
                      <h3 className="text-2xl font-bold-700 text-white mb-4">Top result</h3>
                      <div 
                        onClick={() => playTrack(topResult, searchResults)}
                        className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-6 flex flex-col gap-5 cursor-pointer group relative flex-1 shadow-2xl"
                      >
                        <div className="w-24 h-24 lg:w-36 lg:h-32 rounded-lg shadow-2xl overflow-hidden shrink-0">
                          <img src={getImageUrl(topResult)} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1">
                           <h4 className="text-white font-bold-700 text-2xl lg:text-3xl tracking-tight truncate">{topResult.title}</h4>
                           <div className="flex items-center gap-3">
                             <p className="text-sm font-semibold-600 text-text-subdued">{topResult.uploaderName}</p>
                             <span className="px-2 py-0.5 bg-black/40 text-white text-[10px] font-bold-700 rounded-full uppercase tracking-widest">Song</span>
                           </div>
                        </div>
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-2xl">
                          <div className="w-14 h-14 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                            <Play className="text-black fill-black w-6 h-6 ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Songs List */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <h3 className="text-2xl font-bold-700 text-white mb-4">Songs</h3>
                    <div className="flex flex-col space-y-0.5">
                      {otherResults.map((item, i) => {
                        const isActive = currentTrack && (currentTrack.id === item.id || currentTrack.url === item.url);
                        return (
                          <div 
                            key={item.id + i} 
                            onClick={() => playTrack(item, searchResults)} 
                            className="group flex items-center gap-4 p-3 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <div className="w-8 flex items-center justify-center shrink-0">
                               {isActive ? (
                                 <div className="eq-container">
                                    <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                                 </div>
                               ) : (
                                 <>
                                   <span className="text-sm font-semibold-600 text-text-subdued group-hover:hidden">{i + 1}</span>
                                   <Play className="hidden group-hover:block w-4 h-4 text-white fill-white" />
                                 </>
                               )}
                            </div>
                            
                            <img src={getImageUrl(item)} className="w-10 h-10 rounded shrink-0 shadow-lg" alt="" />
                            
                            <div className="flex-1 min-w-0 pr-4">
                              <h4 className={`font-semibold-600 text-sm truncate ${isActive ? 'text-accent-purple' : 'text-white'}`}>{item.title}</h4>
                              <p className="text-xs text-text-subdued truncate font-medium">{item.uploaderName}</p>
                            </div>
                            
                            <div className="flex items-center gap-6 shrink-0">
                              <Heart className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-text-subdued hover:text-white" />
                              <span className="text-xs font-semibold-600 text-white/60 w-10 text-right">{formatTime(item.duration || 0)}</span>
                              <MoreVertical className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-text-subdued hover:text-white" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Playlist Results Grid */
                <div>
                   <h3 className="text-2xl font-bold-700 text-white mb-6">Playlists</h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {searchResults.map((item, i) => (
                      <div key={item.id + i} onClick={() => fetchPlaylist(item.id)} className="spotify-card group cursor-pointer">
                        <div className="relative aspect-square overflow-hidden mb-4 rounded-md shadow-2xl">
                          <img src={getImageUrl(item)} alt="" className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                            <div className="w-12 h-12 rounded-full bg-text-bright-accent flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                              <Play className="text-black fill-black w-5 h-5 ml-1" />
                            </div>
                          </div>
                        </div>
                        <h4 className="font-bold-700 text-white text-sm truncate mb-1">{item.title}</h4>
                        <p className="text-xs text-text-subdued font-semibold-600 line-clamp-2">{item.videoCount} Tracks • {item.uploaderName}</p>
                      </div>
                    ))}
                   </div>
                </div>
              )}
            </div>
          )}
        </section>
      );

    case 'radio':
      return (
        <section className="pb-32 view-transition pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <h3 className="text-3xl font-bold-700 text-white tracking-tight flex items-center gap-3">
              Retro FM <Radio className="w-6 h-6 text-text-bright-accent animate-pulse" />
            </h3>
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subdued group-focus-within:text-white w-5 h-5 transition-colors" />
              <input 
                className="w-full bg-white/5 border border-white/5 rounded-full py-3 pl-12 pr-4 text-sm text-white outline-none focus:bg-white/10 transition-all shadow-xl"
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
                className="p-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group shadow-sm relative overflow-hidden"
              >
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-text-bright-accent transition-colors shadow-inner shrink-0">
                    <Radio className="w-7 h-7 text-text-bright-accent group-hover:text-black" />
                  </div>
                  <div className="flex-1 overflow-hidden text-left">
                    <h4 className="font-bold-700 text-white truncate group-hover:text-text-bright-accent transition-colors tracking-tight">{station.name}</h4>
                    <p className="text-[10px] font-semibold-600 text-text-subdued uppercase tracking-widest mt-1 opacity-60 truncate">{station.country} • {station.codec} • {station.bitrate}kbps</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'liked':
      return (
        <section className="pb-24 view-transition pt-4 text-left">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold-700 text-white">Your Collection</h3>
            <button 
              onClick={() => setIsMixtapeView(true)}
              className="px-6 py-2 rounded-full bg-text-bright-accent text-black font-bold-700 text-sm hover:scale-105 transition-all"
            >
              Generate Mixtape
            </button>
          </div>
          <div className="flex flex-col">
            {likedSongs.map((track, i) => {
              const isActive = currentTrack && (currentTrack.url === track.url || currentTrack.id === track.id || currentTrack.videoId === track.videoId);
              return (
                <div key={track.url} onClick={() => playTrack(track, likedSongs)} className="group flex items-center justify-between p-3 rounded-md hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className="w-8 flex items-center justify-center shrink-0">
                       {isActive ? (
                         <div className="eq-container">
                            <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                         </div>
                       ) : (
                         <span className="text-sm font-semibold-600 text-text-subdued group-hover:hidden">{i + 1}</span>
                       )}
                       {!isActive && <Play className="hidden group-hover:block w-4 h-4 text-white fill-white" />}
                    </div>
                    <div className="min-w-0 pr-4">
                      <h4 className={`font-semibold-600 text-sm truncate ${isActive ? 'text-accent-purple' : 'text-white'}`}>{track.title}</h4>
                      <p className="text-xs text-text-subdued truncate">{track.uploaderName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Heart className="w-4 h-4 text-text-bright-accent fill-text-bright-accent" />
                    <span className="text-xs font-semibold-600 text-white/60 w-10 text-right">3:42</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );

    case 'queue':
      return (
        <section className="pb-32 relative view-transition pt-4 text-left">
          {currentTrack && (
            <div className="absolute inset-0 -top-24 -mx-10 opacity-10 pointer-events-none">
              <img src={getImageUrl(currentTrack)} alt="" className="w-full h-full object-cover blur-[120px]" />
            </div>
          )}

          <div className="flex items-center justify-between mb-12 relative z-10">
            <h3 className="text-3xl font-bold-700 text-white tracking-tight flex items-center gap-3">
              Up Next <ListMusic className="w-6 h-6 text-text-bright-accent opacity-50" />
            </h3>
            <button 
              onClick={() => setQueue([])} 
              className="text-[10px] font-bold-700 uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20"
            >
              Clear Queue
            </button>
          </div>

          {queue.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-40 opacity-20 border-2 border-dashed border-white/10 rounded-xl relative z-10">
               <ListMusic className="w-20 h-20 mb-8" />
               <p className="text-2xl font-bold-700 uppercase tracking-widest">Queue is Empty</p>
               <p className="text-sm font-semibold-600 mt-2">Add some tracks to keep the vibe going</p>
             </div>
          ) : (
            <div className="flex flex-col space-y-1 relative z-10">
              {queue.map((track, i) => {
                const isActive = currentIndex === i;
                return (
                  <div 
                    key={i} 
                    onClick={() => playTrack(track)} 
                    className={`
                      flex items-center justify-between p-3 rounded-md transition-all cursor-pointer group
                      ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
                    `}
                  >
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className="w-8 flex items-center justify-center shrink-0">
                         {isActive ? (
                           <div className="eq-container">
                              <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                           </div>
                         ) : (
                           <span className="text-sm font-semibold-600 text-text-subdued group-hover:hidden">{i + 1}</span>
                         )}
                         {!isActive && <Play className="hidden group-hover:block w-4 h-4 text-white fill-white" />}
                      </div>
                      <img src={getImageUrl(track)} alt="" className="w-10 h-10 rounded shadow-md shrink-0" />
                      <div className="min-w-0 pr-4">
                        <h4 className={`font-semibold-600 text-sm truncate ${isActive ? 'text-accent-purple' : 'text-white'}`}>{track.title}</h4>
                        <p className="text-xs text-text-subdued truncate font-medium">{track.uploaderName}</p>
                      </div>
                    </div>
                    {isActive && (
                      <div className="text-[10px] font-bold-700 text-text-bright-accent uppercase tracking-widest">Now Playing</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      );

    case 'history':
      return (
        <section className="pb-24 view-transition pt-4 text-left">
           <h3 className="text-3xl font-bold-700 text-white mb-8">Recently Played</h3>
           <div className="flex flex-col">
             {recentlyPlayed.map((track, i) => {
                const isActive = currentTrack && (currentTrack.id === track.id || currentTrack.url === track.url || currentTrack.videoId === track.videoId);
                return (
                  <div key={i} onClick={() => playTrack(track, recentlyPlayed)} className="group flex items-center justify-between p-3 rounded-md hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className="w-8 flex items-center justify-center shrink-0">
                         {isActive ? (
                           <div className="eq-container">
                              <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                           </div>
                         ) : (
                           <span className="text-sm font-semibold-600 text-text-subdued group-hover:hidden">{i + 1}</span>
                         )}
                         {!isActive && <Play className="hidden group-hover:block w-4 h-4 text-white fill-white" />}
                      </div>
                      <img src={getImageUrl(track)} alt="" className="w-10 h-10 rounded shadow-md shrink-0" />
                      <div className="min-w-0 pr-4">
                        <h4 className={`font-semibold-600 text-sm truncate ${isActive ? 'text-accent-purple' : 'text-white'}`}>{track.title}</h4>
                        <p className="text-xs text-text-subdued truncate font-medium">{track.uploaderName}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold-600 text-white/60 w-10 text-right">{formatTime(track.duration || 0)}</span>
                  </div>
                );
             })}
           </div>
        </section>
      );

    case 'playlist':
      return (
        <section className="pb-24 view-transition pt-4 text-left">
          {isPlaylistLoading ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-12 h-12 border-4 border-text-bright-accent border-t-transparent rounded-full animate-spin mb-4" />
            </div>
          ) : playlistData && (
            <>
              <div className="flex flex-col md:flex-row items-end gap-6 mb-10">
                <div className="w-48 h-48 lg:w-60 lg:h-60 rounded-lg bg-bg-highlight overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] shrink-0">
                   {playlistData.thumbnail || playlistData.items?.[0] ? (
                     <img src={getImageUrl(playlistData.thumbnail || playlistData.items[0])} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center"><Music2 className="w-16 h-16 text-text-subdued" /></div>
                   )}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-xs font-bold-700 text-white uppercase tracking-widest mb-2">Playlist</p>
                  <h3 className="text-4xl lg:text-7xl font-bold-900 text-white mb-6 tracking-tight leading-tight">{playlistData.title}</h3>
                  <div className="flex items-center gap-2 text-sm font-semibold-600">
                    <span className="text-white">{playlistData.uploader}</span>
                    <span className="text-white/60">•</span>
                    <span className="text-white/60">{playlistData.itemCount} songs</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                {playlistData.items.map((track, i) => {
                  const isActive = currentTrack && (currentTrack.id === track.id || currentTrack.url === track.url || currentTrack.videoId === track.videoId);
                  return (
                    <div key={track.id + i} onClick={() => playTrack(track, playlistData.items)} className="group flex items-center justify-between p-3 rounded-md hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex items-center gap-4 flex-1 overflow-hidden">
                        <div className="w-8 flex items-center justify-center shrink-0">
                           {isActive ? (
                             <div className="eq-container">
                                <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                             </div>
                           ) : (
                             <span className="text-sm font-semibold-600 text-text-subdued group-hover:hidden">{i + 1}</span>
                           )}
                           {!isActive && <Play className="hidden group-hover:block w-4 h-4 text-white fill-white" />}
                        </div>
                        <div className="min-w-0 pr-4 text-left">
                          <h4 className={`font-semibold-600 text-sm truncate ${isActive ? 'text-accent-purple' : 'text-white'}`}>{track.title}</h4>
                          <p className="text-xs text-text-subdued truncate font-medium">{track.uploaderName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <Heart className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-text-subdued hover:text-white" />
                        <span className="text-xs font-semibold-600 text-white/60 w-10 text-right">{formatTime(track.duration)}</span>
                      </div>
                    </div>
                  );
                })}
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
