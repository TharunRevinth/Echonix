require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytSearch = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const app = express();
const PORT = process.env.PORT || 5001;

const log = (msg) => {
    console.log(`[${new Date().toISOString()}] ${msg}`);
};

app.use(cors());
app.use(express.json()); // Enable JSON body parsing for POST requests

// A robust list of public Piped instances to use as "shields"
const PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://api-piped.mha.fi",
    "https://piped-api.garudalinux.org",
    "https://pipedapi.rivo.lol",
    "https://pipedapi.leptons.xyz",
    "https://piped-api.lunar.icu",
    "https://pipedapi.silly.moe",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.astre.me",
    "https://pipedapi.moomoo.me",
    "https://pipedapi.synced.cloud"
];

// --- SEARCH ENDPOINT (Powered by LRCLIB + iTunes for Tracks) ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const filter = req.query.filter; // music_songs or playlists
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        if (filter === 'playlists') {
            const results = await ytSearch(query + " playlist");
            return res.json({ 
                items: results.playlists.slice(0, 15).map(v => ({ 
                    title: v.title, uploaderName: v.author.name, thumbnail: v.thumbnail, url: v.url, id: v.listId, videoCount: v.videoCount 
                }))
            });
        }

        // Tracks Search via LRCLIB
        const lrclibRes = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { timeout: 8000 });
        let tracks = lrclibRes.data || [];
        
        if (tracks.length === 0) {
            throw new Error("No LRCLIB results");
        }

        tracks = tracks.slice(0, 15);

        // Fetch iTunes artwork concurrently
        const items = await Promise.all(tracks.map(async (t) => {
            let thumbnail = 'https://via.placeholder.com/500/111112/9D50FF?text=Music';
            try {
                const itunesRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(t.name + ' ' + t.artistName)}&entity=song&limit=1`, { timeout: 3000 });
                if (itunesRes.data.results && itunesRes.data.results.length > 0) {
                    thumbnail = itunesRes.data.results[0].artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg');
                }
            } catch (e) {
                // Ignore iTunes failure, use placeholder
            }

            return {
                id: t.id.toString(), // Use LRCLIB ID temporarily
                title: t.name,
                uploaderName: t.artistName,
                albumName: t.albumName,
                thumbnail: thumbnail,
                duration: t.duration,
                isLrclib: true,
                syncedLyrics: t.syncedLyrics,
                plainLyrics: t.plainLyrics
            };
        }));

        return res.json({ items });

    } catch (err) {
        log(`[LRCLIB Search Fallback] ${err.message}`);
        // Fallback to YouTube if LRCLIB fails
        try {
            const results = await ytSearch(query);
            return res.json({ 
                items: results.videos.slice(0, 15).map(v => ({ 
                    title: v.title, uploaderName: v.author.name, thumbnail: `/api/proxy-image?url=${encodeURIComponent(v.thumbnail)}`, url: v.url, id: v.videoId, duration: v.seconds 
                }))
            });
        } catch (ytErr) {
            res.status(500).json({ error: "Search unavailable" });
        }
    }
});

// --- RESOLVE YOUTUBE ENDPOINT ---
// Takes a track's metadata and finds the best YouTube match for audio
app.get('/api/resolve-youtube', async (req, res) => {
    const { title, artist } = req.query;
    if (!title || !artist) return res.status(400).json({ error: "Missing title or artist" });

    try {
        const searchQuery = `${title} ${artist} audio`;
        const results = await ytSearch(searchQuery);
        
        // Find the best match (prioritize music-like results)
        const bestMatch = results.videos.find(v => {
            const t = v.title.toLowerCase();
            return v.seconds > 60 && v.seconds < 600 && !['vlog', 'reaction', 'review'].some(k => t.includes(k));
        }) || results.videos[0];

        if (!bestMatch) return res.status(404).json({ error: "No YouTube match found" });

        res.json({
            videoId: bestMatch.videoId,
            url: bestMatch.url,
            duration: bestMatch.seconds
        });
    } catch (err) {
        res.status(500).json({ error: "Resolution failed" });
    }
});

// --- IMAGE PROXY ---
app.get('/api/proxy-image', async (req, res) => {
    try {
        const r = await axios.get(req.query.url, { 
            responseType: 'stream', 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
        });
        res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
        r.data.pipe(res);
    } catch (e) { res.status(500).end(); }
});

// --- RADIO PROXY ENDPOINT ---
app.get('/api/proxy-radio', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) return res.status(400).send("Missing URL");

    log(`[Radio Proxy] Proxying stream: ${streamUrl}`);

    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.data.pipe(res);

        req.on('close', () => {
            if (response.data.destroy) response.data.destroy();
        });
    } catch (err) {
        log(`[Radio Proxy Error] ${err.message}`);
        res.status(500).send("Radio proxy failed");
    }
});

const { spawn } = require('child_process');
const path = require('path');

// Path to the yt-dlp binary provided by the package
const YTDLP_PATH = path.join(__dirname, 'node_modules/youtube-dl-exec/bin/yt-dlp');

// --- PURE PROXY STREAM ENDPOINT ---
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send("Missing ID");

    log(`[Proxy] Direct Pipe started for: ${videoId}`);

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Arguments for yt-dlp to pipe best audio to stdout
    const args = [
        youtubeUrl,
        '-f', 'bestaudio[ext=m4a]/bestaudio/best',
        '-o', '-',
        '--no-playlist',
        '--no-warnings',
        '--force-ipv4',
        '--no-part',
        '--no-cache-dir',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    const ytDlpProcess = spawn(YTDLP_PATH, args);

    ytDlpProcess.stdout.on('data', (chunk) => {
        if (!res.headersSent) {
            res.writeHead(200, {
                'Content-Type': 'audio/mp4',
                'Access-Control-Allow-Origin': '*',
                'Accept-Ranges': 'none',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Connection': 'keep-alive'
            });
        }
    });

    // Pipe the audio data directly to the user
    ytDlpProcess.stdout.pipe(res);

    ytDlpProcess.on('error', (err) => {
        log(`[Spawn Error] Failed to start yt-dlp: ${err.message}`);
        if (!res.headersSent) res.status(500).send("Playback engine failed to start");
    });

    ytDlpProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        // Only log actual errors to keep the log clean
        if (msg.includes('ERROR')) {
            log(`[yt-dlp Error] ${msg.trim()}`);
        }
    });

    ytDlpProcess.on('close', (code, signal) => {
        if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
            log(`[Proxy] yt-dlp process exited with code ${code} and signal ${signal}`);
            if (!res.headersSent) {
                res.status(500).send("Playback engine failed");
            }
        } else {
            log(`[Proxy] Stream closed for ${videoId} (${signal || 'Complete'})`);
        }
    });

    // Handle client disconnect
    req.on('close', () => {
        log(`[Proxy] Client disconnected, killing yt-dlp for ${videoId}`);
        ytDlpProcess.kill();
    });
});

// --- DOWNLOAD ENDPOINT ---
app.get('/api/download', (req, res) => {
    const videoId = req.query.id;
    const title = req.query.title || 'audio';
    if (!videoId) return res.status(400).send("Missing ID");

    log(`[Download] Starting download for: ${videoId} (${title})`);

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const filename = `${title.replace(/[^\w\s]/gi, '')}.mp3`;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Use yt-dlp to convert to mp3 and pipe to response
    const args = [
        youtubeUrl,
        '-f', 'bestaudio',
        '--extract-audio',
        '--audio-format', 'mp3',
        '-o', '-',
        '--no-playlist',
        '--no-warnings',
        '--force-ipv4',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    const ytDlpProcess = spawn(YTDLP_PATH, args);

    ytDlpProcess.stdout.pipe(res);

    ytDlpProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('ERROR')) {
            log(`[Download Error] ${msg.trim()}`);
        }
    });

    ytDlpProcess.on('close', (code) => {
        if (code !== 0) {
            log(`[Download] Process exited with code ${code}`);
        } else {
            log(`[Download] Completed for ${videoId}`);
        }
    });

    req.on('close', () => {
        ytDlpProcess.kill();
    });
});

// --- PLAYLIST ENDPOINT ---
app.get('/api/playlist', (req, res) => {
    const playlistId = req.query.id;
    if (!playlistId) return res.status(400).json({ error: "Missing Playlist ID or URL" });

    log(`[Playlist] Fetching metadata for: ${playlistId}`);

    // If it's a full URL, use it directly, otherwise assume it's a YT ID
    const url = playlistId.startsWith('http') ? playlistId : `https://www.youtube.com/playlist?list=${playlistId}`;

    const args = [
        url,
        '--dump-single-json',
        '--flat-playlist',
        '--playlist-end', '50', // Limit to 50 tracks for performance
        '--no-warnings',
        '--force-ipv4',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    const ytDlpProcess = spawn(YTDLP_PATH, args);
    let output = '';

    ytDlpProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    ytDlpProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('ERROR')) log(`[Playlist Error] ${msg.trim()}`);
    });

    ytDlpProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: "Failed to fetch playlist" });
        }
        try {
            const data = JSON.parse(output);
            const tracks = data.entries.map(entry => {
                // Find highest res thumbnail for the track
                const trackThumb = entry.thumbnails?.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]?.url || "";
                
                return {
                    id: entry.id,
                    title: entry.title,
                    uploaderName: entry.uploader || entry.channel || "Unknown Artist",
                    thumbnail: `/api/proxy-image?url=${encodeURIComponent(trackThumb)}`,
                    duration: entry.duration || 0,
                    url: `https://www.youtube.com/watch?v=${entry.id}`
                };
            });

            // Find highest res thumbnail for the playlist itself
            const playlistThumb = data.thumbnails?.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]?.url || "";

            res.json({
                title: data.title,
                uploader: data.uploader,
                itemCount: data.playlist_count || tracks.length,
                thumbnail: playlistThumb ? `/api/proxy-image?url=${encodeURIComponent(playlistThumb)}` : null,
                items: tracks
            });
        } catch (e) {
            res.status(500).json({ error: "Failed to parse playlist data" });
        }
    });
});

// --- TRENDING PLAYLISTS ENDPOINT ---
app.get('/api/trending-playlists', async (req, res) => {
    try {
        const customQuery = req.query.q;
        
        if (customQuery) {
            const results = await ytSearch(customQuery + " Official YouTube Music Playlist");
            return res.json(results.playlists.slice(0, 15).map(p => ({
                id: p.listId,
                title: p.title,
                thumbnail: `/api/proxy-image?url=${encodeURIComponent(p.thumbnail || p.image)}`,
                uploaderName: p.author.name,
                videoCount: p.videoCount,
                url: p.url,
                engine: `http://localhost:${PORT}`
            })));
        }

        // Regionally categorized discovery - targeting YouTube Music Official
        const categories = {
            'Bollywood': 'Official Bollywood Music Playlist YouTube Music',
            'Kollywood': 'Official Tamil Hits Playlist YouTube Music',
            'Tollywood': 'Official Telugu Hits Playlist YouTube Music',
            'Mollywood': 'Official Malayalam Hits Playlist YouTube Music',
            'Chandanavana': 'Official Kannada Hits Playlist YouTube Music',
            'International': 'Official Global Top Hits YouTube Music'
        };

        const result = {};

        await Promise.all(Object.entries(categories).map(async ([name, query]) => {
            try {
                const r = await ytSearch(query);
                result[name] = r.playlists.slice(0, 6).map(p => ({
                    id: p.listId,
                    title: p.title,
                    thumbnail: `/api/proxy-image?url=${encodeURIComponent(p.thumbnail || p.image)}`,
                    uploaderName: p.author.name,
                    videoCount: p.videoCount,
                    url: p.url,
                    engine: `http://localhost:${PORT}`
                }));
            } catch (e) { result[name] = []; }
        }));

        res.json(result);
    } catch (err) {
        log(`[Trending Playlists Error] ${err.message}`);
        res.status(500).json({ error: "Failed to fetch trending playlists" });
    }
});

// --- TRENDING TRACKS ENDPOINT ---
app.get('/api/trending-tracks', async (req, res) => {
    try {
        const query = 'top hits 2026 global official audio';
        const results = await ytSearch(query);
        const tracks = results.videos.slice(0, 12).map(v => ({
            title: v.title,
            uploaderName: v.author.name,
            thumbnail: `/api/proxy-image?url=${encodeURIComponent(v.thumbnail)}`,
            url: v.url,
            id: v.videoId,
            duration: v.seconds,
            engine: `http://localhost:${PORT}`
        }));
        res.json(tracks);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch trending tracks" });
    }
});

// --- SECURE AI PROXY ENDPOINT ---
app.post('/api/ai-chat', async (req, res) => {
    const { model, messages, max_tokens } = req.body;
    
    // Fallback if not configured in backend environment
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_KEY;
    
    if (!OPENROUTER_KEY) {
        return res.status(500).json({ error: "OpenRouter API Key not configured on server" });
    }

    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model,
            messages,
            max_tokens
        }, {
            headers: { 
                "Authorization": `Bearer ${OPENROUTER_KEY}`, 
                "X-Title": "Echonix",
                "Content-Type": "application/json"
            }
        });
        res.json(response.data);
    } catch (err) {
        log(`[AI Proxy Error] ${err.response?.status} - ${err.message}`);
        res.status(err.response?.status || 500).json(err.response?.data || { error: "AI Request Failed" });
    }
});

// Spotify Auth removed

app.listen(PORT, '0.0.0.0', () => {
    log(`Echonix Pure-Proxy Server active on port ${PORT}`);
    log(`Local Network: http://0.0.0.0:${PORT}`);
});
