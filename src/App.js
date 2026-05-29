import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Play, Pause, SkipForward, SkipBack, Heart, 
  Volume2, Shuffle, Repeat, Library, Home, User, Mic2, Cpu,
  Radio, Headphones, CassetteTape, Music2, Plus, ListMusic, Download
} from 'lucide-react';
import axios from 'axios';
import './styles.css';

// --- UTILS ---
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

// --- CONFIGURATION & ENGINES ---
const OPENROUTER_KEY = process.env.REACT_APP_OPENROUTER_KEY;
if (!OPENROUTER_KEY) console.warn("WARNING: REACT_APP_OPENROUTER_KEY is not defined in the environment.");
else console.log("AI SYSTEM INITIALIZED: KEY LOADED (", OPENROUTER_KEY.substring(0, 6), "...)");

const getHost = () => {
  const host = window.location.hostname;
  return host === 'localhost' ? 'localhost' : host;
};

const ENGINES = [
  `http://${getHost()}:5001/api`,
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://api.piped.victr.me"
];

function App() {
  const [activeEngine, setActiveEngine] = useState(ENGINES[0]);
  const [currentView, setCurrentView] = useState('home');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [artistInfo, setArtistInfo] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isAiMode, setIsAiMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const audioRef = useRef(null);
  const lyricsRef = useRef(null);
  const [likedSongs, setLikedSongs] = useState(() => JSON.parse(localStorage.getItem('likedSongs') || '[]'));
  const [localTapes, setLocalTapes] = useState(() => JSON.parse(localStorage.getItem('localTapes') || '[]'));
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Auto-scroll lyrics based on progress
  useEffect(() => {
    if (lyricsRef.current && lyrics.length > 0) {
      // Find the current active line based on timestamps
      const activeIndex = lyrics.reduce((acc, line, idx) => {
        if (line.time !== -1 && line.time <= currentTime) return idx;
        return acc;
      }, 0);

      const lineElements = lyricsRef.current.children;
      if (lineElements[activeIndex]) {
        const targetElement = lineElements[activeIndex];
        const containerHeight = lyricsRef.current.clientHeight;
        const targetTop = targetElement.offsetTop;

        lyricsRef.current.scrollTo({
          top: targetTop - (containerHeight / 3),
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, lyrics]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // --- ENGINE ROTATION LOGIC ---
  const fetchWithFallback = async (endpoint) => {
    const currentHost = window.location.hostname;
    const preferredEngines = [
      `http://${currentHost}:5001/api`,
      ...ENGINES.filter(e => !e.includes(currentHost))
    ];

    for (const engine of preferredEngines) {
      try {
        const base = engine.endsWith('/') ? engine.slice(0, -1) : engine;
        const isInternalApi = engine.includes('localhost') || engine.includes(currentHost) || engine === '/api';

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
      const duration = v.duration || v.seconds || 0;
      
      const isTooLong = duration > 540;
      const isTooShort = duration < 60;
      
      const nonMusicKeywords = [
        'vlog', 'podcast', 'tutorial', 'full episode', 'trailer', 
        'teaser', 'review', 'reaction', 'interview', 'making of', 
        'behind the scenes', 'blockbuster', 'promo', 'movie talk',
        'preview', 'unboxing', 'live stream'
      ];

      const isNonMusic = nonMusicKeywords.some(keyword => title.includes(keyword));
      const isReviewChannel = channel.includes('review') || channel.includes('news') || channel.includes('fans club');
      
      return !isTooLong && !isTooShort && !isNonMusic && !isReviewChannel;
    });
  };

  // --- SEARCH & PLAYBACK ---
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
          messages: [{ role: "user", content: `Act as a retro music curator. Based on this vibe/setting: "${query}", suggest 8 specific, popular song titles and their uploader/artist names. Format the response ONLY as a comma-separated list of "Song - Artist". Do not include any other text.` }]
        }, {
          headers: { 
            "Authorization": `Bearer ${OPENROUTER_KEY}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "Echonix Stereo System"
          }
        });
        const suggestionText = res.data.choices?.[0]?.message?.content;
        if (suggestionText) {
          const suggestions = suggestionText.split(',').map(s => s.trim());
          let allResults = [];
          for (const s of suggestions) {
             try {
               const { data, engine } = await fetchWithFallback(`/search?q=${encodeURIComponent(s)}&filter=music_songs`);
               if (data.items?.[0]) allResults.push({ ...data.items[0], engine });
             } catch (err) {}
          }
          setSearchResults(filterMusicResults(allResults));
        }
      } catch (e) {
        console.error("AI Search Error:", e.response?.data || e.message);
        alert(`AI CURATOR OFFLINE: ${e.response?.data?.error?.message || e.message}`);
      } finally {
        setIsAiLoading(false);
      }
      return;
    }

    try {
      const { data, engine } = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      const taggedResults = data.items.map(item => ({ ...item, engine }));
      setSearchResults(filterMusicResults(taggedResults));
    } catch (err) { alert("ERROR: SEARCH ENGINE OFFLINE"); }
  };

  useEffect(() => {
    if (audioRef.current && currentTrack?.streamUrl) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  const playTrack = async (track, newQueue = null) => {
    console.log("Playing Track:", track.title, "Queue Size:", newQueue ? newQueue.length : queue.length);
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
      if (!videoId) throw new Error("Could not extract Video ID");
      
      const { data, engine } = await fetchWithFallback(`/streams/${videoId}`);
      
      let streamUrl;
      if (data.isLocalStream) {
        streamUrl = `${engine}/stream?id=${videoId}`;
      } else {
        const stream = data.audioStreams?.find(s => s.format === 'M4A') || data.audioStreams?.[0];
        streamUrl = stream?.url;
      }

      setCurrentTrack({ ...track, streamUrl, engine });
      setIsPlaying(true);
      fetchLyrics(track.title, track.uploaderName);
      fetchArtistInfo(track.uploaderName);

      // Update Recently Played
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(t => t.url !== track.url);
        return [track, ...filtered].slice(0, 50); // Keep last 50
      });
    } catch (err) { 
      console.error("Playback Error:", err);
      alert("ERROR: PLAYBACK ENGINE OFFLINE"); 
    }
  };

  const handleDownload = async (track) => {
    try {
      const videoId = track.id || track.url?.split('v=')[1];
      const host = getHost();
      const downloadUrl = `http://${host}:5001/api/download?id=${videoId}&title=${encodeURIComponent(track.title)}`;
      
      // Simple and robust way to trigger attachment downloads
      window.location.href = downloadUrl;
    } catch (err) {
      console.error("Download Error:", err);
      alert("DOWNLOAD ERROR: SYSTEM FAILURE");
    }
  };

  const handleNext = () => {
    console.log("Next Track Requested. Current Index:", currentIndex, "Queue Length:", queue.length);
    if (queue.length === 0 || currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % queue.length;
    playTrack(queue[nextIndex]);
  };

  const handlePrev = () => {
    console.log("Prev Track Requested. Current Index:", currentIndex, "Queue Length:", queue.length);
    if (queue.length === 0 || currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    playTrack(queue[prevIndex]);
  };

  const addToQueue = (track) => {
    console.log("Adding to Queue:", track.title);
    setQueue(prev => {
      const exists = prev.find(t => t.url === track.url);
      if (exists) return prev;
      const newQueue = [...prev, track];
      
      // If nothing is playing and the queue was empty, start this track
      if (currentIndex === -1) {
        playTrack(track, newQueue);
      }
      
      return newQueue;
    });
  };

  // --- UTILS ---
  const parseLRC = (lrcText) => {
    const lines = lrcText.split('\n');
    const result = [];
    const timeRegex = /\[(\d+):(\d+\.?\d*)\]/;
    
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const text = line.replace(timeRegex, '').trim();
        if (text) result.push({ time: minutes * 60 + seconds, text });
      } else if (line.trim().length > 20) {
        // Fallback for lines without timestamps (estimated)
        result.push({ time: -1, text: line.trim() });
      }
    });
    return result;
  };

  const cleanString = (str) => {
    if (!str) return "";
    return str
      .replace(/\(official video\)/gi, '')
      .replace(/\(lyrics\)/gi, '')
      .replace(/\(lyric video\)/gi, '')
      .replace(/\[official audio\]/gi, '')
      .replace(/\(official audio\)/gi, '')
      .replace(/\[lyrics\]/gi, '')
      .replace(/\(hd\)/gi, '')
      .replace(/\(4k\)/gi, '')
      .replace(/\(8k\)/gi, '')
      .replace(/full video.*/gi, '')
      .replace(/lyric video.*/gi, '')
      .replace(/official video.*/gi, '')
      .replace(/\|.*/gi, '')
      .replace(/ft\..*/gi, '')
      .replace(/feat\..*/gi, '')
      .replace(/ - Topic$/gi, '')
      .replace(/\[.*\]/g, '')
      .trim();
  };

  const fetchArtistInfo = async (name) => {
    try {
      const res = await axios.get(`https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(name)}&fmt=json`);
      if (res.data.artists?.[0]) {
        const a = res.data.artists[0];
        setArtistInfo({ name: a.name, country: a.country || 'N/A' });
      }
    } catch (e) {}
  };

  const lyricsAbortController = useRef(null);

  const fetchLyrics = async (t, a) => {
    // Cancel previous request if still running
    if (lyricsAbortController.current) lyricsAbortController.current.abort();
    lyricsAbortController.current = new AbortController();

    const cleanT = cleanString(t);
    const cleanA = cleanString(a);
    setLyrics([{ time: 0, text: "SCANNING TAPE..." }]);
    
    // Try primary API first
    try {
      const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanA)}/${encodeURIComponent(cleanT)}`, {
        signal: lyricsAbortController.current.signal
      });
      if (res.data.lyrics) { 
        const parsed = res.data.lyrics.split('\n').filter(l => l.trim()).map((l, i, arr) => ({
          time: (i / arr.length) * (duration || 180), // Estimate if no LRC
          text: l.trim()
        }));
        setLyrics(parsed); 
        return; 
      }
    } catch (e) {
      if (axios.isCancel(e)) return;
      console.warn("Primary lyrics API failed, attempting AI recovery...");
    }

    // AI Fallback: Use OpenRouter to find/reconstruct lyrics with timestamps
    try {
      setLyrics([{ time: 0, text: "AI RECONSTRUCTING TAPE DATA (TIMED)..." }]);
      const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "google/gemini-2.0-flash-001",
        messages: [{ 
          role: "user", 
          content: `You are a Retro Music Data Recovery system. 
          Your task is to RECONSTRUCT the lyrics for "${cleanT}" by "${cleanA}" in LRC format with [mm:ss.xx] timestamps.
          
          Requirements:
          1. Provide accurate [mm:ss.xx] timestamps for EVERY line.
          2. Return ONLY the LRC text.
          3. If impossible, respond ONLY with "DATA_ERROR".` 
        }]
      }, {
        headers: { 
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Echonix Stereo System"
        },
        signal: lyricsAbortController.current.signal
      });

      const aiLyrics = res.data.choices?.[0]?.message?.content;
      
      if (!aiLyrics || aiLyrics.includes("DATA_ERROR")) {
        setLyrics([{ time: 0, text: "NO TAPE DATA FOUND." }]);
        return;
      }

      setLyrics([{ time: 0, text: "DECODING ANALOG SIGNAL..." }]);
      const parsed = parseLRC(aiLyrics);
      
      if (parsed.length > 0) {
        // If parsed correctly, use it
        setLyrics(parsed);
      } else if (aiLyrics.length > 30) {
        // If parsing failed but we got a lot of text, it's probably plain text lyrics
        const plainTextLines = aiLyrics.split('\n').filter(l => l.trim().length > 0).map((l, i, arr) => ({
          time: (i / arr.length) * (duration || 180),
          text: l.trim()
        }));
        setLyrics(plainTextLines);
      } else {
        setLyrics([{ time: 0, text: "NO TAPE DATA FOUND." }]);
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error("AI Lyrics Fallback Error:", err);
      setLyrics([{ time: 0, text: "NO TAPE DATA FOUND." }]);
    }
  };

  const explainLyrics = async () => {
    if (!lyrics || ["SCANNING TAPE...", "NO TAPE DATA FOUND.", "READ ERROR.", "NO TAPE DATA TO ANALYZE."].includes(lyrics)) {
      setExplanation("SCANNING FOR DATA... NO ANALYZABLE TAPE DETECTED.");
      return;
    }
    setExplanation("ACTIVATING ECHO AI ANALYZER...");
    try {
      const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: `Act as a retro music analyzer. Explain the meaning and vibe of these lyrics in 3 punchy, technical points: ${lyrics}` }]
      }, {
        headers: { 
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Echonix Stereo System"
        }
      });
      if (res.data.choices?.[0]?.message?.content) {
        setExplanation(res.data.choices[0].message.content);
      } else {
        setExplanation("AI ANALYSIS ERROR: SYSTEM RETURNED NULL.");
      }
    } catch (e) { 
      console.error("AI Analysis Error:", e.response?.data || e.message);
      setExplanation(`AI OFFLINE: ${e.response?.status || 'ERROR'} - ${e.response?.data?.error?.message || e.message}`); 
    }
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60); const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('localTapes', JSON.stringify(localTapes));
  }, [localTapes]);

  useEffect(() => {
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  const toggleLike = (track) => {
    const isLiked = likedSongs.find(s => s.url === track.url);
    if (isLiked) setLikedSongs(likedSongs.filter(s => s.url !== track.url));
    else setLikedSongs([...likedSongs, track]);
  };

  const toggleLocalTape = (track) => {
    const isTaped = localTapes.find(s => s.url === track.url);
    if (isTaped) setLocalTapes(localTapes.filter(s => s.url !== track.url));
    else setLocalTapes([...localTapes, track]);
  };

  const getImageUrl = (trackOrUrl) => {
    if (!trackOrUrl) return "";
    const url = typeof trackOrUrl === 'string' ? trackOrUrl : trackOrUrl.thumbnail;
    if (!url) return "";
    if (url.startsWith('http')) return url;
    const targetEngine = trackOrUrl.engine || activeEngine;
    let base = targetEngine.endsWith('/') ? targetEngine.slice(0, -1) : targetEngine;
    if (url.startsWith('/api') && base.endsWith('/api')) base = base.slice(0, -4);
    return `${base}${url}`;
  };

  const navItems = [
    { icon: Home, label: 'Home', view: 'home' },
    { icon: Search, label: 'Discover', view: 'search' },
    { icon: ListMusic, label: 'Queue', view: 'queue' },
    { icon: CassetteTape, label: 'Collection', view: 'liked' },
    { icon: Radio, label: 'Retro FM', view: 'radio' },
    { icon: Headphones, label: 'Recently Played', view: 'history' },
  ];

  return (
    <div className="h-screen bg-[#1A2330] text-[#F7F1E8] flex overflow-hidden relative font-sans">
      {/* VHS Texture */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '4px 4px' }} />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden absolute top-6 right-6 z-50 p-3 rounded-xl bg-[#FF6B35] text-[#10151D] shadow-lg"
      >
        <CassetteTape className="w-6 h-6" />
      </button>
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'flex' : 'hidden'} lg:flex fixed lg:relative inset-0 lg:inset-auto w-full lg:w-[260px] bg-[#121923]/98 lg:bg-[#121923]/95 border-r border-[#2A3647] p-6 flex-col justify-between z-40 backdrop-blur-xl transition-all duration-300`}>
        <div>
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-[#FF6B35] to-[#FFB347] flex items-center justify-center shadow-[0_0_40px_rgba(255,107,53,0.35)]">
              <Music2 className="w-6 h-6 text-[#10151D]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-[0.25em] text-[#FFF8F0]">ECHONIX</h1>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#8EA8C3] mt-1">Stereo System 1989</p>
            </div>
          </div>

          <nav className="space-y-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => { setCurrentView(item.view); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-[22px] border transition-all ${
                    currentView === item.view
                      ? 'bg-[#FF6B35] text-[#10151D] border-[#FFB347] shadow-[0_0_30px_rgba(255,107,53,0.35)]'
                      : 'bg-[#18212D] border-[#283547] text-[#B8C6D8] hover:bg-[#1F2B3A] hover:border-[#5DA9E9]/40'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="rounded-[28px] bg-gradient-to-br from-[#1D2734] to-[#141C26] border border-[#2D3A4D] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between mb-4">
            <span className="uppercase text-xs tracking-[0.3em] text-[#FFB347]">Walkman</span>
            <Headphones className="w-4 h-4 text-[#FF6B35]" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-10 rounded-lg bg-[#2A2119] border-2 border-[#3D2E24] flex items-center justify-center gap-2 px-2 relative overflow-hidden shadow-inner">
              {[0, 1].map((x) => (
                <div key={x} className={`w-4 h-4 rounded-full border-2 border-[#B89A7A] bg-[#F8EFE5] flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }}>
                  <div className="w-1 h-1 rounded-full bg-[#2A2119]" />
                </div>
              ))}
            </div>
            <div>
              <p className="font-semibold text-sm">Sony WM-FX195</p>
              <p className="text-[10px] text-[#8EA8C3] uppercase tracking-tighter">{isPlaying ? 'Playing Tape' : 'Tape Paused'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto px-6 md:px-10 py-8 bg-[radial-gradient(circle_at_top,#243244_0%,#1A2330_65%)] z-10 custom-scrollbar">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-8">
          <div>
            <p className="uppercase tracking-[0.35em] text-[#8EA8C3] text-xs mb-3">Analog Experience</p>
            <h2 className="text-4xl md:text-7xl font-black leading-[0.9] text-[#FFF8F0]">
              {currentView === 'search' ? 'SEARCH\nTAPES.' : currentView === 'liked' ? 'TAPE\nARCHIVE.' : 'MIDNIGHT\nDRIVE.'}
            </h2>
          </div>

          <div className={`w-32 h-32 md:w-[180px] md:h-[180px] rounded-full bg-[linear-gradient(145deg,#D8DEE7,#7E8DA1)] border-[8px] md:border-[12px] border-[#0E141B] shadow-[0_30px_80px_rgba(0,0,0,0.55)] flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '12s' }}>
             {currentTrack ? (
               <img src={getImageUrl(currentTrack)} className="w-full h-full rounded-full object-cover p-1" alt="disc" />
             ) : (
               <div className="w-12 h-12 md:w-[70px] md:h-[70px] rounded-full bg-[#FF6B35] border-4 md:border-[10px] border-[#1A2330]" />
             )}
          </div>
        </div>

        {/* Hero Player */}
        <section className="rounded-[30px] md:rounded-[40px] bg-gradient-to-br from-[#202B39] to-[#141B24] border border-[#304055] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] mb-10">
          <div className="h-10 md:h-14 bg-[#FF6B35] flex items-center px-6 md:px-8 text-[#10151D] font-black tracking-[0.35em] text-[10px] md:text-sm uppercase">
            ECHONIX CASSETTE PLAYER {currentTrack ? `\u2022 ${activeEngine.includes('localhost') ? 'LOCAL_FEED' : 'CLOUD_LINK'}` : ''}
          </div>

          <div className="flex flex-col xl:grid xl:grid-cols-[380px_1fr] gap-8 md:gap-12 p-6 md:p-10 items-center">
            {/* Cassette */}
            <div className="relative w-full max-w-[380px] h-[200px] md:h-[240px] rounded-[30px] bg-gradient-to-br from-[#F3D8B8] to-[#B89A7A] border-[6px] md:border-[8px] border-[#2A2119] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">
              {currentTrack && (
                <img src={getImageUrl(currentTrack)} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" alt="cassette-art" />
              )}
              <div className="absolute top-4 md:top-5 left-4 md:left-5 right-4 md:right-5 h-10 md:h-12 rounded-xl bg-[#FFF4E8]/90 backdrop-blur-sm border border-dashed border-[#8C6A4D] flex items-center justify-center text-[#B55B2D] font-black tracking-[0.2em] md:tracking-[0.35em] text-[10px] md:text-sm uppercase truncate px-4 z-10">
                {currentTrack ? `SIDE A \u2022 ${currentTrack.title}` : 'SIDE A \u2022 NO TAPE'}
              </div>

              <div className="absolute inset-0 flex items-center justify-center gap-12 md:gap-16 mt-6 md:mt-8">
                {[0, 1].map((x) => (
                  <div key={x} className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-[8px] md:border-[10px] border-[#2A2119] bg-[#F8EFE5] flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6B35] border-4 border-[#2A2119]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Song Details */}
            <div className="w-full">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[#FFB347] mb-6 text-xs md:text-sm tracking-wide">
                {currentTrack ? 'Active Pipeline Session' : 'System Standby Mode'}
              </div>

              <h3 className="text-4xl md:text-6xl font-black text-[#FFF8F0] leading-tight mb-4 uppercase truncate">
                {currentTrack ? currentTrack.title.split(' ').slice(0, 2).join('\n') : 'NO\nTAPE.'}
              </h3>

              <p className="text-[#AAB9CA] text-lg md:text-xl mb-8 md:10 max-w-xl leading-relaxed line-clamp-2">
                {currentTrack ? `Streaming from ${currentTrack.uploaderName}. Analog matched and normalized for the Echonix Stereo System.` : 'A nostalgic mix inspired by old-school Walkman sessions, rainy evenings, and city lights reflected through bus windows.'}
              </p>

              {/* Progress */}
              <div className="mb-3 relative group">
                <input 
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="h-2 md:h-3 rounded-full bg-[#263343] overflow-hidden border border-[#36485E]">
                  <div className="h-full bg-[#FF6B35] rounded-full shadow-[0_0_20px_rgba(255,107,53,0.5)] transition-all duration-300" style={{ width: `${(currentTime/(duration || 1))*100}%` }} />
                </div>
              </div>

              <div className="flex justify-between text-xs md:text-sm text-[#8EA8C3] mb-8 md:10">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6 md:gap-8">
                <div className="flex gap-4 md:gap-5">
                  <button onClick={handlePrev} className="w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-[18px] bg-[#1C2531] border border-[#304055] flex items-center justify-center hover:border-[#5DA9E9]/40 transition-all">
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] md:rounded-[24px] bg-[#FF6B35] text-[#10151D] flex items-center justify-center shadow-[0_0_40px_rgba(255,107,53,0.4)] hover:scale-[1.03] transition-all">
                    {isPlaying ? <Pause className="w-6 h-6 md:w-8 md:h-8 fill-current" /> : <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" />}
                  </button>

                  <button onClick={handleNext} className="w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-[18px] bg-[#1C2531] border border-[#304055] flex items-center justify-center hover:border-[#5DA9E9]/40 transition-all">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-4 items-center">
                  {currentTrack && (
                    <>
                      <Download 
                        onClick={() => handleDownload(currentTrack)} 
                        className={`w-6 h-6 md:w-8 md:h-8 cursor-pointer transition-all ${isDownloading ? 'text-[#FFB347] animate-bounce' : 'text-[#8EA8C3] hover:text-[#FF6B35]'}`} 
                        title="Download Tape"
                      />
                      <CassetteTape 
                        onClick={() => toggleLocalTape(currentTrack)} 
                        className={`w-6 h-6 md:w-8 md:h-8 cursor-pointer transition-all ${localTapes.find(s => s.url === currentTrack.url) ? 'text-[#FF6B35] scale-110' : 'text-[#8EA8C3] hover:text-[#FFB347]'}`} 
                        title="Archive to Tape"
                      />
                      <Heart 
                        onClick={() => toggleLike(currentTrack)} 
                        className={`w-6 h-6 md:w-8 md:h-8 cursor-pointer transition-all ${likedSongs.find(s => s.url === currentTrack.url) ? 'text-[#FF4D4D] fill-current scale-110' : 'text-[#8EA8C3] hover:text-[#FF4D4D]'}`} 
                        title="Add to Favorites"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic List Content */}
        {currentView === 'home' && (
          <>
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-black text-[#FFF8F0]">Recently Played</h3>
                {recentlyPlayed.length > 4 && (
                  <button 
                    onClick={() => setCurrentView('history')}
                    className="text-[#FF6B35] font-bold uppercase tracking-widest text-xs hover:underline"
                  >
                    See All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-6">
                {recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 4).map((track, i) => (
                  <div key={i} onClick={() => playTrack(track, recentlyPlayed)} className="group flex items-center gap-4 bg-[#1A222D] p-4 rounded-[24px] border border-[#2E3C4F] hover:border-[#FF6B35] transition-all cursor-pointer">
                    <div className="relative w-20 h-20 shrink-0">
                      <img src={getImageUrl(track)} className="w-full h-full rounded-xl object-cover" alt="tape" />
                      <div className="absolute inset-0 bg-[#FF6B35]/0 group-hover:bg-[#FF6B35]/40 rounded-xl flex items-center justify-center transition-all">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 fill-current" />
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-lg line-clamp-1 group-hover:text-[#FFB347] transition-colors">{track.title}</h4>
                      <p className="text-xs text-[#8EA8C3] uppercase tracking-widest truncate">{track.uploaderName}</p>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-2 border-2 border-dashed border-[#2E3C4F] rounded-[24px] py-10 text-center text-[#8EA8C3] font-bold uppercase tracking-widest">
                    No recently played tapes.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-black text-[#FFF8F0]">My Tape Archive</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 {localTapes.slice(0, 4).map((track, i) => (
                  <div key={i} onClick={() => playTrack(track, localTapes)} className="group flex items-center gap-4 bg-[#1A222D] p-4 rounded-[24px] border border-[#2E3C4F] hover:border-[#FF6B35] transition-all cursor-pointer">
                    <div className="relative w-20 h-20 shrink-0">
                      <img src={getImageUrl(track)} className="w-full h-full rounded-xl object-cover" alt="tape" />
                      <div className="absolute inset-0 bg-[#FF6B35]/0 group-hover:bg-[#FF6B35]/40 rounded-xl flex items-center justify-center transition-all">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 fill-current" />
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-lg line-clamp-1 group-hover:text-[#FFB347] transition-colors">{track.title}</h4>
                      <p className="text-xs text-[#8EA8C3] uppercase tracking-widest truncate">{track.uploaderName}</p>
                    </div>
                  </div>
                ))}
                {localTapes.length === 0 && (
                  <div className="col-span-2 border-2 border-dashed border-[#2E3C4F] rounded-[24px] py-10 text-center text-[#8EA8C3] font-bold uppercase tracking-widest">
                    Archive is empty. Use the cassette icon to save tapes.
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {currentView === 'search' && (
           <section>
             <form onSubmit={handleSearch} className="mb-8 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#8EA8C3] w-6 h-6" />
                <input 
                  className="w-full bg-[#1A222D] border-2 border-[#2E3C4F] rounded-[30px] py-6 pl-16 pr-32 text-xl focus:border-[#FF6B35] outline-none transition-all placeholder:text-[#2E3C4F]"
                  placeholder={isAiMode ? "DESCRIBE THE VIBE (e.g. 'rainy cafe', 'gaming')..." : "SCAN THE MULTIVERSE FOR TUNES..."}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setIsAiMode(!isAiMode)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isAiMode ? 'bg-[#FF6B35] text-[#10151D]' : 'bg-[#2E3C4F] text-[#8EA8C3] hover:bg-[#3E4F63]'}`}
                >
                  {isAiMode ? 'AI Mode' : 'Standard'}
                </button>
             </form>

             {isAiLoading && (
               <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                  <div className="w-16 h-16 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mb-6" />
                  <p className="text-[#FFB347] font-mono tracking-widest uppercase">Consulting the AI Curator...</p>
               </div>
             )}

             <div className="space-y-4">
                {searchResults.map((track) => (
                  <div key={track.id} onClick={() => playTrack(track, searchResults)} className="group flex items-center justify-between rounded-[26px] bg-[#1A222D] border border-[#2E3C4F] px-6 py-5 hover:bg-[#202A37] hover:border-[#FF6B35]/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <img src={getImageUrl(track)} className="w-14 h-14 rounded-xl object-cover" alt="art" />
                        <div className="absolute inset-0 bg-[#FF6B35]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-all">
                          <Play className="w-6 h-6 text-white fill-current" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-[#F7F1E8] group-hover:text-[#FFB347] transition-colors line-clamp-1">{track.title}</h4>
                        <p className="text-sm text-[#8EA8C3]">{track.uploaderName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(track); }}
                        className="p-3 rounded-full bg-[#243140] text-[#8EA8C3] hover:bg-[#FFB347] hover:text-[#10151D] transition-all opacity-0 group-hover:opacity-100"
                        title="Download Tape"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                        className="p-3 rounded-full bg-[#243140] text-[#8EA8C3] hover:bg-[#FF6B35] hover:text-[#10151D] transition-all opacity-0 group-hover:opacity-100"
                        title="Add to Queue"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <span className="text-[#8EA8C3] font-mono text-sm">{formatTime(track.duration || 0)}</span>
                    </div>
                  </div>
                ))}
             </div>
          </section>
        )}

        {currentView === 'history' && (
          <section>
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-3xl font-black text-[#FFF8F0]">Recently Played</h3>
               <button 
                 onClick={() => setRecentlyPlayed([])}
                 className="px-6 py-3 rounded-full bg-[#243140] text-[#FF4D4D] font-bold uppercase tracking-widest text-xs hover:bg-[#FF4D4D] hover:text-[#10151D] transition-all"
               >
                 Clear History
               </button>
            </div>
            <div className="space-y-4">
               {recentlyPlayed.map((track, i) => (
                 <div 
                   key={track.url + i} 
                   onClick={() => playTrack(track, recentlyPlayed)}
                   className="group flex items-center justify-between rounded-[26px] border border-[#2E3C4F] bg-[#1A222D] px-6 py-5 hover:bg-[#202A37] hover:border-[#FF6B35]/30 transition-all cursor-pointer"
                 >
                   <div className="flex items-center gap-5">
                     <div className="w-12 h-12 rounded-[16px] bg-[#243140] flex items-center justify-center text-[#8EA8C3] group-hover:bg-[#FF6B35] group-hover:text-[#10151D] transition-all">
                       <Play className="w-4 h-4 fill-current" />
                     </div>
                     <div>
                       <h4 className="font-semibold text-lg text-[#F7F1E8] group-hover:text-[#FFB347] transition-colors line-clamp-1">
                         {track.title}
                       </h4>
                       <p className="text-sm text-[#8EA8C3]">{track.uploaderName}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(track); }}
                        className="p-3 rounded-full bg-[#243140] text-[#8EA8C3] hover:bg-[#FFB347] hover:text-[#10151D] transition-all opacity-0 group-hover:opacity-100"
                        title="Download Tape"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                        className="p-3 rounded-full bg-[#243140] text-[#8EA8C3] hover:bg-[#FF6B35] hover:text-[#10151D] transition-all opacity-0 group-hover:opacity-100"
                        title="Add to Queue"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-[#8EA8C3] font-mono text-sm">{formatTime(track.duration || 0)}</span>
                   </div>
                 </div>
               ))}
               {recentlyPlayed.length === 0 && (
                 <div className="py-20 text-center border-2 border-dashed border-[#2E3C4F] rounded-[40px] text-[#8EA8C3] font-bold uppercase tracking-[0.2em]">
                   History is Empty
                 </div>
               )}
            </div>
          </section>
        )}

        {currentView === 'queue' && (
          <section>
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-3xl font-black text-[#FFF8F0]">Active Queue</h3>
               <button 
                 onClick={() => { setQueue([]); setCurrentIndex(-1); }}
                 className="px-6 py-3 rounded-full bg-[#243140] text-[#FF4D4D] font-bold uppercase tracking-widest text-xs hover:bg-[#FF4D4D] hover:text-[#10151D] transition-all"
               >
                 Clear Queue
               </button>
            </div>
            <div className="space-y-4">
               {queue.map((track, i) => (
                 <div 
                   key={track.url + i} 
                   onClick={() => playTrack(track)}
                   className={`group flex items-center justify-between rounded-[26px] border px-6 py-5 transition-all cursor-pointer ${
                     currentIndex === i 
                       ? 'bg-[#FF6B35]/10 border-[#FF6B35] shadow-[0_0_30px_rgba(255,107,53,0.1)]' 
                       : 'bg-[#1A222D] border-[#2E3C4F] hover:bg-[#202A37] hover:border-[#FF6B35]/30'
                   }`}
                 >
                   <div className="flex items-center gap-5">
                     <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center transition-all ${
                       currentIndex === i ? 'bg-[#FF6B35] text-[#10151D]' : 'bg-[#243140] text-[#8EA8C3] group-hover:bg-[#FF6B35] group-hover:text-[#10151D]'
                     }`}>
                       {currentIndex === i ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Play className="w-4 h-4 fill-current" />}
                     </div>
                     <div>
                       <h4 className={`font-semibold text-lg transition-colors ${currentIndex === i ? 'text-[#FF6B35]' : 'text-[#F7F1E8] group-hover:text-[#FFB347]'}`}>
                         {track.title}
                       </h4>
                       <p className="text-sm text-[#8EA8C3]">{track.uploaderName}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(track); }}
                        className="p-3 rounded-full bg-[#243140] text-[#8EA8C3] hover:bg-[#FFB347] hover:text-[#10151D] transition-all opacity-0 group-hover:opacity-100"
                        title="Download Tape"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {currentIndex === i && <span className="px-3 py-1 rounded-full bg-[#FF6B35] text-[#10151D] text-[10px] font-black uppercase tracking-widest">Now Playing</span>}
                      <span className="text-[#8EA8C3] font-mono text-sm">{formatTime(track.duration || 0)}</span>
                   </div>
                 </div>
               ))}
               {queue.length === 0 && (
                 <div className="py-20 text-center border-2 border-dashed border-[#2E3C4F] rounded-[40px] text-[#8EA8C3] font-bold uppercase tracking-[0.2em]">
                   Your Queue is Empty
                 </div>
               )}
            </div>
          </section>
        )}

        {currentView === 'radio' && (
          <section className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-[#FF6B35]/10 border-2 border-[#FF6B35] flex items-center justify-center mb-8 animate-pulse">
              <Radio className="w-12 h-12 text-[#FF6B35]" />
            </div>
            <h3 className="text-4xl font-black text-[#FFF8F0] mb-4">RETRO FM</h3>
            <p className="text-[#8EA8C3] uppercase tracking-[0.3em] text-center max-w-md">
              Analog frequency scanning... The radio module is currently being calibrated for your region.
            </p>
          </section>
        )}

        {currentView === 'liked' && (
          <section>
            <h3 className="text-3xl font-black text-[#FFF8F0] mb-6">Tonight's Mixtape</h3>
            <div className="space-y-4">
              {likedSongs.map((track) => (
                <div key={track.url} onClick={() => playTrack(track, likedSongs)} className="group flex items-center justify-between rounded-[26px] bg-[#1A222D] border border-[#2E3C4F] px-6 py-5 hover:bg-[#202A37] hover:border-[#FF6B35]/30 transition-all cursor-pointer shadow-[0_15px_35px_rgba(0,0,0,0.25)]">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-[16px] bg-[#243140] border border-[#324255] flex items-center justify-center text-[#8EA8C3] group-hover:bg-[#FF6B35] group-hover:text-[#10151D] transition-all">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-[#F7F1E8] group-hover:text-[#FFB347] transition-colors">{track.title}</h4>
                      <p className="text-sm text-[#8EA8C3] mt-1">Echonix Retro Sessions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownload(track); }}
                      className="p-3 rounded-full bg-[#243140] text-[#8EA8C3] hover:bg-[#FFB347] hover:text-[#10151D] transition-all opacity-0 group-hover:opacity-100"
                      title="Download Tape"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                      className="p-3 rounded-full bg-[#243140] text-[#8EA8C3] hover:bg-[#FF6B35] hover:text-[#10151D] transition-all opacity-0 group-hover:opacity-100"
                      title="Add to Queue"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-[#8EA8C3] text-sm font-mono">3:42</span>
                  </div>
                </div>
              ))}
              {likedSongs.length === 0 && <p className="text-center text-[#8EA8C3] py-20 border-2 border-dashed border-[#2E3C4F] rounded-[30px]">NO TAPES SAVED IN COLLECTION.</p>}
            </div>
          </section>
        )}
      </main>

      {/* Right Panel */}
      <aside className="w-[340px] bg-[#121923]/95 border-l border-[#2A3647] p-6 flex flex-col gap-6 z-10 backdrop-blur-xl">
        <div className="rounded-[32px] bg-gradient-to-br from-[#1C2531] to-[#141B24] border border-[#2D3A4D] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
          <div className="aspect-square rounded-[28px] bg-gradient-to-br from-[#243244] to-[#141B24] border border-[#304055] flex items-center justify-center mb-6 overflow-hidden relative">
            <div className={`w-40 h-40 rounded-full border-[20px] border-[#243244] border-t-[#FF6B35] ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '7s' }} />
            {currentTrack && <img src={getImageUrl(currentTrack)} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="bg" />}
          </div>
          <h3 className="text-3xl font-black text-[#FFF8F0] mb-2 truncate">{currentTrack?.title || 'System Idle'}</h3>
          <p className="text-[#8EA8C3] mb-8 uppercase tracking-widest text-xs">{currentTrack ? 'Limited Tape Edition' : 'Standby Mode'}</p>
          <div className="flex items-center gap-4">
            <Volume2 className="w-5 h-5 text-[#FF6B35]" />
            <div className="flex-1 h-2 rounded-full bg-[#243244] overflow-hidden relative group">
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="h-full bg-[#FF6B35] rounded-full shadow-[0_0_20px_rgba(255,107,53,0.45)]" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-[32px] bg-[#1A222D] border border-[#2E3C4F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
           <h3 className="text-2xl font-black text-[#FFF8F0] mb-2 flex items-center gap-2">
             <Cpu className="w-6 h-6 text-[#FF6B35]" /> ECHO AI
           </h3>
           <p className="text-[#8EA8C3] text-sm mb-6 uppercase tracking-tighter">Retro Analysis Active</p>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
              <div className="text-sm font-mono text-[#FFB347] whitespace-pre-wrap leading-relaxed">
                {explanation || "SELECT A TAPE AND ACTIVATE THE ECHO ANALYZER FOR DEEP ANALOG INSIGHTS."}
              </div>
           </div>

           <button onClick={explainLyrics} className="w-full bg-[#FF6B35] text-[#10151D] font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(255,107,53,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">
              Activate Echo AI
           </button>
        </div>

        <div className="h-[200px] rounded-[32px] bg-[#1A222D] border border-[#2E3C4F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
           <h3 className="text-xl font-black text-[#FFF8F0] mb-4 flex items-center gap-2"><Mic2 className="w-5 h-5 text-[#FF6B35]" /> Lyrics</h3>
           <div
             ref={lyricsRef}
             className="flex-1 overflow-y-auto custom-scrollbar pr-2 text-sm italic leading-relaxed"
           >
              {lyrics.length > 0 ? lyrics.map((line, i) => {
                const activeIndex = lyrics.reduce((acc, l, idx) => {
                  if (l.time !== -1 && l.time <= currentTime) return idx;
                  return acc;
                }, 0);
                const isActive = i === activeIndex;

                return (
                  <p 
                    key={i} 
                    className={`transition-all duration-500 mb-2 ${
                      isActive 
                        ? 'text-[#FF6B35] font-bold scale-105 origin-left drop-shadow-[0_0_8px_rgba(255,107,53,0.8)] opacity-100' 
                        : 'text-[#8EA8C3] opacity-40'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              }) : (
                <p className="text-[#8EA8C3] opacity-40 italic">Scanning Tape for Data...</p>
              )}
           </div>
        </div>

      </aside>

      <audio 
        ref={audioRef} 
        src={currentTrack?.streamUrl} 
        autoPlay 
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onEnded={handleNext}
        onTimeUpdate={(e)=>setCurrentTime(e.target.currentTime)} 
        onLoadedMetadata={(e)=>setDuration(e.target.duration)}
        onError={(e) => {
          console.error("Audio Playback Error:", e);
          if (currentTrack?.engine?.includes('localhost')) {
            console.warn("Local stream failed, attempting to rotate engine...");
            // Force a re-search/fetch with a different engine by clearing currentTrack 
            // and letting the user retry or auto-triggering a fallback.
            // For now, let's just alert a more helpful message.
            alert("LOCAL DECK ERROR: ROTATING ANALOG HEADS...");
            handleNext(); // Skip to next or we could implement a better retry logic
          }
        }}
      />
    </div>
  );
}

export default App;