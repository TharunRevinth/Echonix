import React from 'react';
import HomeView from './HomeView';
import { Search, Radio, Download, Plus, Play, Cpu, Mic2 } from 'lucide-react';

const ViewRenderer = ({ 
  currentView, searchResults, handleSearch, query, setQuery, isAiMode, setIsAiMode, isAiLoading,
  playTrack, getImageUrl, formatTime, recentlyPlayed, likedSongs, toggleLike, handleDownload, addToQueue,
  radioStations, isRadioLoading, radioQuery, setRadioQuery, fetchRadioStations, playRadioStation,
  setIsMixtapeView, isMixtapeView, queue, currentIndex, setQueue, setCurrentIndex,
  explanation, explainLyrics, lyrics, currentTime, lyricsRef
}) => {
  switch (currentView) {
    case 'home':
      return <HomeView recentlyPlayed={recentlyPlayed} playTrack={playTrack} getImageUrl={getImageUrl} formatTime={formatTime} toggleLike={toggleLike} likedSongs={likedSongs} />;
    
    case 'search':
      return (
        <section className="pb-24">
          <h3 className="text-2xl font-bold text-white mb-6">Discover Music</h3>
          <form onSubmit={handleSearch} className="mb-8 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5" />
            <input 
              className="w-full bg-bg-card border border-glass-border rounded-2xl py-4 pl-12 pr-32 text-white outline-none focus:border-accent-purple transition-all"
              placeholder={isAiMode ? "Describe the vibe..." : "Search for tracks..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setIsAiMode(!isAiMode)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${isAiMode ? 'bg-accent-purple text-white' : 'bg-glass-bg text-text-secondary hover:bg-glass-border'}`}
            >
              {isAiMode ? 'AI ACTIVE' : 'STANDARD'}
            </button>
          </form>

          {isAiLoading && (
            <div className="flex flex-col items-center py-20">
              <div className="w-12 h-12 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-accent-purple animate-pulse font-medium">Curating your AI experience...</p>
            </div>
          )}

          <div className="grid gap-3">
            {searchResults.map((track) => (
              <div key={track.id} onClick={() => playTrack(track, searchResults)} className="group flex items-center justify-between p-3 rounded-2xl bg-glass-bg border border-transparent hover:border-glass-border hover:bg-bg-card transition-all cursor-pointer">
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
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(track); }} className="p-2 text-text-secondary hover:text-white transition-colors"><Download className="w-5 h-5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); addToQueue(track); }} className="p-2 text-text-secondary hover:text-white transition-colors"><Plus className="w-5 h-5" /></button>
                  <span className="text-xs font-mono text-text-secondary w-10 text-right">{formatTime(track.duration || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'radio':
      return (
        <section className="pb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h3 className="text-2xl font-bold text-white">Retro FM Global</h3>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input 
                className="w-full bg-bg-card border border-glass-border rounded-xl py-2.5 pl-11 pr-4 text-sm outline-none focus:border-accent-purple transition-all"
                placeholder="Scan frequencies..."
                value={radioQuery}
                onChange={(e) => setRadioQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRadioStations(radioQuery)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {radioStations.map((station) => (
              <div key={station.stationuuid} onClick={() => playRadioStation(station)} className="p-4 rounded-2xl bg-glass-bg border border-glass-border hover:border-accent-purple hover:bg-bg-card transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center group-hover:bg-accent-purple transition-colors">
                    <Radio className="w-6 h-6 text-accent-purple group-hover:text-white" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-white truncate group-hover:text-accent-purple transition-colors">{station.name}</h4>
                    <p className="text-xs text-text-secondary truncate">{station.country} • {station.codec}</p>
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
      return (
        <section className="pb-24">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white">Up Next</h3>
            <button onClick={() => setQueue([])} className="text-sm font-bold text-red-500 hover:underline">Clear Queue</button>
          </div>
          <div className="grid gap-3">
            {queue.map((track, i) => (
              <div key={i} onClick={() => playTrack(track)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${currentIndex === i ? 'bg-accent-purple/10 border-accent-purple shadow-glow-purple' : 'bg-glass-bg border-transparent hover:border-glass-border'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-text-secondary w-4">{i + 1}</span>
                  <div>
                    <h4 className={`font-bold ${currentIndex === i ? 'text-accent-purple' : 'text-white'}`}>{track.title}</h4>
                    <p className="text-xs text-text-secondary">{track.uploaderName}</p>
                  </div>
                </div>
                {currentIndex === i && <div className="px-3 py-1 rounded-full bg-accent-purple text-white text-[10px] font-black uppercase tracking-widest animate-pulse">Playing</div>}
              </div>
            ))}
          </div>
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

    default:
      return null;
  }
};

export default ViewRenderer;
