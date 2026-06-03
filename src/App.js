import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './styles.css';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PlayerBar from './components/PlayerBar';
import ViewRenderer from './components/ViewRenderer';

// Utils
import { 
  getHost, ENGINES, formatTime, cleanString, parseLRC 
} from './utils';

const OPENROUTER_KEY = process.env.REACT_APP_OPENROUTER_KEY;

function App() {
  // --- STATE ---
  const [activeEngine, setActiveEngine] = useState(`http://${getHost()}:5001/api`);
  const [currentView, setCurrentView] = useState('home');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isAiMode, setIsAiMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [radioStations, setRadioStations] = useState([]);
  const [isRadioLoading, setIsRadioLoading] = useState(false);
  const [radioQuery, setRadioQuery] = useState('');
  const [isMixtapeView, setIsMixtapeView] = useState(false);

  const audioRef = useRef(null);
  const lyricsRef = useRef(null);
  const lyricsAbortController = useRef(null);

  const [likedSongs, setLikedSongs] = useState(() => JSON.parse(localStorage.getItem('likedSongs') || '[]'));
  const [localTapes, setLocalTapes] = useState(() => JSON.parse(localStorage.getItem('localTapes') || '[]'));
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('likedSongs', JSON.stringify(likedSongs)); }, [likedSongs]);
  useEffect(() => { localStorage.setItem('localTapes', JSON.stringify(localTapes)); }, [localTapes]);
  useEffect(() => { localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed)); }, [recentlyPlayed]);

  // --- AUDIO EFFECTS ---
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && currentTrack?.streamUrl) {
      if (isPlaying) audioRef.current.play().catch(e => console.error("Playback failed", e));
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // --- LYRICS SCROLL ---
  useEffect(() => {
    if (lyricsRef.current && lyrics.length > 0) {
      const activeIndex = lyrics.reduce((acc, line, idx) => {
        if (line.time !== -1 && line.time <= currentTime) return idx;
        return acc;
      }, 0);

      const lineElements = lyricsRef.current.children;
      if (lineElements[activeIndex]) {
        const targetElement = lineElements[activeIndex];
        const containerHeight = lyricsRef.current.clientHeight;
        lyricsRef.current.scrollTo({
          top: targetElement.offsetTop - (containerHeight / 3),
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, lyrics]);

  // --- ENGINE LOGIC ---
  const fetchWithFallback = async (endpoint) => {
    const currentHost = getHost();
    const preferredEngines = [
      `http://${currentHost}:5001/api`,
      ...ENGINES
    ];

    for (const engine of preferredEngines) {
      try {
        const base = engine.endsWith('/') ? engine.slice(0, -1) : engine;
        const isInternalApi = engine.includes('localhost') || engine.includes(currentHost);

        if (isInternalApi && endpoint.startsWith('/streams/')) {
          const videoId = endpoint.split('/streams/')[1];
          return { data: { isLocalStream: true, videoId }, engine: base };
        }

        const url = `${base}${endpoint}`;
        const res = await axios.get(url, { timeout: 15000 });
        setActiveEngine(base);
        return { data: res.data, engine: base };
      } catch (err) {
        console.warn(`Engine ${engine} failed, rotating...`);
      }
    }
    throw new Error("ALL ENGINES OFFLINE");
  };

  const filterMusicResults = (items) => {
    if (!items) return [];
    return items.filter(v => {
      const title = (v.title || "").toLowerCase();
      const channel = (v.uploaderName || v.author?.name || "").toLowerCase();
      const dur = v.duration || v.seconds || 0;
      return dur <= 540 && dur >= 60 && !['vlog', 'podcast', 'tutorial'].some(k => title.includes(k));
    });
  };

  // --- HANDLERS ---
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query) return;
    setCurrentView('search');
    
    if (isAiMode) {
      setIsAiLoading(true);
      setSearchResults([]);
      try {
        const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
          model: "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: `Suggest 8 specific popular songs for vibe: "${query}". Return ONLY a comma-separated list of "Song - Artist".` }]
        }, {
          headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "X-Title": "Echonix" }
        });
        const suggestions = res.data.choices?.[0]?.message?.content.split(',').map(s => s.trim()) || [];
        let allResults = [];
        for (const s of suggestions) {
          try {
            const { data, engine } = await fetchWithFallback(`/search?q=${encodeURIComponent(s)}&filter=music_songs`);
            if (data.items?.[0]) allResults.push({ ...data.items[0], engine });
          } catch (err) {}
        }
        setSearchResults(filterMusicResults(allResults));
      } catch (e) { console.error("AI Search Error", e); }
      finally { setIsAiLoading(false); }
      return;
    }

    try {
      const { data, engine } = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      setSearchResults(filterMusicResults(data.items.map(item => ({ ...item, engine }))));
    } catch (err) { alert("SEARCH ENGINE OFFLINE"); }
  };

  const playTrack = async (track, newQueue = null) => {
    if (track.isRadio) {
      setCurrentTrack(track);
      setIsPlaying(true);
      return;
    }
    try {
      if (newQueue) {
        setQueue(newQueue);
        const index = newQueue.findIndex(t => t.url === track.url);
        setCurrentIndex(index !== -1 ? index : 0);
      } else if (queue.length > 0) {
        const index = queue.findIndex(t => t.url === track.url);
        if (index !== -1) setCurrentIndex(index);
      }

      const videoId = track.id || track.url?.split('v=')[1];
      const { data, engine } = await fetchWithFallback(`/streams/${videoId}`);
      
      let streamUrl;
      if (data.isLocalStream) streamUrl = `${engine}/stream?id=${videoId}`;
      else streamUrl = (data.audioStreams?.find(s => s.format === 'M4A') || data.audioStreams?.[0])?.url;

      setCurrentTrack({ ...track, streamUrl, engine });
      setIsPlaying(true);
      fetchLyrics(track.title, track.uploaderName);
      setRecentlyPlayed(prev => [track, ...prev.filter(t => t.url !== track.url)].slice(0, 50));
    } catch (err) { alert("PLAYBACK ENGINE OFFLINE"); }
  };

  const fetchLyrics = async (t, a) => {
    if (lyricsAbortController.current) lyricsAbortController.current.abort();
    lyricsAbortController.current = new AbortController();
    const cleanT = cleanString(t);
    const cleanA = cleanString(a);
    setLyrics([{ time: 0, text: "Searching lyrics..." }]);
    
    try {
      const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanA)}/${encodeURIComponent(cleanT)}`, {
        signal: lyricsAbortController.current.signal
      });
      if (res.data.lyrics) { 
        setLyrics(res.data.lyrics.split('\n').filter(l => l.trim()).map((l, i, arr) => ({
          time: (i / arr.length) * (duration || 180),
          text: l.trim()
        })));
        return; 
      }
    } catch (e) {}

    // AI Fallback
    try {
      const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: `Return ONLY the LRC format lyrics for "${cleanT}" by "${cleanA}".` }]
      }, {
        headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "X-Title": "Echonix" },
        signal: lyricsAbortController.current.signal
      });
      const aiLyrics = res.data.choices?.[0]?.message?.content;
      if (aiLyrics) setLyrics(parseLRC(aiLyrics));
      else setLyrics([{ time: 0, text: "Lyrics not found." }]);
    } catch (err) { setLyrics([{ time: 0, text: "Lyrics not found." }]); }
  };

  const explainLyrics = async () => {
    if (!lyrics.length) return;
    setExplanation("AI analyzing vibe...");
    try {
      const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: `Explain the vibe of these lyrics in 3 technical points: ${JSON.stringify(lyrics)}` }]
      }, {
        headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "X-Title": "Echonix" }
      });
      setExplanation(res.data.choices?.[0]?.message?.content || "Analysis failed.");
    } catch (e) { setExplanation("AI Offline."); }
  };

  const handleNext = () => {
    if (queue.length === 0 || currentIndex === -1) return;
    playTrack(queue[(currentIndex + 1) % queue.length]);
  };

  const handlePrev = () => {
    if (queue.length === 0 || currentIndex === -1) return;
    playTrack(queue[(currentIndex - 1 + queue.length) % queue.length]);
  };

  const fetchRadioStations = async (q = '') => {
    setIsRadioLoading(true);
    try {
      const url = q 
        ? `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(q)}&limit=20&order=votes&reverse=true`
        : `https://de1.api.radio-browser.info/json/stations/search?tag=synthwave&limit=20&order=votes&reverse=true`;
      const res = await axios.get(url);
      setRadioStations(res.data);
    } catch (e) {} finally { setIsRadioLoading(false); }
  };

  const playRadioStation = (station) => {
    const proxyUrl = `http://${getHost()}:5001/api/proxy-radio?url=${encodeURIComponent(station.url_resolved)}`;
    playTrack({
      title: station.name, uploaderName: station.tags, thumbnail: station.favicon,
      streamUrl: proxyUrl, id: station.stationuuid, isRadio: true
    });
  };

  const getImageUrl = (track) => {
    if (!track) return "";
    const url = typeof track === 'string' ? track : track.thumbnail;
    if (!url) return "";
    if (url.startsWith('http')) return url;
    const base = (track.engine || activeEngine).replace(/\/api$/, '');
    return `${base}${url}`;
  };

  const toggleLike = (track) => {
    setLikedSongs(prev => prev.find(s => s.url === track.url) ? prev.filter(s => s.url !== track.url) : [...prev, track]);
  };

  const toggleLocalTape = (track) => {
    setLocalTapes(prev => prev.find(s => s.url === track.url) ? prev.filter(s => s.url !== track.url) : [...prev, track]);
  };

  const handleDownload = (track) => {
    const videoId = track.id || track.url?.split('v=')[1];
    window.location.href = `http://${getHost()}:5001/api/download?id=${videoId}&title=${encodeURIComponent(track.title)}`;
  };

  return (
    <div className="flex h-screen bg-bg-dark text-white overflow-hidden font-sans relative">
      <div className="ambient-glow" />
      
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Header 
          query={query} 
          setQuery={setQuery} 
          handleSearch={handleSearch} 
          setIsMobileOpen={setIsMobileOpen} 
        />

        <main className="flex-1 overflow-y-auto px-6 lg:px-10 custom-scrollbar">
          <ViewRenderer 
            currentView={currentView}
            searchResults={searchResults}
            handleSearch={handleSearch}
            query={query}
            setQuery={setQuery}
            isAiMode={isAiMode}
            setIsAiMode={setIsAiMode}
            isAiLoading={isAiLoading}
            playTrack={playTrack}
            getImageUrl={getImageUrl}
            formatTime={formatTime}
            recentlyPlayed={recentlyPlayed}
            likedSongs={likedSongs}
            toggleLike={toggleLike}
            handleDownload={handleDownload}
            addToQueue={(t) => setQueue(prev => [...prev.filter(x => x.url !== t.url), t])}
            radioStations={radioStations}
            isRadioLoading={isRadioLoading}
            radioQuery={radioQuery}
            setRadioQuery={setRadioQuery}
            fetchRadioStations={fetchRadioStations}
            playRadioStation={playRadioStation}
            setIsMixtapeView={setIsMixtapeView}
            isMixtapeView={isMixtapeView}
            queue={queue}
            currentIndex={currentIndex}
            setQueue={setQueue}
            setCurrentIndex={setCurrentIndex}
            explanation={explanation}
            explainLyrics={explainLyrics}
            lyrics={lyrics}
            currentTime={currentTime}
            lyricsRef={lyricsRef}
          />
        </main>
      </div>

      <PlayerBar 
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentTime={currentTime}
        duration={duration}
        handleSeek={(e) => {
          const t = parseFloat(e.target.value);
          setCurrentTime(t);
          if (audioRef.current) audioRef.current.currentTime = t;
        }}
        handleNext={handleNext}
        handlePrev={handlePrev}
        volume={volume}
        setVolume={setVolume}
        formatTime={formatTime}
        getImageUrl={getImageUrl}
        toggleLike={toggleLike}
        likedSongs={likedSongs}
        handleDownload={handleDownload}
        toggleLocalTape={toggleLocalTape}
        localTapes={localTapes}
      />

      <audio 
        ref={audioRef} 
        src={currentTrack?.streamUrl} 
        onEnded={handleNext}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} 
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
      />
    </div>
  );
}

export default App;
