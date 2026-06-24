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

const cleanArtistName = (artist) => {
  if (!artist) return '';
  let clean = artist;
  const labels = [
    /sony\s*music(\s*india|\s*south)?/gi,
    /t-series/gi,
    /t\s*series/gi,
    /speed\s*records/gi,
    /yrf/gi,
    /yash\s*raj\s*films/gi,
    /zee\s*music(\s*company)?/gi,
    /aditya\s*music/gi,
    /lahari\s*music/gi,
    /think\s*music(\s*india|\s*south)?/gi,
    /eros\s*now/gi,
    /tips\s*official/gi,
    /saregama(\s*music)?/gi,
    /muzik\s*247/gi,
    /manorama\s*music/gi,
    /vevo/gi,
  ];
  for (const label of labels) {
    clean = clean.replace(label, '');
  }
  clean = clean.replace(/- Topic$/gi, '');
  clean = clean.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  return clean || artist;
};

const cleanSongTitle = (title) => {
  if (!title) return '';
  let clean = title;
  const suffixes = [
    /\((official|lyric|lyrical|video|audio|music\s*video|full\s*song|hd|4k|3d)\)/gi,
    /\[(official|lyric|lyrical|video|audio|music\s*video|full\s*song|hd|4k|3d)\]/gi,
    /\b(official|lyric|lyrical|video|audio|music\s*video|full\s*song|hd|4k|3d)\b/gi,
  ];
  for (const suffix of suffixes) {
    clean = clean.replace(suffix, '');
  }
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean || title;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
  const [username, setUsername] = useState('Tharun');
  
  const greeting = getGreeting();
  
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
  const lyricsCache = useRef({});
  const isFetchingMore = useRef(false);
  const currentVideoRef = useRef(null);
  const lyricsFetchId = useRef(0);

  const [likedSongs, setLikedSongs] = useState(() => JSON.parse(localStorage.getItem('likedSongs') || '[]'));
  const [localTapes, setLocalTapes] = useState(() => JSON.parse(localStorage.getItem('localTapes') || '[]'));
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'));
  const [trendingPlaylists, setTrendingPlaylists] = useState([]);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [ytmusicPlaylists, setYtmusicPlaylists] = useState([]);
  const [ytmusicHistory, setYtmusicHistory] = useState([]);
  const [ytmusicHome, setYtmusicHome] = useState([]);
  const [isYtmusicLoading, setIsYtmusicLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekOffset, setSeekOffset] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowRight':
          if (audioRef.current) audioRef.current.currentTime += 5;
          break;
        case 'ArrowLeft':
          if (audioRef.current) audioRef.current.currentTime -= 5;
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(v => Math.min(1, v + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(v => Math.max(0, v - 0.1));
          break;
        case 'KeyL':
          if (currentTrack) toggleLike(currentTrack);
          break;
        case 'KeyM':
          setVolume(v => v === 0 ? 0.7 : 0);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack]);

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
    fetchYTMusicData();
  }, []);

  useEffect(() => { localStorage.setItem('likedSongs', JSON.stringify(likedSongs)); }, [likedSongs]);
  useEffect(() => { localStorage.setItem('localTapes', JSON.stringify(localTapes)); }, [localTapes]);
  useEffect(() => { localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed)); }, [recentlyPlayed]);

  const fetchRecommendations = async (track) => {
    try {
      const recentlyPlayedIds = recentlyPlayed
        .slice(0, 20)
        .map(t => t.id)
        .filter(Boolean);

      const res = await axios.post(
        `http://${getHost()}:5001/api/ytmusic/recommendations`,
        {
          currentTrack: {
            id: track.id,
            videoId: track.videoId || track.id,
            title: track.title,
            uploaderName: track.uploaderName,
            duration: track.duration
          },
          history: recentlyPlayed.slice(0, 50),
          recentlyPlayedIds
        }
      );

      if (res.data?.length > 0) {
        setQueue(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const fresh = res.data.filter(t => !existingIds.has(t.id));
          return [...prev, ...fresh];
        });
      }
    } catch (e) {
      console.warn('Recommendations unavailable', e.message);
    }
  };

  // --- SMART QUEUE (AUTO-REFILL) ---
  useEffect(() => {
    const songsLeft = queue.length - currentIndex - 1;
    if (songsLeft <= 3 && currentTrack && !isFetchingMore.current) {
      isFetchingMore.current = true;
      fetchRecommendations(currentTrack)
        .finally(() => { isFetchingMore.current = false; });
    }
  }, [currentIndex, queue.length, currentTrack]);

  // --- AUDIO EFFECTS ---
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // --- AMBIENT GLOW (COLOR EXTRACTION) ---
  useEffect(() => {
    if (!currentTrack) {
      document.documentElement.style.setProperty('--glow-rgb', '157, 80, 255');
      return;
    }

    const imgUrl = currentTrack.thumbnail || currentTrack.url;
    if (!imgUrl) return;

    // Use getImageUrl to resolve relative paths if any
    const fullImgUrl = typeof imgUrl === 'string' && imgUrl.startsWith('http') 
        ? imgUrl 
        : ((currentTrack.engine || activeEngine).replace(/\/api$/, '') + imgUrl);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = fullImgUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        // Scale down for faster processing
        canvas.width = 30;
        canvas.height = 30;
        ctx.drawImage(img, 0, 0, 30, 30);
        
        const data = ctx.getImageData(0, 0, 30, 30).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        document.documentElement.style.setProperty('--glow-rgb', `${r}, ${g}, ${b}`);
      } catch (e) {
        console.warn("Color extraction failed (likely CORS). Using default glow.");
        document.documentElement.style.setProperty('--glow-rgb', '157, 80, 255');
      }
    };
    img.onerror = () => {
        document.documentElement.style.setProperty('--glow-rgb', '157, 80, 255');
    };
  }, [currentTrack, activeEngine]);

  useEffect(() => {
    if (audioRef.current && currentTrack?.streamUrl) {
      if (isPlaying) audioRef.current.play().catch(e => console.error("Playback failed", e));
      else audioRef.current.pause();
    }

    
    // Update document title
    if (currentTrack) {
      document.title = `${isPlaying ? '▶' : '⏸'} ${currentTrack.title || currentTrack.name} - Echonix`;
    } else {
      document.title = 'Echonix';
    }
    
    // --- MEDIA SESSION API (OS Metadata Sync) ---
    if ('mediaSession' in navigator && currentTrack) {
      const artist = currentTrack.uploaderName || currentTrack.artist || currentTrack.byline || 'Unknown Artist';
      const title = currentTrack.title || currentTrack.name || 'Unknown Track';
      
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: title,
        artist: artist,
        album: 'Echonix',
        artwork: [
          { src: getImageUrl(currentTrack), sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current) audioRef.current.currentTime = details.seekTime;
      });
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

  const fetchYTMusicData = () => {
    setIsYtmusicLoading(true);
    let completed = 0;
    const checkDone = () => {
      completed++;
      if (completed === 3) setIsYtmusicLoading(false);
    };

    axios.get(`http://${getHost()}:5001/api/ytmusic/home`)
      .then(res => setYtmusicHome(res.data))
      .catch(e => console.warn('Home err', e.message))
      .finally(checkDone);

    axios.get(`http://${getHost()}:5001/api/ytmusic/playlists`)
      .then(res => setYtmusicPlaylists(res.data))
      .catch(e => console.warn('Playlists err', e.message))
      .finally(checkDone);

    axios.get(`http://${getHost()}:5001/api/ytmusic/history`)
      .then(res => setYtmusicHistory(res.data.slice(0, 20).map(t => ({
        id: t.videoId || t.id,
        title: t.title || t.name || 'Unknown Title',
        uploaderName: (t.artists?.map(a => a.name).join(', ')) || t.artist || t.byline || 'Unknown Artist',
        thumbnail: t.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || '',
        duration: t.duration_seconds || 0,
        isYTMusic: true
      }))))
      .catch(e => console.warn('History err', e.message))
      .finally(checkDone);
  };

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
    const videoId = track.id || track.videoId || track.url?.split('v=')[1];
    
    // Prevent double-playing same track
    if (currentVideoRef.current === videoId) return;
    currentVideoRef.current = videoId;

    setSeekOffset(0);
    setCurrentTime(0);

    if (track.isRadio) {
      setCurrentTrack(track);
      setIsPlaying(true);
      return;
    }
    try {
      let isNavigatingInCurrentQueue = false;

      if (newQueue) {
        setQueue(newQueue);
        const index = newQueue.findIndex(t => t.id === track.id || t.url === track.url);
        setCurrentIndex(index !== -1 ? index : 0);
      } else if (queue.length > 0) {
        const index = queue.findIndex(t => t.id === track.id || t.url === track.url);
        if (index !== -1) {
          setCurrentIndex(index);
          isNavigatingInCurrentQueue = true;
        } else {
          setQueue([track]);
          setCurrentIndex(0);
        }
      } else {
        setQueue([track]);
        setCurrentIndex(0);
      }

      let videoId = track.id || track.url?.split('v=')[1];
      let ytDuration = track.duration;

      // --- LRCLIB RESOLUTION ---
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
      setDuration(ytDuration || track.duration || 0);
      setIsPlaying(true);
      setLyricsOffset(0); 

      // Use the updated track which might contain lyrics from search with a small delay to avoid abort race
      setTimeout(() => fetchLyrics(updatedTrack), 100);
      setRecentlyPlayed(prev => [updatedTrack, ...prev.filter(t => t.id !== track.id)].slice(0, 50));

      // Trigger recommendations
      if (!newQueue && !isNavigatingInCurrentQueue) {
        fetchRecommendations(updatedTrack);
      }
    } catch (err) { alert("PLAYBACK ENGINE OFFLINE OR RESOLUTION FAILED"); }
  };

  const fetchLyrics = async (track) => {
    const thisFetchId = ++lyricsFetchId.current;
    
    if (lyricsAbortController.current) {
      lyricsAbortController.current.abort();
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (thisFetchId !== lyricsFetchId.current) return;
    
    lyricsAbortController.current = new AbortController();
    const signal = lyricsAbortController.current.signal;
    
    const isStale = () => thisFetchId !== lyricsFetchId.current || signal.aborted;
    
    const cacheKey = `${track.videoId || track.id}`;
    if (lyricsCache.current[cacheKey]) {
      setLyrics(lyricsCache.current[cacheKey]);
      return;
    }

    if (track.syncedLyrics) {
      if (isStale()) return;
      const parsed = parseLRC(track.syncedLyrics);
      setLyrics(parsed);
      lyricsCache.current[cacheKey] = parsed;
      if (track.ytDuration && track.duration) {
        const diff = Math.floor(track.ytDuration - track.duration);
        if (diff > 2) setLyricsOffset(diff);
      }
      return;
    }
    
    if (track.plainLyrics) {
      if (isStale()) return;
      const parsed = track.plainLyrics.split('\n').filter(l => l.trim()).map((l, i, arr) => ({
        time: (i / arr.length) * (track.duration || track.ytDuration || 180),
        text: l.trim()
      }));
      setLyrics(parsed);
      lyricsCache.current[cacheKey] = parsed;
      return;
    }
    
    if (isStale()) return;
    setLyrics([{ time: 0, text: "Searching lyrics..." }]);
    
    const stripParens = (str) => str?.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim() || '';
    const stripFeatures = (str) => str
      ?.replace(/\(feat\..*?\)/gi, '')
      .replace(/\[feat\..*?\]/gi, '')
      .replace(/ft\..*$/gi, '')
      .replace(/- Topic$/gi, '')
      .trim() || '';
      
    const rawTitle = track.title || '';
    const rawArtist = track.uploaderName || track.artistName || '';
    const albumName = track.albumName || '';
    
    const cleanedTitle = cleanSongTitle(rawTitle);
    const cleanedArtist = cleanArtistName(rawArtist);
    
    const titleVariants = [...new Set([
      cleanedTitle,
      rawTitle,
      stripFeatures(cleanedTitle),
      stripParens(cleanedTitle),
      cleanedTitle.split(' - ')[0].trim(),
      cleanedTitle.split('|')[0].trim(),
      cleanedTitle.split('(')[0].trim(),
    ])].filter(Boolean);
    
    const artistVariants = [...new Set([
      cleanedArtist,
      rawArtist,
      cleanedArtist.split(',')[0].trim(),
      cleanedArtist.split(/\s+(&|and|ft\.?|feat\.?)\s+/i)[0].trim(),
      stripParens(cleanedArtist),
      stripFeatures(cleanedArtist),
    ])].filter(Boolean);
    
    const API_BASE = `http://${getHost()}:5001`;
    
    const tryLrclib = async (artist, title) => {
      if (isStale()) return false;
      try {
        const res = await axios.get(`${API_BASE}/api/lyrics/lrclib`, {
          params: { artist, title },
          signal,
          timeout: 8000
        });
        if (isStale()) return false;
        if (res.data?.syncedLyrics) {
          const parsed = parseLRC(res.data.syncedLyrics);
          setLyrics(parsed);
          lyricsCache.current[cacheKey] = parsed;
          if (res.data.duration && track.ytDuration) {
            const diff = Math.floor(track.ytDuration - res.data.duration);
            if (diff > 2) setLyricsOffset(diff);
          }
          return true;
        }
        if (res.data?.plainLyrics) {
          const parsed = res.data.plainLyrics.split('\n').filter(l => l.trim()).map((l, i, arr) => ({
            time: (i / arr.length) * (res.data.duration || track.ytDuration || 180),
            text: l.trim()
          }));
          setLyrics(parsed);
          lyricsCache.current[cacheKey] = parsed;
          return true;
        }
      } catch (e) {
        if (e.name === 'AbortError' || axios.isCancel(e)) return false;
      }
      return false;
    };
    
    const tryLrclibSearch = async (query) => {
      if (isStale()) return false;
      try {
        const res = await axios.get(`${API_BASE}/api/lyrics/lrclib`, {
          params: { q: query },
          signal,
          timeout: 8000
        });
        if (isStale()) return false;
        const results = Array.isArray(res.data) ? res.data : [];
        if (results.length > 0) {
          const durationSec = track.ytDuration || track.duration || 0;
          const primaryArtist = (track.uploaderName || track.artistName || "").split(',')[0].trim().toLowerCase();
          
          // Find best match matching duration within 8 seconds
          let best = results.find(r => durationSec > 0 && Math.abs(r.duration - durationSec) < 8);
          
          // If no close duration match, check if artist match
          if (!best && primaryArtist) {
            best = results.find(r => r.artistName?.toLowerCase().includes(primaryArtist));
          }
          
          // Fallback to first item with synced lyrics, or just the first item
          if (!best) {
            best = results.find(l => l.syncedLyrics) || results[0];
          }
          
          if (best?.syncedLyrics) {
            const parsed = parseLRC(best.syncedLyrics);
            setLyrics(parsed);
            lyricsCache.current[cacheKey] = parsed;
            if (best.duration && durationSec) {
              const diff = Math.floor(durationSec - best.duration);
              if (diff > 2) setLyricsOffset(diff);
            }
            return true;
          }
          if (best?.plainLyrics) {
            const parsed = best.plainLyrics.split('\n').filter(l => l.trim()).map((l, i, arr) => ({
              time: (i / arr.length) * (best.duration || durationSec || 180),
              text: l.trim()
            }));
            setLyrics(parsed);
            lyricsCache.current[cacheKey] = parsed;
            return true;
          }
        }
      } catch (e) {
        if (e.name === 'AbortError' || axios.isCancel(e)) return false;
      }
      return false;
    };
    
    const tryLyricsOvh = async (artist, title) => {
      if (isStale()) return false;
      try {
        const res = await axios.get(`${API_BASE}/api/lyrics/ovh`, {
          params: { artist, title },
          signal,
          timeout: 8000
        });
        if (isStale()) return false;
        if (res.data?.lyrics) {
          const lines = res.data.lyrics.split('\n').filter(l => l.trim());
          const parsed = lines.map((l, i, arr) => ({
            time: (i / arr.length) * (track.ytDuration || 180),
            text: l.trim()
          }));
          setLyrics(parsed);
          lyricsCache.current[cacheKey] = parsed;
          return true;
        }
      } catch (e) {
        if (e.name === 'AbortError' || axios.isCancel(e)) return false;
      }
      return false;
    };

    const tryiTunesThenLrclib = async (artist, title) => {
      if (isStale()) return false;
      try {
        const itunesRes = await axios.get(
          `http://${getHost()}:5001/api/lyrics/itunes`,
          {
            params: { artist, title },
            signal,
            timeout: 12000
          }
        );

        if (itunesRes.data?.notFound) return false;

        const tracks = itunesRes.data?.tracks || [];
        if (!tracks.length) return false;

        for (const itunesTrack of tracks.slice(0, 3)) {
          if (isStale()) return false;

          // Try with iTunes exact title and artist
          if (await tryLrclib(itunesTrack.artist, itunesTrack.title)) return true;

          // Try with just title
          if (await tryLrclib('', itunesTrack.title)) return true;

          // Try search with iTunes data (full metadata)
          if (await tryLrclibSearch(
            `${itunesTrack.title} ${itunesTrack.artist}`
          )) return true;

          // Try search with clean iTunes title only
          if (await tryLrclibSearch(itunesTrack.title)) return true;
        }

      } catch (e) {
        console.warn("iTunes fallback failed:", e.message);
        if (e.name === 'AbortError' || axios.isCancel(e)) throw e;
      }
      return false;
    };
    
    try {
      // Pass 1: Try exact query search first (fuzzy search matches best, like in lyrics-finder)
      const cleanTitle = titleVariants[0];
      const cleanArtist = artistVariants[0];
      const primarySearchQuery = `${cleanTitle} ${cleanArtist}`.trim();
      if (primarySearchQuery) {
        if (isStale()) return;
        if (await tryLrclibSearch(primarySearchQuery)) return;
      }
      
      // Pass 2: Try fallback query variations
      const fallbackSearchQueries = [
        titleVariants[2] || titleVariants[0], // title without parens
        `${titleVariants[2] || titleVariants[0]} ${artistVariants[0]}`.trim()
      ].filter(q => q && q !== primarySearchQuery);
      
      for (const q of fallbackSearchQueries) {
        if (isStale()) return;
        if (await tryLrclibSearch(q)) return;
      }
      
      // Pass 3 — direct exact match get lookup as backup
      for (const title of titleVariants) {
        for (const artist of artistVariants) {
          if (isStale()) return;
          if (await tryLrclib(artist, title)) return;
        }
      }
      for (const title of titleVariants) {
        if (isStale()) return;
        if (await tryLrclib('', title)) return;
      }
      
      // Pass 4 — iTunes metadata + lrclib retry fallback
      if (isStale()) return;
      if (await tryiTunesThenLrclib(
        artistVariants[1] || artistVariants[0],
        titleVariants[2] || titleVariants[0]
      )) return;
      
      // Pass 5 — lyrics.ovh last resort
      if (isStale()) return;
      if (await tryLyricsOvh(
        artistVariants[0],
        titleVariants[2] || titleVariants[0]
      )) return;
      
      if (!isStale()) {
        const notFound = [{ time: 0, text: "Lyrics not found." }];
        setLyrics(notFound);
        lyricsCache.current[cacheKey] = notFound;
      }
    } catch (e) {
      if (!isStale()) {
        setLyrics([{ time: 0, text: "Lyrics unavailable." }]);
      }
    }
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
          username={username}
          greeting={greeting}
        />

        <main className="flex-1 overflow-y-auto px-4 lg:px-10 custom-scrollbar pb-40 lg:pb-32">
          <ViewRenderer 
            currentView={currentView}
            setCurrentView={setCurrentView}
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
            ytmusicPlaylists={ytmusicPlaylists}
            ytmusicHistory={ytmusicHistory}
            ytmusicHome={ytmusicHome}
            isYtmusicLoading={isYtmusicLoading}
            username={username}
            greeting={greeting}
            currentTrack={currentTrack}
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
          let t = parseFloat(e.target.value);
          if (isNaN(t) || !isFinite(t)) t = 0;
          setSeekOffset(t);
          setCurrentTime(t);
          if (currentTrack) {
            let newStreamUrl = currentTrack.streamUrl;
            if (newStreamUrl.includes('/api/stream')) {
              try {
                const urlObj = new URL(newStreamUrl);
                urlObj.searchParams.set('start', t);
                newStreamUrl = urlObj.toString();
              } catch (err) {
                console.error("Failed to parse stream URL:", err);
              }
            }
            setCurrentTrack(prev => ({
              ...prev,
              streamUrl: newStreamUrl
            }));
          } else if (audioRef.current) {
            audioRef.current.currentTime = t;
          }
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
        onTimeUpdate={(e) => {
          const ct = e.target.currentTime;
          if (typeof ct === 'number' && isFinite(ct)) {
            setCurrentTime(ct + seekOffset);
          }
        }}
        onLoadedMetadata={(e) => {
          const d = e.target.duration;
          if (d && isFinite(d) && d > 0) {
            setDuration(prev => {
              if (prev > 0 && seekOffset > 0) return prev;
              return d + seekOffset;
            });
          }
        }}
      />
    </div>
  );
}

export default App;
