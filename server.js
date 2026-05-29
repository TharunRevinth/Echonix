const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytSearch = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5001;

const log = (msg) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync('server.log', `[${timestamp}] ${msg}\n`);
    console.log(msg);
};

app.use(cors());

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

// --- SEARCH ENDPOINT ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const filter = req.query.filter; // music_songs
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        // Enhance query for better music results if filter is set
        const searchQuery = filter === 'music_songs' ? `${query} music` : query;
        const results = await ytSearch(searchQuery);
        
        let videos = results.videos;

        // If filtering for songs, remove very long videos, very short clips, and non-music keywords
        if (filter === 'music_songs') {
            videos = videos.filter(v => {
                const title = v.title.toLowerCase();
                const channel = v.author.name.toLowerCase();
                
                const isTooLong = v.seconds > 540; // Filter out anything over 9 mins
                const isTooShort = v.seconds < 60; // Filter out clips/shorts under 1 minute
                
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
        }

        videos = videos.slice(0, 15);
        
        return res.json({ 
            items: videos.map(v => ({ 
                title: v.title, 
                uploaderName: v.author.name, 
                thumbnail: `/api/proxy-image?url=${encodeURIComponent(v.thumbnail)}`, 
                url: v.url, 
                id: v.videoId,
                duration: v.seconds
            }))
        });
    } catch (err) {
        console.error("Local search failed, falling back to Piped...");
        for (const instance of PIPED_INSTANCES) {
            try {
                const pRes = await axios.get(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, { timeout: 4000 });
                if (pRes.data && pRes.data.items) return res.json(pRes.data);
            } catch (pErr) {}
        }
        res.status(500).json({ error: "All search engines offline" });
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

    // Set headers for streaming
    res.setHeader('Content-Type', 'audio/mp4'); // Defaulting to mp4/m4a
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    // Arguments for yt-dlp to pipe best audio to stdout
    const args = [
        youtubeUrl,
        '-f', 'bestaudio[ext=m4a]/bestaudio',
        '-o', '-',
        '--no-playlist',
        '--no-warnings',
        '--force-ipv4',
        '--no-part',
        '--no-cache-dir',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    const ytDlpProcess = spawn(YTDLP_PATH, args);

    // Pipe the audio data directly to the user
    ytDlpProcess.stdout.pipe(res);

    ytDlpProcess.stderr.on('data', (data) => {
        const msg = data.toString();
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

app.listen(PORT, '0.0.0.0', () => {
    log(`Echonix Pure-Proxy Server active on port ${PORT}`);
    log(`Local Network: http://0.0.0.0:${PORT}`);
});
