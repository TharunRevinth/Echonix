import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Play, Pause, SkipForward, SkipBack, Heart, 
  Volume2, Shuffle, Repeat, Library, Home, User, Mic2, Cpu,
  Radio, Headphones, CassetteTape, Music2
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
const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;
const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;

const getHost = () => {
  const host = window.location.hostname;
  return host === 'localhost' ? 'localhost' : host;
};

const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI || `http://${getHost()}:3000`;

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
  const [lyrics, setLyrics] = useState('');
  const [artistInfo, setArtistInfo] = useState(null);
  const [explanation, setExplanation] = useState('');
  
  // Spotify State
  const [token, setToken] = useState(window.localStorage.getItem("spotify_token") || "");
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);

  const audioRef = useRef(null);
  const [likedSongs, setLikedSongs] = useState(() => JSON.parse(localStorage.getItem('likedSongs') || '[]'));
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
          await axios.get(`${base}/search?q=test`, { timeout: 5000 });
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

  // --- SPOTIFY OAUTH2 PKCE ---
  const loginToSpotify = async () => {
    const verifier = generateRandomString(64);
    const hashed = await sha256(verifier);
    const challenge = base64encode(hashed);
    window.localStorage.setItem('code_verifier', verifier);
    const params = new URLSearchParams({
      response_type: 'code', client_id: SPOTIFY_CLIENT_ID, scope: 'user-library-read playlist-read-private',
      code_challenge_method: 'S256', code_challenge: challenge, redirect_uri: REDIRECT_URI
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) exchangeCodeForToken(code);
  }, []);

  const exchangeCodeForToken = async (code) => {
    const verifier = window.localStorage.getItem('code_verifier');
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier
    });
    try {
      const res = await axios.post('https://accounts.spotify.com/api/token', params);
      window.localStorage.setItem('spotify_token', res.data.access_token);
      setToken(res.data.access_token);
      window.history.pushState({}, null, '/');
    } catch (e) { console.error("Auth Fail", e); }
  };

  useEffect(() => {
    if (token) fetchSpotifyData(token);
  }, [token]);

  const fetchSpotifyData = async (t) => {
    try {
      const user = await axios.get("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${t}` } });
      setSpotifyUser(user.data);
      const playlists = await axios.get("https://api.spotify.com/v1/me/playlists", { headers: { Authorization: `Bearer ${t}` } });
      setSpotifyPlaylists(playlists.data.items);
    } catch (err) { if (err.response?.status === 401) logout(); }
  };

  const logout = () => { setToken(""); window.localStorage.removeItem("spotify_token"); setSpotifyUser(null); };

  // --- SEARCH & PLAYBACK ---
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query) return;
    setCurrentView('search');
    try {
      const { data, engine } = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      const taggedResults = data.items.map(item => ({ ...item, engine }));
      setSearchResults(taggedResults);
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

  const playTrack = async (track) => {
    try {
      const videoId = track.id || track.url?.split('v=')[1];
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
    } catch (err) { alert("ERROR: PLAYBACK ENGINE OFFLINE"); }
  };

  // --- UTILS ---
  const cleanString = (str) => {
    if (!str) return "";
    return str.replace(/\(official video\)/gi, '').replace(/\(lyrics\)/gi, '').replace(/\(lyric video\)/gi, '').replace(/\[official audio\]/gi, '').replace(/\(official audio\)/gi, '').replace(/\[lyrics\]/gi, '').replace(/\(hd\)/gi, '').replace(/\(4k\)/gi, '').replace(/full video.*/gi, '').replace(/lyric video.*/gi, '').replace(/official video.*/gi, '').replace(/\|.*/gi, '').replace(/ft\..*/gi, '').replace(/feat\..*/gi, '').trim();
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

  const fetchLyrics = async (t, a) => {
    const cleanT = cleanString(t);
    const cleanA = cleanString(a);
    setLyrics("SCANNING TAPE...");
    try {
      const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanA)}/${encodeURIComponent(cleanT)}`);
      if (res.data.lyrics) { setLyrics(res.data.lyrics); return; }
    } catch (e) {}
    setLyrics("NO TAPE DATA FOUND.");
  };

  const explainLyrics = async () => {
    if (!lyrics || ["SCANNING TAPE...", "NO TAPE DATA FOUND.", "READ ERROR.", "NO TAPE DATA TO ANALYZE."].includes(lyrics)) {
      setExplanation("SCANNING FOR DATA... NO ANALYZABLE TAPE DETECTED.");
      return;
    }
    setExplanation("ACTIVATING ECHO AI ANALYZER...");
    try {
      const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`, {
        contents: [{ parts: [{ text: `Act as a retro music analyzer. Explain the meaning and vibe of these lyrics in 3 punchy, technical points: ${lyrics}` }] }]
      });
      if (res.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setExplanation(res.data.candidates[0].content.parts[0].text);
      } else {
        setExplanation("AI ANALYSIS ERROR: SYSTEM RETURNED NULL.");
      }
    } catch (e) { setExplanation(`AI OFFLINE: ${e.response?.status || '500 ERROR'}`); }
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60); const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleLike = (track) => {
    const isLiked = likedSongs.find(s => s.url === track.url);
    if (isLiked) setLikedSongs(likedSongs.filter(s => s.url !== track.url));
    else setLikedSongs([...likedSongs, track]);
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
    { icon: Library, label: 'Collection', view: 'liked' },
    { icon: CassetteTape, label: 'Spotify', view: 'spotify' },
    { icon: Radio, label: 'Retro FM', view: 'radio' },
    { icon: Heart, label: 'Favorites', view: 'liked' },
  ];

  return (
    <div className="min-h-screen bg-[#1A2330] text-[#F7F1E8] flex overflow-hidden relative font-sans">
      {/* VHS Texture */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '4px 4px' }} />

      {/* Neon Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF6B35]/10 blur-[140px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#5DA9E9]/10 blur-[140px] rounded-full" />

      {/* Sidebar */}
      <aside className="w-[260px] bg-[#121923]/95 border-r border-[#2A3647] p-6 flex flex-col justify-between z-10 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-[#FF6B35] to-[#FFB347] flex items-center justify-center shadow-[0_0_40px_rgba(255,107,53,0.35)]">
              <Music2 className="w-6 h-6 text-[#10151D]" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-[0.25em] text-[#FFF8F0]">ECHONIX</h1>
              <p className="text-xs uppercase tracking-[0.35em] text-[#8EA8C3] mt-1">Stereo System 1989</p>
            </div>
          </div>

          <nav className="space-y-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => setCurrentView(item.view)}
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
            <span className="uppercase text-xs tracking-[0.3em] text-[#FFB347]">System</span>
            <div className={`w-2 h-2 rounded-full ${activeEngine.includes('localhost') ? 'bg-green-400' : 'bg-orange-400'} animate-pulse`} />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center">
              <User className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <p className="font-semibold text-sm truncate w-24">{spotifyUser?.display_name || 'GUEST USER'}</p>
              <p className="text-[10px] text-[#8EA8C3] uppercase tracking-tighter">{token ? 'Spotify Linked' : 'No Auth'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-10 py-8 bg-[radial-gradient(circle_at_top,#243244_0%,#1A2330_65%)] z-10 custom-scrollbar">
        {/* Header / Hero */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="uppercase tracking-[0.35em] text-[#8EA8C3] text-sm mb-3">Analog Experience</p>
            <h2 className="text-7xl font-black leading-[0.9] text-[#FFF8F0]">
              {currentView === 'search' ? 'SEARCH' : currentView === 'liked' ? 'FAVORITE' : 'MIDNIGHT'}<br />{currentView === 'search' ? 'VIBES.' : currentView === 'liked' ? 'TAPES.' : 'DRIVE.'}
            </h2>
          </div>

          <div className={`w-[180px] h-[180px] rounded-full bg-[linear-gradient(145deg,#D8DEE7,#7E8DA1)] border-[12px] border-[#0E141B] shadow-[0_30px_80px_rgba(0,0,0,0.55)] flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '12s' }}>
            {currentTrack ? (
              <img src={getImageUrl(currentTrack)} className="w-full h-full rounded-full object-cover p-1" alt="disc" />
            ) : (
              <div className="w-[70px] h-[70px] rounded-full bg-[#FF6B35] border-[10px] border-[#1A2330]" />
            )}
          </div>
        </div>

        {/* Dynamic Views */}
        {currentView === 'home' && (
          <section className="space-y-10">
            <div className="grid grid-cols-2 gap-6">
              {spotifyPlaylists.slice(0, 4).map((pl, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#1A222D] p-4 rounded-[24px] border border-[#2E3C4F] hover:border-[#FF6B35] transition-all cursor-pointer">
                  <img src={pl.images[0]?.url} className="w-16 h-16 rounded-xl" alt="playlist" />
                  <div>
                    <h4 className="font-bold">{pl.name}</h4>
                    <p className="text-xs text-[#8EA8C3]">{pl.tracks.total} Tracks</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentView === 'search' && (
          <section>
             <form onSubmit={handleSearch} className="mb-8 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#8EA8C3] w-5 h-5" />
                <input 
                  className="w-full bg-[#1A222D] border-2 border-[#2E3C4F] rounded-[30px] py-6 pl-16 pr-8 text-xl focus:border-[#FF6B35] outline-none transition-all"
                  placeholder="SCAN THE MULTIVERSE FOR TUNES..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
             </form>
             <div className="space-y-4">
                {searchResults.map((track) => (
                  <div key={track.id} onClick={() => playTrack(track)} className="group flex items-center justify-between rounded-[26px] bg-[#1A222D] border border-[#2E3C4F] px-6 py-5 hover:bg-[#202A37] hover:border-[#FF6B35]/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                      <img src={getImageUrl(track)} className="w-12 h-12 rounded-xl object-cover" alt="art" />
                      <div>
                        <h4 className="font-semibold text-lg text-[#F7F1E8] group-hover:text-[#FFB347] transition-colors line-clamp-1">{track.title}</h4>
                        <p className="text-sm text-[#8EA8C3]">{track.uploaderName}</p>
                      </div>
                    </div>
                    <Play className="w-5 h-5 text-[#8EA8C3] group-hover:text-[#FF6B35]" />
                  </div>
                ))}
             </div>
          </section>
        )}

        {currentView === 'liked' && (
          <section className="space-y-4">
            {likedSongs.map((track) => (
              <div key={track.url} onClick={() => playTrack(track)} className="group flex items-center justify-between rounded-[26px] bg-[#1A222D] border border-[#2E3C4F] px-6 py-5 hover:bg-[#202A37] hover:border-[#FF6B35]/30 transition-all cursor-pointer">
                <div className="flex items-center gap-5">
                  <img src={getImageUrl(track)} className="w-12 h-12 rounded-xl object-cover" alt="art" />
                  <div>
                    <h4 className="font-semibold text-lg text-[#F7F1E8] group-hover:text-[#FFB347] transition-colors line-clamp-1">{track.title}</h4>
                    <p className="text-sm text-[#8EA8C3]">{track.uploaderName}</p>
                  </div>
                </div>
                <Play className="w-5 h-5 text-[#8EA8C3] group-hover:text-[#FF6B35]" />
              </div>
            ))}
            {likedSongs.length === 0 && <p className="text-center text-[#8EA8C3] py-20">NO FAVORITE TAPES IN STORAGE.</p>}
          </section>
        )}

        {/* Hero Player (Always visible if track playing) */}
        {currentTrack && (
          <section className="rounded-[40px] bg-gradient-to-br from-[#202B39] to-[#141B24] border border-[#304055] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] my-10 transition-all">
            <div className="h-10 bg-[#FF6B35] flex items-center px-8 text-[#10151D] font-black tracking-[0.35em] text-xs">
              ECHONIX CASSETTE PLAYER \u2022 {activeEngine.includes('localhost') ? 'LOCAL_FEED' : 'CLOUD_LINK'}
            </div>
            <div className="grid grid-cols-[300px_1fr] gap-10 p-8 items-center">
              <div className="relative h-[200px] rounded-[30px] bg-gradient-to-br from-[#F3D8B8] to-[#B89A7A] border-[8px] border-[#2A2119] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">
                 <div className="absolute top-4 left-4 right-4 h-10 rounded-xl bg-[#FFF4E8] border border-dashed border-[#8C6A4D] flex items-center justify-center text-[#B55B2D] font-black tracking-[0.2em] text-xs">
                    SIDE A \u2022 {cleanString(currentTrack.title).substring(0, 15)}...
                 </div>
                 <div className="absolute inset-0 flex items-center justify-center gap-12 mt-6">
                    {[0, 1].map((x) => (
                      <div key={x} className={`w-20 h-20 rounded-full border-[8px] border-[#2A2119] bg-[#F8EFE5] flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                        <div className="w-8 h-8 rounded-full bg-[#FF6B35] border-4 border-[#2A2119]" />
                      </div>
                    ))}
                 </div>
              </div>
              <div>
                <h3 className="text-4xl font-black text-[#FFF8F0] leading-tight mb-2 line-clamp-2 uppercase">{currentTrack.title}</h3>
                <p className="text-[#AAB9CA] text-lg mb-6">{currentTrack.uploaderName}</p>
                <div className="mb-2">
                  <div className="h-2 rounded-full bg-[#263343] overflow-hidden">
                    <div className="h-full bg-[#FF6B35] transition-all duration-300" style={{ width: `${(currentTime/duration)*100}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-[#8EA8C3] mb-6">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-6">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 rounded-[24px] bg-[#FF6B35] text-[#10151D] flex items-center justify-center shadow-[0_0_40px_rgba(255,107,53,0.4)] hover:scale-[1.05] transition-all">
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                  </button>
                  <Heart onClick={() => toggleLike(currentTrack)} className={`w-8 h-8 cursor-pointer ${likedSongs.find(s => s.url === currentTrack.url) ? 'text-[#FF6B35] fill-current' : 'text-[#8EA8C3]'}`} />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Right Panel - AI & Info */}
      <aside className="w-[340px] bg-[#121923]/95 border-l border-[#2A3647] p-6 flex flex-col gap-6 z-10 backdrop-blur-xl">
        <div className="rounded-[32px] bg-gradient-to-br from-[#1C2531] to-[#141B24] border border-[#2D3A4D] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
           <h3 className="text-xl font-black text-[#FFF8F0] mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-[#FF6B35]" /> AI ANALYZER</h3>
           <div className="h-48 overflow-y-auto text-xs font-mono text-[#8EA8C3] leading-relaxed mb-6 custom-scrollbar pr-2 whitespace-pre-wrap">
              {explanation || "SELECT A TAPE TO START AI ANALYSIS..."}
           </div>
           <button onClick={explainLyrics} className="w-full bg-[#FF6B35] text-[#10151D] font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(255,107,53,0.3)] hover:bg-[#FFB347] transition-all">
              ACTIVATE ECHO AI
           </button>
        </div>

        <div className="flex-1 rounded-[32px] bg-[#1A222D] border border-[#2E3C4F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
          <h3 className="text-xl font-black text-[#FFF8F0] mb-4 flex items-center gap-2"><Mic2 className="w-5 h-5 text-[#FF6B35]" /> TAPE LYRICS</h3>
          <div className="flex-1 overflow-y-auto text-sm font-medium text-[#F7F1E8] italic custom-scrollbar pr-2 whitespace-pre-wrap">
            {lyrics || "SCANNING..."}
          </div>
        </div>
      </aside>

      <audio 
        ref={audioRef} 
        src={currentTrack?.streamUrl} 
        autoPlay 
        preload="auto"
        playsInline
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onTimeUpdate={(e)=>setCurrentTime(e.target.currentTime)} 
        onLoadedMetadata={(e)=>setDuration(e.target.duration)}
      />
    </div>
  );
}

export default App;
