const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytSearch = require('yt-search');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());

// A robust list of public Piped instances to use as "shields"
const PIPED_INSTANCES = [
    "https://pipedapi.syncpundit.io",
    "https://pipedapi.kavin.rocks",
    "https://piped-api.garudalinux.org",
    "https://api.piped.victr.me",
    "https://pipedapi.drgns.space"
];

// --- SEARCH ENDPOINT ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        // Search is safe and fast with yt-search
        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 15);
        
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

// --- PURE PROXY STREAM ENDPOINT ---
app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send("Missing ID");

    console.log(`[Proxy] Requesting stream for: ${videoId}`);

    // We iterate through public Piped instances to find one that can give us a stream URL.
    // This bypasses the need for local yt-dlp/cookies and works on Render/Cloud.
    for (const instance of PIPED_INSTANCES) {
        try {
            console.log(`[Proxy] Trying instance: ${instance}`);
            const sRes = await axios.get(`${instance}/streams/${videoId}`, { timeout: 5000 });
            
            // Prefer M4A for best browser compatibility (especially mobile)
            const stream = sRes.data.audioStreams.find(s => s.format === 'M4A') || sRes.data.audioStreams[0];
            
            if (stream && stream.url) {
                console.log(`[Proxy] Success! Streaming from ${instance}`);
                
                // Fetch the actual audio bytes from the provided URL
                const audioStream = await axios.get(stream.url, { 
                    responseType: 'stream',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                // Set headers and pipe the bytes directly to the user
                res.setHeader('Content-Type', audioStream.headers['content-type'] || 'audio/mp4');
                return audioStream.data.pipe(res);
            }
        } catch (err) {
            console.warn(`[Proxy] Instance ${instance} failed, trying next...`);
        }
    }

    console.error("[Proxy] ALL INSTANCES FAILED");
    res.status(500).send("Playback engine failed - All proxies offline");
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Echonix Pure-Proxy Server active on port ${PORT}`);
    console.log(`Local Network: http://0.0.0.0:${PORT}`);
});
