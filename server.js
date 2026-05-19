const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());

// --- YTDL AGENT SETUP ---
let ytdlAgent;
try {
    const rawCookies = process.env.YOUTUBE_COOKIES_JSON;
    if (rawCookies) {
        const cookiesArray = JSON.parse(rawCookies);
        ytdlAgent = ytdl.createAgent(cookiesArray);
        console.log('[Echonix] Authenticated YouTube agent loaded successfully.');
    } else {
        console.log('[Echonix] Running without cookies (Local Fallback mode).');
    }
} catch (error) {
    console.error('[Echonix Error] Failed to initialize cookies:', error.message);
}

const PIPED = ["https://pipedapi.syncpundit.io", "https://pipedapi.kavin.rocks", "https://piped-api.garudalinux.org"];

// --- SEARCH ENDPOINT ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        // Use yt-search for high-speed, binary-free searching
        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 10);
        
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
        console.error("Search failed, falling back to Piped...");
        for (const instance of PIPED) {
            try {
                const pRes = await axios.get(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, { timeout: 5000 });
                if (pRes.data && pRes.data.items) return res.json(pRes.data);
            } catch (pErr) {}
        }
        res.status(500).json({ error: "All search engines offline" });
    }
});

// --- IMAGE PROXY ---
app.get('/api/proxy-image', async (req, res) => {
    try {
        const r = await axios.get(req.query.url, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
        r.data.pipe(res);
    } catch (e) { res.status(500).end(); }
});

// --- STREAM ENDPOINT ---
app.get('/api/stream', async (req, res) => {
    const id = req.query.id;
    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
    let fallbackTriggered = false;

    const startFallback = async () => {
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        console.log(`Fallback triggered for video: ${id}`);
        for (const instance of PIPED) {
            try {
                const s = await axios.get(`${instance}/streams/${id}`);
                const stream = s.data.audioStreams.find(s => s.format === 'M4A') || s.data.audioStreams[0];
                if (stream && stream.url) {
                    const d = await axios.get(stream.url, { responseType: 'stream' });
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', d.headers['content-type'] || 'audio/mp4');
                    }
                    return d.data.pipe(res);
                }
            } catch (err) {}
        }
        if (!res.headersSent) res.status(500).end();
    };

    try {
        const streamOptions = {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25 // 32MB buffer
        };

        if (ytdlAgent) streamOptions.agent = ytdlAgent;

        res.setHeader('Content-Type', 'audio/mp4');
        
        ytdl(videoUrl, streamOptions)
            .on('error', (err) => {
                console.error("ytdl-core error:", err.message);
                startFallback();
            })
            .pipe(res);

    } catch (e) {
        console.error("Stream route error:", e);
        startFallback();
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Echonix Pure-Node Server running on port ${PORT}`));
