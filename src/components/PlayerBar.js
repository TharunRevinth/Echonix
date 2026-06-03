import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Heart, Repeat, Shuffle, Download, CassetteTape } from 'lucide-react';

const PlayerBar = ({ 
  currentTrack, isPlaying, setIsPlaying, currentTime, duration, handleSeek, 
  handleNext, handlePrev, volume, setVolume, formatTime, getImageUrl,
  toggleLike, likedSongs, handleDownload, toggleLocalTape, localTapes
}) => {
  if (!currentTrack) return null;

  const isLiked = likedSongs.find(s => s.url === currentTrack.url);
  const isTaped = localTapes.find(s => s.url === currentTrack.url);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-bg-dark/90 backdrop-blur-2xl border-t border-glass-border px-6 flex items-center justify-between z-50">
      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        <div className="w-14 h-14 rounded-xl overflow-hidden border border-glass-border">
          <img src={getImageUrl(currentTrack)} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
          <p className="text-xs text-text-secondary truncate">{currentTrack.uploaderName}</p>
        </div>
        <Heart 
          onClick={() => toggleLike(currentTrack)}
          className={`w-5 h-5 cursor-pointer transition-all ${isLiked ? 'text-accent-purple fill-accent-purple' : 'text-text-secondary hover:text-white'}`} 
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl px-10">
        <div className="flex items-center gap-6">
          <button className="text-text-secondary hover:text-white transition-colors"><Shuffle className="w-4 h-4" /></button>
          <button onClick={handlePrev} className="text-text-secondary hover:text-white transition-colors"><SkipBack className="w-5 h-5 fill-current" /></button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button onClick={handleNext} className="text-text-secondary hover:text-white transition-colors"><SkipForward className="w-5 h-5 fill-current" /></button>
          <button className="text-text-secondary hover:text-white transition-colors"><Repeat className="w-4 h-4" /></button>
        </div>
        
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-medium text-text-secondary w-10 text-right">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 relative group cursor-pointer">
            <input 
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            <div className="absolute inset-0 bg-glass-border rounded-full" />
            <div 
              className="absolute inset-y-0 left-0 bg-accent-purple rounded-full shadow-glow-purple" 
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
            />
          </div>
          <span className="text-[10px] font-medium text-text-secondary w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume & Actions */}
      <div className="flex items-center gap-6 w-1/4 justify-end">
        <div className="hidden md:flex items-center gap-4">
          <Download 
            onClick={() => handleDownload(currentTrack)}
            className="w-5 h-5 text-text-secondary hover:text-white cursor-pointer transition-colors" 
          />
          <CassetteTape 
            onClick={() => toggleLocalTape(currentTrack)}
            className={`w-5 h-5 cursor-pointer transition-all ${isTaped ? 'text-accent-teal' : 'text-text-secondary hover:text-white'}`} 
          />
        </div>
        <div className="flex items-center gap-3 w-32 group">
          <Volume2 className="w-5 h-5 text-text-secondary group-hover:text-white transition-colors" />
          <div className="flex-1 h-1 relative cursor-pointer">
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            <div className="absolute inset-0 bg-glass-border rounded-full" />
            <div className="absolute inset-y-0 left-0 bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
