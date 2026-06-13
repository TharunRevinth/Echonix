import React, { useState, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Heart, Repeat, Shuffle, Download, CassetteTape, ChevronDown, Mic2, Cpu, Info } from 'lucide-react';

const PlayerBar = ({
  currentTrack, isPlaying, setIsPlaying, currentTime, duration,
  handleSeek, handleNext, handlePrev, volume, setVolume,
  formatTime, getImageUrl, toggleLike, likedSongs, handleDownload,
  toggleLocalTape, localTapes,
  isPlayerExpanded, setIsPlayerExpanded, lyrics, lyricsOffset, setLyricsOffset, lyricsRef,
  isShuffle, setIsShuffle, repeatMode, setRepeatMode
}) => {
  const [localSeekTime, setLocalSeekTime] = useState(null);
  const userScrollTimeout = useRef(null);

  if (!currentTrack) return null;

  const isLiked = likedSongs.find(s => s.url === currentTrack.url);
  const isTaped = localTapes.find(s => s.url === currentTrack.url);

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const onSeekChange = (e) => {
    setLocalSeekTime(parseFloat(e.target.value));
  };

  const onSeekMouseUp = (e) => {
    if (localSeekTime !== null) {
      handleSeek({ target: { value: localSeekTime } });
      setLocalSeekTime(null);
    }
  };

  const handleLyricsInteraction = () => {
    if (lyricsRef.current) {
        lyricsRef.current.isUserInteracting = true;
        if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
        userScrollTimeout.current = setTimeout(() => {
            if (lyricsRef.current) lyricsRef.current.isUserInteracting = false;
        }, 3000);
    }
  };

  const displayTime = localSeekTime !== null ? localSeekTime : currentTime;

  return (
    <>
      {/* Expanded Spotify-Style Player */}
      <div className={`fixed inset-0 z-[100] bg-bg-dark transition-all duration-500 ease-[cubic-bezier(0.3,0,0.2,1)] ${isPlayerExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-accent-purple/30 via-bg-dark/95 to-bg-dark pointer-events-none" />
        
        <div className="relative h-full flex flex-col p-6 md:p-12 lg:px-20 lg:py-16 max-w-[1600px] mx-auto w-full overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between w-full mb-8 lg:mb-12">
            <button 
              onClick={() => setIsPlayerExpanded(false)}
              className="p-3 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-8 h-8 text-white" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-secondary/60">Now Playing</p>
              <p className="text-sm font-bold text-white mt-1 line-clamp-1 max-w-[200px] md:max-w-md">{currentTrack.title || currentTrack.name || 'Unknown Track'}</p>
            </div>
            <button className="p-3 rounded-full hover:bg-white/10 transition-colors">
              <Info className="w-6 h-6 text-white/40" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-24 flex-1 items-center lg:items-center overflow-hidden">
            {/* Left: Enhanced Cover Art */}
            <div className="w-full max-w-[340px] md:max-w-[420px] lg:w-[460px] flex-shrink-0">
              <div className="aspect-square rounded-[48px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-white/10 group relative bg-black/40">
                <img src={getImageUrl(currentTrack)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="mt-10 space-y-6">
                 <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 overflow-hidden">
                      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-tight truncate">{currentTrack.title || currentTrack.name || 'Unknown Track'}</h2>
                      <p className="text-lg md:text-xl text-accent-purple font-bold mt-2 opacity-90 truncate">{currentTrack.uploaderName || currentTrack.artist || currentTrack.byline || 'Unknown Artist'}</p>
                    </div>
                    <Heart 
                      onClick={() => toggleLike(currentTrack)}
                      className={`w-10 h-10 flex-shrink-0 cursor-pointer transition-all hover:scale-110 ${isLiked ? 'text-accent-purple fill-accent-purple' : 'text-white/20 hover:text-white'}`} 
                    />
                 </div>
              </div>
            </div>

            {/* Right: Immersive Lyrics */}
            <div className="flex-1 w-full h-full flex flex-col min-h-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-4 border-b border-white/5 pb-4">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 hidden md:block">Live Transcript</h3>
                 
                 <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
                   {lyricsOffset > 5 && (
                      <button 
                        onClick={() => handleSeek({ target: { value: lyricsOffset } })}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-glow-purple animate-bounce shrink-0"
                      >
                        <SkipForward className="w-3 h-3" />
                        Skip Intro
                      </button>
                   )}
                   <div className="flex items-center gap-4 bg-white/5 rounded-full px-4 py-2 border border-white/10 shrink-0">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest hidden sm:inline">Offset</span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setLyricsOffset(prev => prev - 1); }}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors text-sm font-bold"
                        >
                          -
                        </button>
                        <span className={`text-[10px] font-mono font-black w-10 text-center ${lyricsOffset !== 0 ? 'text-accent-purple' : 'text-white/40'}`}>
                          {lyricsOffset > 0 ? '+' : ''}{lyricsOffset}s
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setLyricsOffset(prev => prev + 1); }}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                   </div>
                 </div>
              </div>
              <div 
                ref={lyricsRef}
                onWheel={handleLyricsInteraction}
                onTouchMove={handleLyricsInteraction}
                onMouseDown={handleLyricsInteraction}
                className="flex-1 overflow-y-auto pr-4 space-y-6 md:space-y-10 custom-scrollbar scroll-smooth mask-fade-edges py-[40vh]"
              >
                {lyrics && lyrics.length > 0 ? lyrics.map((line, i) => {
                  const adjustedTime = line.time === -1 ? -1 : line.time + lyricsOffset;
                  const isActive = adjustedTime !== -1 && adjustedTime <= currentTime && (lyrics[i+1]?.time + lyricsOffset > currentTime || !lyrics[i+1]);
                  const isPassed = adjustedTime !== -1 && adjustedTime < currentTime && !isActive;

                  return (
                    <p 
                      key={i} 
                      className={`
                        text-xl md:text-3xl lg:text-4xl font-extrabold transition-all duration-500 origin-left leading-tight cursor-pointer py-3
                        ${isActive 
                          ? 'text-white opacity-100 blur-0 scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                          : isPassed
                            ? 'text-white/40 opacity-50 blur-[1px] hover:opacity-80 hover:blur-0 transition-all'
                            : 'text-white/20 opacity-30 blur-[2px] hover:opacity-80 hover:blur-0 transition-all'
                        }
                      `}
                      onClick={() => line.time !== -1 && handleSeek({ target: { value: line.time + lyricsOffset } })}
                    >
                      {line.text}
                    </p>
                  );
                }) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                    <Mic2 className="w-16 h-16 mb-6" />
                    <p className="text-2xl font-bold uppercase tracking-widest italic">Awaiting Lyrics Data</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Control Suite */}
          <div className="mt-auto w-full max-w-4xl mx-auto pt-10 pb-4">
             <div className="w-full mb-10">
                <div className="flex-1 h-1.5 relative group cursor-pointer">
                  <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={displayTime}
                    onChange={onSeekChange}
                    onMouseUp={onSeekMouseUp}
                    onTouchEnd={onSeekMouseUp}
                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/20" 
                      style={{ width: `${(displayTime / (duration || 1)) * 100}%` }} 
                    />
                  </div>
                  <div 
                    className="absolute inset-y-0 left-0 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-150" 
                    style={{ width: `${(displayTime / (duration || 1)) * 100}%` }} 
                  />
                </div>
                <div className="flex justify-between mt-4 px-1 opacity-60">
                  <span className="text-xs font-mono font-bold text-white">{formatTime(displayTime)}</span>
                  <span className="text-xs font-mono font-bold text-white">{formatTime(duration)}</span>
                </div>
             </div>

             <div className="flex items-center justify-between gap-12">
                <button 
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-4 rounded-full transition-all ${isShuffle ? 'bg-accent-purple/10 text-accent-purple shadow-glow-purple scale-110' : 'text-text-secondary hover:text-white'}`}
                >
                  <Shuffle className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-10 md:gap-14">
                  <button onClick={handlePrev} className="text-white hover:scale-110 transition-all active:scale-90"><SkipBack className="w-10 h-10 fill-current" /></button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                  >
                    {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-2" />}
                  </button>
                  <button onClick={handleNext} className="text-white hover:scale-110 transition-all active:scale-90"><SkipForward className="w-10 h-10 fill-current" /></button>
                </div>
                <button 
                  onClick={toggleRepeat}
                  className={`relative p-4 rounded-full transition-all ${repeatMode !== 'off' ? 'bg-accent-purple/10 text-accent-purple shadow-glow-purple scale-110' : 'text-text-secondary hover:text-white'}`}
                >
                  <Repeat className="w-6 h-6" />
                  {repeatMode === 'one' && <span className="absolute top-2 right-2 bg-accent-purple text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-bg-dark">1</span>}
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Mini Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-28 bg-bg-dark/80 backdrop-blur-3xl border-t border-white/5 px-6 flex items-center justify-between z-[60] shadow-[0_-20px_80px_rgba(0,0,0,0.6)]">
        {/* Ambient Bleed Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 blur-[100px] transform scale-150"
            style={{ 
              background: `radial-gradient(circle at 20% 50%, var(--accent-purple), transparent 70%)`
            }} 
          />
        </div>

        {/* Track Info (Click to expand) */}
        <div 
          onClick={() => setIsPlayerExpanded(true)}
          className="flex items-center gap-5 w-1/4 min-w-[240px] cursor-pointer group relative z-10"
        >
          <div className="w-16 h-16 rounded-[20px] overflow-hidden border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500 relative">
            <img src={getImageUrl(currentTrack)} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-accent-purple/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-black text-white truncate group-hover:text-accent-purple transition-colors tracking-tight">{currentTrack.title || currentTrack.name || 'Unknown Track'}</h4>
            <p className="text-[10px] font-bold text-text-secondary truncate uppercase tracking-widest mt-1 opacity-60">{currentTrack.uploaderName || currentTrack.artist || currentTrack.byline || 'Unknown Artist'}</p>
          </div>
          <Heart 
            onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
            className={`w-5 h-5 cursor-pointer transition-all hover:scale-110 ${isLiked ? 'text-accent-purple fill-accent-purple' : 'text-text-secondary/40 hover:text-white'}`} 
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-3 flex-1 max-w-2xl px-12 relative z-10">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setIsShuffle(!isShuffle)}
              className={`transition-all hover:scale-110 ${isShuffle ? 'text-accent-purple shadow-glow-purple' : 'text-text-secondary/40 hover:text-white'}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={handlePrev} className="text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90"><SkipBack className="w-6 h-6 fill-current" /></button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-glow-white"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
            <button onClick={handleNext} className="text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90"><SkipForward className="w-6 h-6 fill-current" /></button>
            <button 
              onClick={toggleRepeat}
              className={`relative transition-all hover:scale-110 ${repeatMode !== 'off' ? 'text-accent-purple shadow-glow-purple' : 'text-text-secondary/40 hover:text-white'}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && <span className="absolute -top-2 -right-2 bg-accent-purple text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-bg-dark">1</span>}
            </button>
          </div>
          
          <div className="w-full flex items-center gap-4">
            <span className="text-[10px] font-mono font-black text-text-secondary/40 w-12 text-right">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1.5 relative group cursor-pointer">
              <input 
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
              />
              <div className="absolute inset-0 bg-white/5 rounded-full overflow-hidden" />
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-150 ${repeatMode === 'one' ? 'bg-accent-teal shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 'bg-accent-purple shadow-glow-purple'}`} 
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-glow-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%`, transform: `translate(-50%, -50%)` }}
              />
            </div>
            <span className="text-[10px] font-mono font-black text-text-secondary/40 w-12">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Actions */}
        <div className="flex items-center gap-8 w-1/4 justify-end relative z-10">
          <div className="hidden xl:flex items-center gap-5">
            <button 
              onClick={() => setIsPlayerExpanded(true)}
              className={`p-2.5 rounded-xl hover:bg-white/5 transition-all hover:scale-110 ${lyrics?.length > 0 ? 'text-accent-teal' : 'text-text-secondary/40'}`}
            >
              <Mic2 className="w-5 h-5" />
            </button>
            <Download 
              onClick={() => handleDownload(currentTrack)}
              className="w-5 h-5 text-text-secondary/40 hover:text-white cursor-pointer transition-all hover:scale-110" 
            />
          </div>
          <div className="flex items-center gap-4 w-36 group">
            <Volume2 className="w-5 h-5 text-text-secondary/40 group-hover:text-white transition-colors" />
            <div className="flex-1 h-1.5 relative cursor-pointer">
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
              />
              <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden" />
              <div className="absolute inset-y-0 left-0 bg-white/40 group-hover:bg-accent-purple rounded-full transition-all" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerBar;
