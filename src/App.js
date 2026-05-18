import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Play, Pause, SkipForward, SkipBack, Heart, 
  Volume2, Shuffle, Repeat, Library, Home, User, Mic2, Cpu
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
const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI || "https://localhost:3000";

const ENGINES = [
  "http://localhost:5001/api",
  "https://echonix.onrender.com/api",
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
    for (const engine of ENGINES) {
      try {
        let url = `${engine}${endpoint}`;
        const isInternalApi = engine.includes('localhost') || engine.includes('onrender.com') || engine === '/api';

        if (isInternalApi) {
          if (endpoint.startsWith('/search')) {
            url = `${engine}/search${endpoint.split('/search')[1]}`;
          } else if (endpoint.startsWith('/streams/')) {
            const videoId = endpoint.split('/streams/')[1];
            return { data: { isLocalStream: true, videoId }, engine };
          }
        }

        const res = await axios.get(url, { timeout: 15000 });
        setActiveEngine(engine);
        return { data: res.data, engine };
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
      const videoId = track.url.split('v=')[1];
      const { data, engine } = await fetchWithFallback(`/streams/${videoId}`);
      
      let streamUrl;
      if (data.isLocalStream) {
        const base = engine.endsWith('/') ? engine.slice(0, -1) : engine;
        streamUrl = `${base}/stream?id=${data.videoId}`;
      } else {
        const stream = data.audioStreams.find(s => s.format === 'M4A') || data.audioStreams[0];
        streamUrl = stream.url;
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
    return str
      .replace(/\(official video\)/gi, '')
      .replace(/\(lyrics\)/gi, '')
      .replace(/\(lyric video\)/gi, '')
      .replace(/\[official audio\]/gi, '')
      .replace(/\(official audio\)/gi, '')
      .replace(/\[lyrics\]/gi, '')
      .replace(/\(hd\)/gi, '')
      .replace(/\(4k\)/gi, '')
      .replace(/full video.*/gi, '')
      .replace(/lyric video.*/gi, '')
      .replace(/official video.*/gi, '')
      .replace(/\|.*/gi, '')
      .replace(/-.*/gi, '')
      .replace(/ft\..*/gi, '')
      .replace(/feat\..*/gi, '')
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

  const HomeView = () => (
    <div className="view-content">
      <div className="top-navigation">
        <h1 className="main-greeting">Good afternoon{spotifyUser ? `, ${spotifyUser.display_name.split(' ')[0]}` : ''}</h1>
        {token ? (
          <div className="user-badge" onClick={logout}><User size={18} /><span>{spotifyUser?.display_name}</span></div>
        ) : (
          <button className="pro-btn" onClick={loginToSpotify}>LOGIN WITH SPOTIFY</button>
        )}
      </div>
      <div className="hardware-shelf">
        <h2>YOUR SPOTIFY ARCHIVE</h2>
        <div className="shelf-grid">
          {spotifyPlaylists.slice(0, 4).map((pl, i) => (
            <div key={i} className="hardware-card">
              <div className="card-image"><img src={pl.images[0]?.url} alt="art" /></div>
              <h4>{pl.name}</h4>
              <p>{pl.tracks.total} Tapes</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="echonix-app">
      <aside className="hardware-sidebar">
        <div className="branding">
          <div className="logo">echonix</div>
          <div className="system-status" style={{ color: activeEngine.includes('localhost') ? 'var(--analog-blue)' : 'var(--cassette-orange)' }}>
            {activeEngine.includes('localhost') ? 'LOCAL_PIPELINE' : 
             activeEngine.includes('onrender') ? 'RENDER_CLOUD' : 'PIPED_BACKUP'}
          </div>
        </div>
        <nav className="nav-links">
          <div className={`nav-link ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')}><Home size={22} /> <span>Home</span></div>
          <div className={`nav-link ${currentView === 'search' ? 'active' : ''}`} onClick={() => setCurrentView('search')}><Search size={22} /> <span>Search</span></div>
          <div className={`nav-link ${currentView === 'library' ? 'active' : ''}`} onClick={() => setCurrentView('library')}><Library size={22} /> <span>Your Library</span></div>
        </nav>
      </aside>

      <main className="main-viewport">
        {currentView === 'home' && <HomeView />}
        {currentView === 'search' && (
          <div className="view-content">
            <div className="search-hardware">
              <Search color="var(--cassette-orange)" />
              <input placeholder="SCAN VIBES..." value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&handleSearch()}/>
            </div>
            <div className="shelf-grid">
              {searchResults.map((s, i) => (
                <div key={i} className="hardware-card" onClick={() => playTrack(s)}>
                  <div className="card-image"><img src={getImageUrl(s)} alt="art" /></div>
                  <h4>{s.title}</h4>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className={`echo-drawer ${isAiPanelOpen ? 'open' : ''}`}>
        <div className="drawer-header"><h2>ECHO ANALYZER</h2><Cpu size={24} color="var(--cassette-orange)" /></div>
        <div className="lyrics-vfd">{lyrics}</div>
        <button className="echo-activate-btn" onClick={explainLyrics}>ACTIVATE ECHO AI</button>
        <div className="echo-output">{explanation}</div>
      </div>

      <footer className="hardware-player">
        <div className="now-playing-deck">
          {currentTrack ? (
            <>
              <div className={`disc-container ${isPlaying ? 'spinning' : ''}`}>
                <img src={getImageUrl(currentTrack)} className="walkman-disc" alt="art" />
                <div className="disc-spindle"></div>
              </div>
              <div className="deck-meta">
                <div className="title-text">{currentTrack.title}</div>
                <div className="artist-text">{currentTrack.uploaderName}</div>
              </div>
              <Heart 
                size={20} 
                fill={likedSongs.find(s=>s.url===currentTrack.url)?"var(--cassette-orange)":"none"} 
                color={likedSongs.find(s=>s.url===currentTrack.url)?"var(--cassette-orange)":"currentColor"}
                style={{ cursor: 'pointer', marginLeft: 'auto' }}
                onClick={()=>toggleLike(currentTrack)} 
              />
            </>
          ) : <div className="deck-idle">NO TAPE</div>}
        </div>
        <div className="playback-center">
          <div className="physical-buttons"><Shuffle size={18}/><SkipBack size={24}/><button className="play-trigger" onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? <Pause fill="black" /> : <Play fill="black" />}</button><SkipForward size={24}/><Repeat size={18}/></div>
          <div className="analog-seek"><span className="vfd-time">{formatTime(currentTime)}</span><div className="seek-track"><div className="seek-fill" style={{ width: `${(currentTime/duration)*100}%` }}></div></div><span className="vfd-time">{formatTime(duration)}</span></div>
        </div>
        <div className="utility-deck"><Mic2 onClick={()=>setIsAiPanelOpen(!isAiPanelOpen)}/><Volume2 /></div>
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
      </footer>
    </div>
  );
}

export default App;
