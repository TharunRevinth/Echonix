import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Heart, 
  Repeat, Shuffle, ChevronDown, Mic2, Info, ListMusic, Share2, Download
} from 'lucide-react';
import { renderArtists } from '../utils';

const PlayerBar = ({
  currentTrack, isPlaying, setIsPlaying, currentTime, duration,
  handleSeek, handleNext, handlePrev, volume, setVolume,
  formatTime, getImageUrl, toggleLike, likedSongs, handleDownload,
  isPlayerExpanded, setIsPlayerExpanded, lyrics, lyricsOffset, setLyricsOffset, lyricsRef,
  isShuffle, setIsShuffle, repeatMode, setRepeatMode, viewArtist
}) => {
  const [localSeekTime, setLocalSeekTime] = useState(null);
  const userScrollTimeout = useRef(null);

  if (!currentTrack) return null;

  const isLiked = likedSongs.find(s => s.url === currentTrack.url);

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
      {/* Expanded Spotify-Style Immersive Player */}
      <div className={`fixed inset-0 z-[100] expanded-player-bg transition-all duration-700 ease-[cubic-bezier(0.3,0,0.2,1)] ${isPlayerExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="relative h-full flex flex-col p-6 md:p-10 lg:px-16 lg:py-10 max-w-[1400px] mx-auto w-full overflow-hidden text-left">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between w-full mb-8">
            <button onClick={() => setIsPlayerExpanded(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronDown className="w-8 h-8 text-white" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Now Playing</p>
              <p className="text-sm font-bold text-white mt-1 truncate max-w-[200px] md:max-w-md">{currentTrack.title}</p>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Info className="w-6 h-6 text-white/40" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 flex-1 items-center lg:items-center overflow-hidden min-h-0">
            {/* Left: Enhanced Cover Art & Track Info */}
            <div className="w-full max-w-[300px] md:max-w-[400px] lg:w-[450px] shrink-0">
              <div className="aspect-square rounded-xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.7)] border border-white/10 group relative bg-black/40">
                <img src={getImageUrl(currentTrack)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
              </div>

              <div className="mt-8 space-y-4 text-left">
                 <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 overflow-hidden">
                      <h2 className="text-2xl lg:text-3xl font-bold-700 text-white tracking-tight truncate">{currentTrack.title}</h2>
                      <p 
                        className="text-lg font-semibold-600 mt-1 opacity-90 truncate transition-colors duration-1000"
                        style={{ color: `rgb(var(--glow-rgb))` }}
                      >
                        {renderArtists(currentTrack, (name, id) => {
                          setIsPlayerExpanded(false);
                          viewArtist(name, id);
                        })}
                      </p>
                    </div>
                    <Heart 
                      onClick={() => toggleLike(currentTrack)}
                      className={`w-7 h-7 lg:w-8 lg:h-8 shrink-0 cursor-pointer transition-all hover:scale-110`} 
                      style={{ 
                        color: isLiked ? `rgb(var(--glow-rgb))` : 'rgba(255,255,255,0.2)',
                        fill: isLiked ? `rgb(var(--glow-rgb))` : 'transparent'
                      }}
                    />
                 </div>
                 
                 {/* Secondary Actions */}
                 <div className="flex items-center gap-6 pt-2 text-white/40">
                    <button className="hover:text-white transition-colors"><ListMusic className="w-5 h-5" /></button>
                    <button className="hover:text-white transition-colors"><Share2 className="w-5 h-5" /></button>
                    <button onClick={() => handleDownload(currentTrack)} className="hover:text-white transition-colors"><Download className="w-5 h-5" /></button>
                 </div>
              </div>
            </div>

            {/* Right: Immersive Lyrics */}
            <div className="flex-1 w-full h-full flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between gap-4 mb-4 px-12">
                 <h3 className="text-xs font-bold-700 uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-bright-accent animate-pulse" />
                    Lyrics
                 </h3>
                 <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1 border border-white/5 text-[10px] font-bold text-white/40">
                    <span>Sync</span>
                    <button onClick={() => setLyricsOffset(prev => prev - 1)} className="hover:text-white px-1">-</button>
                    <span className="text-white w-6 text-center">{lyricsOffset}s</span>
                    <button onClick={() => setLyricsOffset(prev => prev + 1)} className="hover:text-white px-1">+</button>
                 </div>
              </div>
              <div 
                ref={lyricsRef}
                onWheel={handleLyricsInteraction}
                onTouchMove={handleLyricsInteraction}
                onMouseDown={handleLyricsInteraction}
                className="flex-1 overflow-y-auto px-12 space-y-6 lg:space-y-8 custom-scrollbar scroll-smooth lyrics-mask py-[30vh] lg:py-[40vh] text-left"
              >
                {lyrics && lyrics.length > 0 ? lyrics.map((line, i) => {
                  const adjustedTime = line.time === -1 ? -1 : line.time + lyricsOffset;
                  const isActive = adjustedTime !== -1 && adjustedTime <= currentTime && (lyrics[i+1]?.time + lyricsOffset > currentTime || !lyrics[i+1]);
                  
                  return (
                    <p 
                      key={i} 
                      className={`
                        text-xl lg:text-3xl font-bold transition-all duration-500 cursor-pointer py-1 lg:py-2 origin-left
                        ${isActive 
                          ? 'text-white opacity-100 scale-105 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]' 
                          : 'text-white/20 hover:opacity-80'
                        }
                      `}
                      onClick={() => line.time !== -1 && handleSeek({ target: { value: line.time + lyricsOffset } })}
                    >
                      {line.text}
                    </p>
                  );
                }) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 italic">
                    <Mic2 className="w-12 h-12 mb-4" />
                    <p className="text-lg">No lyrics available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Control Suite */}
          <div className="mt-auto w-full max-w-3xl mx-auto pt-8">
             <div className="w-full mb-6 progress-container">
                <div className="flex-1 h-1 relative flex items-center group cursor-pointer text-left">
                  <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={displayTime}
                    onInput={onSeekChange}
                    onMouseUp={onSeekMouseUp}
                    onTouchEnd={onSeekMouseUp}
                    className="progress-slider absolute inset-0 w-full h-full z-20"
                  />
                  <div className="absolute inset-y-0 left-0 bg-white progress-bar-fill rounded-full pointer-events-none" style={{ width: `${(displayTime / (duration || 1)) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-3 px-1 text-[10px] font-bold text-white/40 font-mono">
                  <span>{formatTime(displayTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
             </div>

             <div className="flex items-center justify-between">
                <button onClick={() => setIsShuffle(!isShuffle)} className={`p-2 transition-all ${isShuffle ? 'text-text-bright-accent' : 'text-white/30 hover:text-white'}`}>
                  <Shuffle className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-8 lg:gap-12">
                  <button onClick={handlePrev} className="text-white hover:scale-110 transition-all active:scale-95"><SkipBack className="w-7 h-7 fill-current" /></button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                  </button>
                  <button onClick={handleNext} className="text-white hover:scale-110 transition-all active:scale-95"><SkipForward className="w-7 h-7 fill-current" /></button>
                </div>
                <button onClick={toggleRepeat} className={`relative p-2 transition-all ${repeatMode !== 'off' ? 'text-text-bright-accent' : 'text-white/30 hover:text-white'}`}>
                  <Repeat className="w-5 h-5" />
                  {repeatMode === 'one' && <span className="absolute -top-1 -right-1 bg-text-bright-accent text-black text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">1</span>}
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Mini Player Bar - Spotify Style 3 Zones */}
      <div className={`
        fixed left-0 right-0 z-[60] bg-[#121212] border-t border-white/5 px-4 lg:px-4 flex items-center justify-between transition-all
        bottom-16 h-16 lg:bottom-0 lg:h-[90px] shadow-[0_-10px_50px_rgba(0,0,0,0.5)]
      `}>
        {/* Functional Slider (Mobile) */}
        <div className="absolute top-0 left-0 right-0 h-[4px] lg:hidden z-30">
          <input 
            type="range" min="0" max={duration || 0} value={displayTime} 
            onInput={onSeekChange}
            onMouseUp={onSeekMouseUp}
            onTouchEnd={onSeekMouseUp}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40"
          />
          <div className="absolute inset-0 bg-white/10" />
          <div className="absolute inset-y-0 left-0 bg-white transition-all duration-150" style={{ width: `${(displayTime / (duration || 1)) * 100}%` }} />
        </div>

        {/* Zone 1: Track Info */}
        <div className="flex items-center gap-3 w-1/2 lg:w-[30%] relative z-10">
          <div 
            onClick={() => setIsPlayerExpanded(true)}
            className="w-10 h-10 lg:w-14 lg:h-14 rounded-md overflow-hidden shadow-md cursor-pointer relative group shrink-0"
          >
            <img src={getImageUrl(currentTrack)} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ChevronDown className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col justify-center overflow-hidden mr-4">
            <h4 onClick={() => setIsPlayerExpanded(true)} className="text-xs lg:text-sm font-semibold text-white truncate hover:underline cursor-pointer tracking-tight text-left">
              {currentTrack.title}
            </h4>
            <p className="text-[10px] lg:text-xs text-text-subdued truncate text-left">
              {renderArtists(currentTrack, viewArtist)}
            </p>
          </div>
          <Heart 
            onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
            className={`w-4 h-4 lg:w-5 lg:h-5 hidden lg:block cursor-pointer transition-colors ${isLiked ? 'text-text-bright-accent fill-text-bright-accent' : 'text-text-subdued hover:text-white'}`} 
          />
        </div>

        {/* Zone 2: Controls */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-[40%] px-4 relative z-10">
          <div className="flex items-center gap-6 mb-2">
            <button onClick={() => setIsShuffle(!isShuffle)} className={`transition-all ${isShuffle ? 'text-text-bright-accent' : 'text-text-subdued hover:text-white'}`}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={handlePrev} className="text-text-subdued hover:text-white transition-all"><SkipBack className="w-5 h-5 fill-current" /></button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={handleNext} className="text-text-subdued hover:text-white transition-all"><SkipForward className="w-5 h-5 fill-current" /></button>
            <button onClick={toggleRepeat} className={`relative transition-all ${repeatMode !== 'off' ? 'text-text-bright-accent' : 'text-text-subdued hover:text-white'}`}>
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && <span className="absolute -top-1 -right-1 bg-[#121212] text-text-bright-accent text-[8px] font-bold w-3 h-3 rounded-full flex items-center justify-center">1</span>}
            </button>
          </div>
          
          <div className="w-full flex items-center gap-2 progress-container group text-left">
            <span className="text-[10px] text-text-subdued w-10 text-right font-mono">{formatTime(displayTime)}</span>
            <div className="flex-1 h-1 relative flex items-center">
              <input 
                type="range" min="0" max={duration || 0} value={displayTime} 
                onInput={onSeekChange}
                onMouseUp={onSeekMouseUp}
                onTouchEnd={onSeekMouseUp}
                className="progress-slider absolute inset-0 w-full h-full z-20"
              />
              <div className="absolute inset-y-0 left-0 bg-white progress-bar-fill rounded-full pointer-events-none" style={{ width: `${(displayTime / (duration || 1)) * 100}%` }} />
            </div>
            <span className="text-[10px] text-text-subdued w-10 font-mono text-left">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mobile Simple Controls */}
        <div className="flex lg:hidden items-center gap-3 relative z-10">
          <button onClick={() => setIsPlayerExpanded(true)} className={`p-2 transition-colors ${lyrics?.length > 0 ? 'text-text-bright-accent' : 'text-text-subdued'}`}>
            <Mic2 className="w-5 h-5" />
          </button>
          <Heart onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }} className={`w-5 h-5 ${isLiked ? 'text-text-bright-accent fill-text-bright-accent' : 'text-text-subdued'}`} />
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 flex items-center justify-center text-white">
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
        </div>

        {/* Zone 3: Volume & Actions */}
        <div className="hidden lg:flex items-center justify-end gap-4 w-[30%] relative z-10">
          <button onClick={() => setIsPlayerExpanded(true)} className={`p-2 hover:text-white transition-colors ${lyrics?.length > 0 ? 'text-text-bright-accent' : 'text-text-subdued'}`}>
            <Mic2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 w-32 progress-container">
            <button onClick={() => setVolume(v => v === 0 ? 0.7 : 0)}>
                {volume === 0 ? <VolumeX className="w-4 h-4 text-text-subdued" /> : <Volume2 className="w-4 h-4 text-text-subdued hover:text-white" />}
            </button>
            <div className="flex-1 h-1 relative flex items-center">
              <input 
                type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="progress-slider absolute inset-0 w-full h-full z-20"
              />
              <div className="absolute inset-y-0 left-0 bg-white progress-bar-fill rounded-full pointer-events-none" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerBar;
