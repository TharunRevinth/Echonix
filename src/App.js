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
  getHost, ENGINES, formatTime
} from './utils';

const cleanString = (str) => {
  if (!str) return "";
  return str
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\[feat\..*?\]/gi, '')
    .replace(/\(with.*?\)/gi, '')
    .replace(/\[with.*?\]/gi, '')
    .replace(/\(official.*?\)/gi, '')
    .replace(/\[official.*?\]/gi, '')
    .replace(/\(video.*?\)/gi, '')
    .replace(/\[video.*?\]/gi, '')
    .replace(/\(audio.*?\)/gi, '')
    .replace(/\[audio.*?\]/gi, '')
    .replace(/\(lyrics.*?\)/gi, '')
    .replace(/\[lyrics.*?\]/gi, '')
    .replace(/\(remix.*?\)/gi, '')
    .replace(/\[remix.*?\]/gi, '')
    .replace(/\(lofi.*?\)/gi, '')
    .replace(/\[lofi.*?\]/gi, '')
    .replace(/\(prod\..*?\)/gi, '')
    .replace(/\[prod\..*?\]/gi, '')
    .replace(/- Topic$/gi, '')
    .replace(/ft\..*? /gi, '')
    .replace(/feat\..*? /gi, '')
    .trim();
};

const parseLRC = (lrc) => {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const result = [];
  const timeRegex = /\[(\d+):(\d+\.\d+)\]/;

  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = line.replace(timeRegex, '').trim();
      if (text) result.push({ time, text });
    }
  });
  return result;
};

function App() {
  // --- STATE ---
  const [activeEngine, setActiveEngine] = useState(`http://${getHost()}:5001/api`);
  const [currentView, setCurrentView] = useState('home');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [lyricsOffset, setLyricsOffset] = useState(0);
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
  const [playlistData, setPlaylistData] = useState(null);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const [searchType, setSearchType] = useState('tracks'); // 'tracks' or 'playlists'
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'

  const audioRef = useRef(null);
  const lyricsRef = useRef(null);
  const lyricsAbortController = useRef(null);
  const lastActiveIndex = useRef(-1);

  const [likedSongs, setLikedSongs] = useState(() => JSON.parse(localStorage.getItem('likedSongs') || '[]'));
  const [localTapes, setLocalTapes] = useState(() => JSON.parse(localStorage.getItem('localTapes') || '[]'));
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'));
  const [trendingPlaylists, setTrendingPlaylists] = useState([]);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- PERSISTENCE ---
  useEffect(() => {
    const loadTrending = async () => {
      try {
        const pRes = await fetchWithFallback('/trending-playlists');
        setTrendingPlaylists(pRes.data);
        const tRes = await fetchWithFallback('/trending-tracks');
        setTrendingTracks(tRes.data);
      } catch (e) {}
    };
    loadTrending();
  }, []);

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
        const adjustedTime = line.time === -1 ? -1 : line.time + lyricsOffset;
        if (adjustedTime !== -1 && adjustedTime <= currentTime) return idx;
        return acc;
      }, 0);

      // Only scroll if the active line has changed, to prevent animation jitter,
      // AND if the user is not currently manually scrolling
      if (activeIndex !== lastActiveIndex.current && (!lyricsRef.current.isUserInteracting)) {
        lastActiveIndex.current = activeIndex;
        const lineElements = lyricsRef.current.children;
        if (lineElements[activeIndex]) {
          const targetElement = lineElements[activeIndex];
          const containerHeight = lyricsRef.current.clientHeight;
          // Precisely center the middle of the line in the middle of the container
          lyricsRef.current.scrollTo({
            top: targetElement.offsetTop - (containerHeight / 2) + (targetElement.clientHeight / 2),
            behavior: 'smooth'
          });
        }
      } else if (activeIndex !== lastActiveIndex.current) {
         // Silently update the index so it doesn't try to scroll again later 
         // unless the singer moves to a NEW line after the user stopped scrolling
         lastActiveIndex.current = activeIndex;
      }
    }
  }, [currentTime, lyrics, lyricsOffset]);

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

  // --- AI HELPER ---
  const callAI = async (prompt, signal = null) => {
    // List of models to try in order. Updated with verified IDs from OpenRouter (June 2026).
    const models = [
      "google/gemini-3.5-flash",
      "liquid/lfm-2.5-1.2b-instruct:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemma-4-31b-it:free"
    ];

    for (const model of models) {
      try {
        const res = await axios.post(`http://${getHost()}:5001/api/ai-chat`, {
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000 // Global limit to prevent "insufficient credits" 402 errors
        }, {
          signal: signal
        });
        
        if (res.data?.choices?.[0]?.message?.content) {
          return res.data.choices[0].message.content;
        }
      } catch (err) {
        if (err.name === 'AbortError' || axios.isCancel(err)) throw err;
        console.warn(`AI model ${model} failed, trying next...`, err.response?.data || err.message);
      }
    }
    throw new Error("All AI models failed or returned no content.");
  };

  // --- HANDLERS ---
  const fetchPlaylist = async (urlOrId) => {
    setIsPlaylistLoading(true);
    setCurrentView('playlist');
    try {
      const { data } = await fetchWithFallback(`/playlist?id=${encodeURIComponent(urlOrId)}`);
      setPlaylistData(data);
      setSearchResults(data.items);
    } catch (err) {
      console.error("Playlist Error", err);
      alert("FAILED TO LOAD PLAYLIST. Ensure it is public.");
    } finally {
      setIsPlaylistLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query) return;

    // Detect Playlist URL
    if (query.includes('list=') || query.includes('/playlist')) {
      fetchPlaylist(query);
      return;
    }

    // Handle Playlist Search
    if (searchType === 'playlists') {
      setCurrentView('search');
      setIsAiLoading(true);
      try {
        const { data } = await fetchWithFallback(`/trending-playlists?q=${encodeURIComponent(query + " music playlist")}`);
        setSearchResults(data);
      } catch (err) {
        alert("PLAYLIST SEARCH OFFLINE");
      } finally {
        setIsAiLoading(false);
      }
      return;
    }

    setCurrentView('search');
    
    if (isAiMode) {
      setIsAiLoading(true);
      setSearchResults([]);
      try {
        const prompt = `You are a music expert. The user wants music for the vibe: "${query}". 
        Suggest 15 specific, highly relevant popular songs that perfectly match this mood/activity.
        Include various artists. 
        Return ONLY a list of "Song Name - Artist Name" separated by newlines. 
        Do not include numbers, introductory text, or explanations.`;
        
        const aiContent = await callAI(prompt);
        console.log("AI Suggestions Raw:", aiContent);
        
        // Improved parsing for newlines and potential list markers
        const suggestions = aiContent
          .split('\n')
          .map(s => s.replace(/^\d+\.\s*/, '').replace(/^- \s*/, '').trim())
          .filter(s => s.length > 3 && s.includes('-'));
        
        console.log("Parsed Suggestions:", suggestions);

        // Process all suggestions in parallel blocks to avoid overwhelming the server but still getting many results
        const searchPromises = suggestions.map(async (s) => {
          try {
            const { data, engine } = await fetchWithFallback(`/search?q=${encodeURIComponent(s)}&filter=music_songs`);
            if (data.items && data.items.length > 0) {
              // Take the top result for each specific AI suggestion
              return { ...data.items[0], engine };
            }
          } catch (err) {
            console.warn(`Failed search for suggestion: ${s}`, err.message);
          }
          return null;
        });

        const resolvedResults = await Promise.all(searchPromises);
        const uniqueResults = [];
        const seenIds = new Set();

        // Deduplicate by ID and filter nulls
        resolvedResults.forEach(res => {
          if (res && !seenIds.has(res.id)) {
            seenIds.add(res.id);
            uniqueResults.push(res);
          }
        });

        setSearchResults(uniqueResults);
      } catch (e) { 
        console.error("AI Search Error", e.message);
        alert("AI Search failed. Check your API key and connection.");
      }
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
        const index = newQueue.findIndex(t => t.id === track.id || t.url === track.url);
        setCurrentIndex(index !== -1 ? index : 0);
      } else if (queue.length > 0) {
        const index = queue.findIndex(t => t.id === track.id || t.url === track.url);
        if (index !== -1) setCurrentIndex(index);
      }

      let videoId = track.id || track.url?.split('v=')[1];
      let ytDuration = track.duration;

      // --- LRCLIB RESOLUTION ---
      // If it's a track from LRCLIB search, we need to find its YouTube counterpart
      if (track.isLrclib) {
        setLyrics([{ time: 0, text: "Resolving audio frequency..." }]);
        const resolveRes = await axios.get(`http://${getHost()}:5001/api/resolve-youtube?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.uploaderName)}`);
        videoId = resolveRes.data.videoId;
        ytDuration = resolveRes.data.duration;
      }

      const { data, engine } = await fetchWithFallback(`/streams/${videoId}`);
      
      let streamUrl;
      if (data.isLocalStream) streamUrl = `${engine}/stream?id=${videoId}`;
      else streamUrl = (data.audioStreams?.find(s => s.format === 'M4A') || data.audioStreams?.[0])?.url;

      const updatedTrack = { ...track, streamUrl, engine, videoId, ytDuration };
      setCurrentTrack(updatedTrack);
      setIsPlaying(true);
      setLyricsOffset(0); 

      // Use the updated track which might contain lyrics from search
      fetchLyrics(updatedTrack);
      setRecentlyPlayed(prev => [updatedTrack, ...prev.filter(t => t.id !== track.id)].slice(0, 50));
    } catch (err) { alert("PLAYBACK ENGINE OFFLINE OR RESOLUTION FAILED"); }
  };

  const fetchLyrics = async (track) => {
    if (lyricsAbortController.current) lyricsAbortController.current.abort();
    lyricsAbortController.current = new AbortController();
    
    // 1. If we already have lyrics from LRCLIB search
    if (track.syncedLyrics) {
      setLyrics(parseLRC(track.syncedLyrics));
      if (track.ytDuration && track.duration) {
          const diff = Math.floor(track.ytDuration - track.duration);
          if (diff > 2) setLyricsOffset(diff);
      }
      return;
    } else if (track.plainLyrics) {
      setLyrics(track.plainLyrics.split('\n').filter(l => l.trim()).map((l, i, arr) => ({
        time: (i / arr.length) * (track.duration || track.ytDuration || 180),
        text: l.trim()
      })));
      return;
    }

    const cleanT = cleanString(track.title);
    const cleanA = cleanString(track.uploaderName || track.artistName);
    setLyrics([{ time: 0, text: "Searching lyrics..." }]);
    
    const tryFetch = async (artist, title) => {
      try {
        const res = await axios.get(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`, {
          signal: lyricsAbortController.current.signal
        });
        if (res.data.syncedLyrics) {
          setLyrics(parseLRC(res.data.syncedLyrics));
          if (res.data.duration && track.ytDuration) {
              const diff = Math.floor(track.ytDuration - res.data.duration);
              if (diff > 2) setLyricsOffset(diff);
          }
          return true;
        }
      } catch (e) {}
      return false;
    };

    // Attempt 1: Standard clean
    if (await tryFetch(cleanA, cleanT)) return;

    // Attempt 2: More aggressive title cleaning (remove everything after " - ")
    const superCleanT = cleanT.split(' - ')[0].trim();
    if (superCleanT !== cleanT) {
      if (await tryFetch(cleanA, superCleanT)) return;
    }

    // Attempt 3: Search fallback
    try {
      const searchRes = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanT + " " + cleanA)}`, {
        signal: lyricsAbortController.current.signal
      });
      if (searchRes.data && searchRes.data.length > 0) {
        const bestMatch = searchRes.data.find(l => l.syncedLyrics) || searchRes.data[0];
        if (bestMatch.syncedLyrics) {
          setLyrics(parseLRC(bestMatch.syncedLyrics));
          if (bestMatch.duration && track.ytDuration) {
              const diff = Math.floor(track.ytDuration - bestMatch.duration);
              if (diff > 2) setLyricsOffset(diff);
          }
          return;
        } else if (bestMatch.plainLyrics) {
          setLyrics(bestMatch.plainLyrics.split('\n').filter(l => l.trim()).map((l, i, arr) => ({
            time: (i / arr.length) * (bestMatch.duration || track.ytDuration || 180),
            text: l.trim()
          })));
          return;
        }
      }
    } catch (e) {}

    setLyrics([{ time: 0, text: "Lyrics not found." }]);
  };

  const handleNext = () => {
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * queue.length);
      playTrack(queue[nextIndex]);
      return;
    }

    const nextIndex = (currentIndex + 1) % queue.length;
    // Stop at end if repeat is off and we've cycled back to start
    if (nextIndex === 0 && repeatMode === 'off' && currentIndex !== -1) {
        setIsPlaying(false);
        return;
    }
    playTrack(queue[nextIndex]);
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    
    if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        return;
    }

    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * queue.length);
      playTrack(queue[nextIndex]);
      return;
    }

    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    playTrack(queue[prevIndex]);
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
            lyrics={lyrics}
            currentTime={currentTime}
            lyricsRef={lyricsRef}
            playlistData={playlistData}
            isPlaylistLoading={isPlaylistLoading}
            trendingPlaylists={trendingPlaylists}
            trendingTracks={trendingTracks}
            fetchPlaylist={fetchPlaylist}
            searchType={searchType}
            setSearchType={setSearchType}
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
        isPlayerExpanded={isPlayerExpanded}
        setIsPlayerExpanded={setIsPlayerExpanded}
        isShuffle={isShuffle}
        setIsShuffle={setIsShuffle}
        repeatMode={repeatMode}
        setRepeatMode={setRepeatMode}
        lyrics={lyrics}
        lyricsOffset={lyricsOffset}
        setLyricsOffset={setLyricsOffset}
        lyricsRef={lyricsRef}
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
