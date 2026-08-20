require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytSearch = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const app = express();
const PORT = process.env.SERVER_PORT || 5001;

const log = (msg) => {
    console.log(`[${new Date().toISOString()}] ${msg}`);
};

// --- PERSISTENT LYRICS CACHE SYSTEM ---
const cacheDir = path.join(__dirname, '.lyrics_cache');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

const getCachePath = (prefix, params) => {
    const key = Object.entries(params)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}_${encodeURIComponent(v || '')}`)
        .join('__');
    const safeKey = `${prefix}__${key}`.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 200);
    return path.join(cacheDir, `${safeKey}.json`);
};

const readCache = (prefix, params) => {
    try {
        const file = getCachePath(prefix, params);
        if (fs.existsSync(file)) {
            const data = fs.readFileSync(file, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        log(`Cache read failed: ${e.message}`);
    }
    return null;
};

const writeCache = (prefix, params, data) => {
    try {
        const file = getCachePath(prefix, params);
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        log(`Cache write failed: ${e.message}`);
    }
};

const callYTMusic = (command, args = []) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [path.join(__dirname, 'ytmusic.py'), command, ...args]);
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                log(`[ytmusic.py Error] Code ${code}: ${errorOutput}`);
                return reject(new Error(errorOutput || `Python process exited with code ${code}`));
            }
            try {
                resolve(JSON.parse(output));
            } catch (e) {
                log(`[ytmusic.py Parse Error] ${e.message}. Output: ${output.substring(0, 100)}...`);
                reject(e);
            }
        });
    });
};

const parseDuration = (durStr) => {
    if (!durStr) return 0;
    if (typeof durStr === 'number') return durStr;
    const parts = durStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
};

app.use(cors());
app.use(express.json()); // Enable JSON body parsing for POST requests
app.use(express.static(path.join(__dirname, 'build')));

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

// --- SEARCH ENDPOINT (Powered by YTMusic API) ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const filter = req.query.filter; // music_songs or playlists
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        if (filter === 'playlists') {
            const results = await callYTMusic('search_playlists', [query]);
            return res.json({ 
                items: results.map(v => ({ 
                    title: v.title, 
                    uploaderName: v.artists?.map(a => a.name).join(', ') || v.author || "Unknown", 
                    thumbnail: `/api/proxy-image?url=${encodeURIComponent(v.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url)}`, 
                    url: `https://www.youtube.com/playlist?list=${v.browseId || v.playlistId}`, 
                    id: v.browseId || v.playlistId, 
                    videoCount: v.trackCount || v.itemCount || 0 
                }))
            });
        }

        // Search Songs via YTMusic API
        const results = await callYTMusic('search_songs', [query]);
        const items = results.map(v => ({
            id: v.videoId,
            title: v.title,
            uploaderName: v.artists?.map(a => a.name).join(', ') || "Unknown Artist",
            artists: v.artists?.map(a => ({ name: a.name, id: a.id || a.browseId })) || [],
            albumName: v.album?.name || "",
            thumbnail: `/api/proxy-image?url=${encodeURIComponent(v.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url)}`,
            duration: v.duration_seconds || parseDuration(v.duration),
            videoId: v.videoId,
            isYTMusic: true
        }));

        return res.json({ items });

    } catch (err) {
        log(`[YTMusic Search Fallback] ${err.message}`);
        // Fallback to YouTube if YTMusic fails
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
        const results = await callYTMusic('search_songs', [`${title} ${artist}`]);
        const bestMatch = results[0];

        if (!bestMatch) {
            // Fallback to yt-search
            const ytResults = await ytSearch(`${title} ${artist} audio`);
            const fallbackMatch = ytResults.videos[0];
            if (!fallbackMatch) return res.status(404).json({ error: "No YouTube match found" });
            return res.json({
                videoId: fallbackMatch.videoId,
                url: fallbackMatch.url,
                duration: fallbackMatch.seconds
            });
        }

        res.json({
            videoId: bestMatch.videoId,
            url: `https://www.youtube.com/watch?v=${bestMatch.videoId}`,
            duration: bestMatch.duration_seconds || parseDuration(bestMatch.duration)
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

// Path resolution for Electron
const isElectron = process.env.IS_ELECTRON === 'true';
const getResourcePath = (relativePath) => {
    if (isElectron && !process.env.NODE_ENV.includes('dev')) {
        // In packaged Electron app, resources are in resourcesPath
        return path.join(process.resourcesPath, relativePath);
    }
    return path.join(__dirname, relativePath);
};

const YTDLP_PATH = getResourcePath('node_modules/youtube-dl-exec/bin/yt-dlp');

// --- AUDIO STREAM CACHE & PRELOAD MANAGER ---
const audioCache = new Map(); // videoId -> { buffer: Buffer, contentType: string, timestamp: number }
const activeJobs = new Map(); // videoId -> { process: ChildProcess, listeners: Set<Response>, chunks: Buffer[], contentType: string, headersSent: boolean }
const MAX_CACHE_ITEMS = 30;

const pruneAudioCache = () => {
    while (audioCache.size > MAX_CACHE_ITEMS) {
        const oldestKey = audioCache.keys().next().value;
        audioCache.delete(oldestKey);
    }
};

const startAudioJob = (videoId) => {
    if (activeJobs.has(videoId)) return activeJobs.get(videoId);
    if (audioCache.has(videoId)) return null;

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
        youtubeUrl,
        '--js-runtimes', 'node',
        '--extractor-args', 'youtube:player_client=web_embedded',
        '-f', 'bestaudio',
        '-o', '-',
        '--no-playlist',
        '--no-warnings',
        '--force-ipv4',
        '--no-part'
    ];

    const ytDlpProcess = spawn(YTDLP_PATH, args);
    const job = {
        process: ytDlpProcess,
        listeners: new Set(),
        chunks: [],
        contentType: 'audio/webm',
        headersSent: false
    };
    activeJobs.set(videoId, job);

    ytDlpProcess.stdout.on('data', (chunk) => {
        job.chunks.push(chunk);

        if (!job.headersSent) {
            if (chunk.length >= 4 && chunk[0] === 0x1A && chunk[1] === 0x45 && chunk[2] === 0xDF && chunk[3] === 0xA3) {
                job.contentType = 'audio/webm';
            } else if (chunk.length >= 3 && chunk[0] === 0x49 && chunk[1] === 0x44 && chunk[2] === 0x33) {
                job.contentType = 'audio/mpeg';
            } else if (chunk.length >= 8 && chunk.toString('utf8', 4, 8) === 'ftyp') {
                job.contentType = 'audio/mp4';
            }
            job.headersSent = true;
        }

        // Forward to all active client responses
        for (const res of job.listeners) {
            try {
                if (!res.headersSent) {
                    res.writeHead(200, {
                        'Content-Type': job.contentType,
                        'Access-Control-Allow-Origin': '*',
                        'Accept-Ranges': 'none',
                        'Cache-Control': 'public, max-age=3600',
                        'Connection': 'keep-alive'
                    });
                }
                res.write(chunk);
            } catch (e) {
                job.listeners.delete(res);
            }
        }
    });

    ytDlpProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('ERROR')) {
            log(`[yt-dlp Error] ${msg.trim()}`);
        }
    });

    ytDlpProcess.on('close', (code, signal) => {
        activeJobs.delete(videoId);
        if (code === 0 && job.chunks.length > 0) {
            const fullBuffer = Buffer.concat(job.chunks);
            pruneAudioCache();
            audioCache.set(videoId, {
                buffer: fullBuffer,
                contentType: job.contentType,
                timestamp: Date.now()
            });
            log(`[Audio Cache] Cached stream for: ${videoId} (${(fullBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
        }
        for (const res of job.listeners) {
            try { res.end(); } catch (e) {}
        }
        job.listeners.clear();
    });

    ytDlpProcess.on('error', (err) => {
        log(`[Spawn Error] Failed yt-dlp job for ${videoId}: ${err.message}`);
        activeJobs.delete(videoId);
        for (const res of job.listeners) {
            try {
                if (!res.headersSent) res.status(500).send("Playback engine failed");
                else res.end();
            } catch (e) {}
        }
        job.listeners.clear();
    });

    return job;
};

// --- PRELOAD ENDPOINT ---
app.get('/api/stream-prefetch', (req, res) => {
    const videoId = req.query.id;
    if (!videoId || videoId === 'undefined' || videoId === 'null') {
        return res.status(400).send("Missing ID");
    }
    if (audioCache.has(videoId) || activeJobs.has(videoId)) {
        return res.json({ status: "already_cached_or_loading" });
    }
    log(`[Prefetch] Background pre-warming audio for: ${videoId}`);
    startAudioJob(videoId);
    res.json({ status: "prefetching_started" });
});

// --- PURE PROXY STREAM ENDPOINT (High Speed Cache + Range Support) ---
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;
    const start = req.query.start ? parseFloat(req.query.start) : 0;
    if (!videoId || videoId === 'undefined' || videoId === 'null') {
        return res.status(400).send("Missing or invalid video ID");
    }

    // 1. Instant Cache Hit
    if (audioCache.has(videoId) && start === 0) {
        const cached = audioCache.get(videoId);
        const total = cached.buffer.length;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const startByte = parseInt(parts[0], 10);
            const endByte = parts[1] ? parseInt(parts[1], 10) : total - 1;
            const chunksize = (endByte - startByte) + 1;
            const slice = cached.buffer.subarray(startByte, endByte + 1);

            res.writeHead(206, {
                'Content-Range': `bytes ${startByte}-${endByte}/${total}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': cached.contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            });
            return res.end(slice);
        }

        res.writeHead(200, {
            'Content-Length': total,
            'Content-Type': cached.contentType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
        });
        return res.end(cached.buffer);
    }

    // 2. Custom seek time requested -> spawn dedicated seek stream
    if (start > 0) {
        log(`[Proxy] Direct Seek Stream started for: ${videoId} at ${start}s`);
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const args = [
            youtubeUrl,
            '--js-runtimes', 'node',
            '--extractor-args', 'youtube:player_client=web_embedded',
            '-f', 'bestaudio',
            '-o', '-',
            '--no-playlist',
            '--no-warnings',
            '--force-ipv4',
            '--no-part',
            '--download-sections', `*${start}-inf`
        ];

        const ytProc = spawn(YTDLP_PATH, args);
        ytProc.stdout.on('data', (chunk) => {
            if (!res.headersSent) {
                let contentType = 'audio/webm';
                if (chunk.length >= 4 && chunk[0] === 0x1A && chunk[1] === 0x45 && chunk[2] === 0xDF && chunk[3] === 0xA3) contentType = 'audio/webm';
                else if (chunk.length >= 3 && chunk[0] === 0x49 && chunk[1] === 0x44 && chunk[2] === 0x33) contentType = 'audio/mpeg';
                else if (chunk.length >= 8 && chunk.toString('utf8', 4, 8) === 'ftyp') contentType = 'audio/mp4';

                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Accept-Ranges': 'none',
                    'Connection': 'keep-alive'
                });
            }
        });
        ytProc.stdout.pipe(res);
        req.on('close', () => ytProc.kill());
        return;
    }

    // 3. Live Multiplexing from Active Job or Fresh Job
    log(`[Proxy] Live Audio Stream started for: ${videoId}`);
    let job = activeJobs.get(videoId);
    if (!job) {
        job = startAudioJob(videoId);
    }

    // Send all existing chunks buffered so far immediately
    if (job.chunks.length > 0) {
        if (!res.headersSent) {
            res.writeHead(200, {
                'Content-Type': job.contentType,
                'Access-Control-Allow-Origin': '*',
                'Accept-Ranges': 'none',
                'Cache-Control': 'public, max-age=3600',
                'Connection': 'keep-alive'
            });
        }
        for (const chunk of job.chunks) {
            res.write(chunk);
        }
    }

    job.listeners.add(res);

    req.on('close', () => {
        if (job) {
            job.listeners.delete(res);
            // If no listeners and not in prefetch, keep downloading to fill cache
        }
    });
});

// --- DOWNLOAD ENDPOINT ---
app.get('/api/download', (req, res) => {
    const videoId = req.query.id;
    const title = req.query.title || 'audio';
    if (!videoId || videoId === 'undefined' || videoId === 'null') {
        return res.status(400).send("Missing or invalid video ID");
    }

    log(`[Download] Starting download for: ${videoId} (${title})`);

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const filename = `${title.replace(/[^\w\s]/gi, '')}.mp3`;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Use yt-dlp to convert to mp3 and pipe to response
    const args = [
        youtubeUrl,
        '--js-runtimes', 'node',
        '--extractor-args', 'youtube:player_client=web_embedded',
        '-f', 'bestaudio',
        '--extract-audio',
        '--audio-format', 'mp3',
        '-o', '-',
        '--no-playlist',
        '--no-warnings',
        '--force-ipv4'
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
app.get('/api/playlist', async (req, res) => {
    const playlistId = req.query.id;
    if (!playlistId) return res.status(400).json({ error: "Missing Playlist ID or URL" });

    log(`[Playlist] Fetching metadata for: ${playlistId}`);

    // Extract ID if full URL is provided
    let id = playlistId;
    if (playlistId.includes('list=')) {
        id = playlistId.split('list=')[1].split('&')[0];
    }

    try {
        const data = await callYTMusic('get_playlist', [id]);
        const tracks = data.tracks.map(entry => {
            return {
                id: entry.videoId,
                title: entry.title,
                uploaderName: entry.artists?.map(a => a.name).join(', ') || "Unknown Artist",
                artists: entry.artists?.map(a => ({ name: a.name, id: a.id || a.browseId })) || [],
                thumbnail: `/api/proxy-image?url=${encodeURIComponent(entry.thumbnails?.sort((a, b) => b.width - a.width)[0]?.url || "")}`,
                duration: entry.duration_seconds || parseDuration(entry.duration),
                url: `https://www.youtube.com/watch?v=${entry.videoId}`,
                isYTMusic: true
            };
        });

        return res.json({
            title: data.title,
            uploader: data.author?.name || data.author || "Unknown",
            itemCount: data.trackCount || tracks.length,
            thumbnail: `/api/proxy-image?url=${encodeURIComponent(data.thumbnails?.sort((a, b) => b.width - a.width)[0]?.url || "")}`,
            items: tracks
        });
    } catch (e) {
        log(`[Playlist YTMusic Error] ${e.message}. Falling back to yt-dlp...`);
        
        try {
            const url = `https://www.youtube.com/playlist?list=${id}`;
            const args = [
                url,
                '--js-runtimes', 'node',
                '--extractor-args', 'youtube:player_client=web_embedded',
                '--dump-single-json',
                '--flat-playlist',
                '--playlist-end', '50',
                '--no-warnings',
                '--force-ipv4'
            ];

            const ytDlpProcess = spawn(YTDLP_PATH, args);
            let output = '';

            ytDlpProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            ytDlpProcess.on('close', (code) => {
                if (code !== 0) {
                    return res.status(500).json({ error: "Failed to fetch playlist with both engines" });
                }
                try {
                    const data = JSON.parse(output);
                    const tracks = data.entries.map(entry => {
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

                    const playlistThumb = data.thumbnails?.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]?.url || "";

                    res.json({
                        title: data.title,
                        uploader: data.uploader,
                        itemCount: data.playlist_count || tracks.length,
                        thumbnail: playlistThumb ? `/api/proxy-image?url=${encodeURIComponent(playlistThumb)}` : null,
                        items: tracks
                    });
                } catch (err) {
                    res.status(500).json({ error: "Failed to parse playlist data from fallback" });
                }
            });
        } catch (fallbackErr) {
            res.status(500).json({ error: "Playlist fallback failed" });
        }
    }
});

// --- TRENDING PLAYLISTS ENDPOINT ---
app.get('/api/trending-playlists', async (req, res) => {
    try {
        const customQuery = req.query.q;
        
        if (customQuery) {
            const results = await callYTMusic('search_playlists', [customQuery]);
            return res.json(results.map(p => ({
                id: p.browseId || p.playlistId,
                title: p.title,
                thumbnail: `/api/proxy-image?url=${encodeURIComponent(p.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url)}`,
                uploaderName: p.artists?.map(a => a.name).join(', ') || p.author || "Unknown",
                videoCount: p.trackCount || p.itemCount || 0,
                url: `https://www.youtube.com/playlist?list=${p.browseId || p.playlistId}`,
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
                const r = await callYTMusic('search_playlists', [query]);
                result[name] = r.slice(0, 6).map(p => ({
                    id: p.browseId || p.playlistId,
                    title: p.title,
                    thumbnail: `/api/proxy-image?url=${encodeURIComponent(p.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url)}`,
                    uploaderName: p.artists?.map(a => a.name).join(', ') || p.author || "Unknown",
                    videoCount: p.trackCount || p.itemCount || 0,
                    url: `https://www.youtube.com/playlist?list=${p.browseId || p.playlistId}`,
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
        try {
            const results = await callYTMusic('search_songs', [query]);
            if (results && results.length > 0) {
                const tracks = results.slice(0, 12).map(v => ({
                    id: v.videoId,
                    title: v.title,
                    uploaderName: v.artists?.map(a => a.name).join(', ') || "Unknown Artist",
                    artists: v.artists?.map(a => ({ name: a.name, id: a.id || a.browseId })) || [],
                    thumbnail: `/api/proxy-image?url=${encodeURIComponent(v.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url)}`,
                    url: `https://www.youtube.com/watch?v=${v.videoId}`,
                    duration: v.duration_seconds || parseDuration(v.duration),
                    isYTMusic: true,
                    engine: `http://localhost:${PORT}`
                }));
                return res.json(tracks);
            }
        } catch (e) {
            log(`[YTMusic Trending Fallback] ${e.message}`);
        }

        // Fallback to yt-search
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
        log(`[Trending Tracks Error] ${err.message}`);
        res.status(500).json({ error: "Failed to fetch trending tracks" });
    }
});

// --- SECURE AI PROXY ENDPOINT ---
app.post('/api/ai-chat', async (req, res) => {
    const { model, messages, max_tokens } = req.body;
    
    // Fallback if not configured in backend environment
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

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

// --- RATE LIMITING ---
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 60000, max: 60, message: { error: 'Too many requests' } });
app.use('/api/', limiter);

// --- YTMUSIC USER DATA ROUTES (proxied to Python service) ---
const YTMUSIC_BASE = `http://127.0.0.1:${process.env.YTMUSIC_SERVICE_PORT || 5002}/ytmusic`;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

app.get('/api/ytmusic/artist-search', async (req, res) => {
    const name = req.query.name;
    try {
        const response = await axios.get(`${YTMUSIC_BASE}/artist-search`, {
            params: { name },
            headers: { 'X-Internal-Token': INTERNAL_SECRET }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Service unavailable' });
    }
});

app.get('/api/ytmusic/artist/:channelId', async (req, res) => {
    const channelId = req.params.channelId;
    try {
        const response = await axios.get(`${YTMUSIC_BASE}/artist/${channelId}`, {
            headers: { 'X-Internal-Token': INTERNAL_SECRET }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Service unavailable' });
    }
});

app.get('/api/ytmusic/playlist/:pid', async (req, res) => {
    const pid = req.params.pid;
    try {
        const response = await axios.get(`${YTMUSIC_BASE}/playlist/${pid}`, {
            headers: { 'X-Internal-Token': INTERNAL_SECRET }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Service unavailable' });
    }
});

app.get('/api/ytmusic/radio/:vid', async (req, res) => {
    const vid = req.params.vid;
    try {
        const response = await axios.get(`${YTMUSIC_BASE}/radio/${vid}`, {
            headers: { 'X-Internal-Token': INTERNAL_SECRET }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Service unavailable' });
    }
});

// Recommendations endpoint
app.post('/api/ytmusic/recommendations', limiter, async (req, res) => {
    if (!req.body) return res.status(400).json({ error: 'No body' });
    try {
        const response = await axios.post(
            `${YTMUSIC_BASE}/recommendations`,
            req.body,
            { headers: { 'X-Internal-Token': INTERNAL_SECRET } }
        );
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Recommendations unavailable' });
    }
});

app.post('/api/ytmusic/taste-profile', limiter, async (req, res) => {
    try {
        const response = await axios.post(
            `${YTMUSIC_BASE}/taste-profile`,
            req.body,
            { headers: { 'X-Internal-Token': INTERNAL_SECRET } }
        );
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Profile unavailable' });
    }
});

app.post('/api/ytmusic/setup', limiter, async (req, res) => {
    if (!req.body) return res.status(400).json({ error: 'No body' });
    try {
        const response = await axios.post(
            `${YTMUSIC_BASE}/setup`,
            req.body,
            { headers: { 'X-Internal-Token': INTERNAL_SECRET } }
        );
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Setup service unavailable' });
    }
});

app.get('/api/ytmusic/:path', async (req, res) => {
    const path = req.params.path;
    if (!path || path.includes('..')) {
        return res.status(400).json({ error: 'Bad request' });
    }
    try {
        const response = await axios.get(`${YTMUSIC_BASE}/${path}`, {
            headers: { 'X-Internal-Token': INTERNAL_SECRET }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Service unavailable' });
    }
});

// Proxy iTunes search for metadata lookup fallback
app.get('/api/lyrics/itunes', async (req, res) => {
  const { artist, title } = req.query;
  try {
    const cached = readCache('itunes', { artist, title });
    if (cached) return res.json(cached);
    
    // Search iTunes for the track
    const searchRes = await axios.get(
      'https://itunes.apple.com/search',
      {
        params: {
          term: `${title} ${artist || ''}`.trim(),
          media: 'music',
          entity: 'song',
          limit: 5
        },
        timeout: 15000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      }
    );

    const results = searchRes.data?.results || [];
    if (!results.length) {
      const responseData = { notFound: true };
      writeCache('itunes', { artist, title }, responseData);
      return res.json(responseData);
    }

    // Return cleaned metadata
    const tracks = results.map(r => ({
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      duration: Math.round(r.trackTimeMillis / 1000),
    }));

    const responseData = { tracks };
    writeCache('itunes', { artist, title }, responseData);
    res.json(responseData);

  } catch (err) {
    log(`itunes error: ${err.message}`);
    res.json({ notFound: true });
  }
});

// Proxy lrclib to avoid CORS
app.get('/api/lyrics/lrclib', async (req, res) => {
    const { artist, title, q } = req.query;
    try {
        const cached = readCache('lrclib', { artist, title, q });
        if (cached) return res.json(cached);

        let url;
        if (q) {
            url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
        } else {
            if (!artist || !title) {
                return res.status(400).json({ error: 'Missing artist or title for exact lookup' });
            }
            url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
        }
        
        const response = await axios.get(url, { 
            timeout: 15000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        
        writeCache('lrclib', { artist, title, q }, response.data);
        res.json(response.data);
    } catch (err) {
        log(`lrclib error: ${err.message}`);
        const fallback = { error: 'Lyrics not found' };
        if (err.response && (err.response.status === 404 || err.response.status === 400)) {
            writeCache('lrclib', { artist, title, q }, fallback);
        }
        res.status(err.response?.status || 404).json(fallback);
    }
});

// Proxy lyrics.ovh to avoid CORS
app.get('/api/lyrics/ovh', async (req, res) => {
    const { artist, title } = req.query;
    try {
        if (!artist || !title) {
            return res.status(400).json({ error: 'Missing artist or title' });
        }
        const cached = readCache('ovh', { artist, title });
        if (cached) return res.json(cached);

        const response = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
            { 
                timeout: 15000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            }
        );
        writeCache('ovh', { artist, title }, response.data);
        res.json(response.data);
    } catch (err) {
        log(`ovh error: ${err.message}`);
        const fallback = { error: 'Lyrics not found' };
        if (err.response && err.response.status === 404) {
            writeCache('ovh', { artist, title }, fallback);
        }
        res.status(404).json(fallback);
    }
});

// Spotify Auth removed

app.get('/*splat', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    log(`Echonix Pure-Proxy Server active on port ${PORT}`);
    log(`Network Access: http://${require('os').networkInterfaces()['eth0']?.[0].address || '0.0.0.0'}:${PORT}`);
});

