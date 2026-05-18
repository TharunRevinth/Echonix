const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { spawn } = require('child_process');
const app = express();

app.use(cors());

const PIPED_INSTANCES = [
    "https://pipedapi.syncpundit.io",
    "https://pipedapi.kavin.rocks",
    "https://piped-api.garudalinux.org"
];

// --- SEARCH ENDPOINT ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const ytDlpProcess = spawn('yt-dlp', ['--no-playlist', '--flat-playlist', '--dump-json', `ytsearch10:${query}`]);
    let output = '';
    ytDlpProcess.stdout.on('data', (data) => { output += data.toString(); });
    
    ytDlpProcess.on('close', async (code) => {
        if (code === 0 && output.trim()) {
            try {
                const results = output.trim().split('\n').filter(l => l).map(line => JSON.parse(line));
                return res.json({ items: results.map(item => ({
                    title: item.title,
                    uploaderName: item.uploader || item.channel,
                    thumbnail: `/api/proxy-image?url=${encodeURIComponent(item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url))}`,
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    duration: item.duration, id: item.id
                }))});
            } catch (e) {}
        }
        
        for (const instance of PIPED_INSTANCES) {
            try {
                const pRes = await axios.get(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, { timeout: 5000 });
                if (pRes.data && pRes.data.items) return res.json({ items: pRes.data.items });
            } catch (err) {}
        }
        res.status(500).json({ error: "All search engines offline" });
    });
});

// --- IMAGE PROXY ---
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("Missing URL");
    try {
        const response = await axios.get(imageUrl, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        response.data.pipe(res);
    } catch (e) { res.status(500).send("Proxy error"); }
});

// --- UNIVERSAL STREAM ENDPOINT ---
app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;
    let fallbackTriggered = false;

    const startFallback = async () => {
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        for (const instance of PIPED_INSTANCES) {
            try {
                const sRes = await axios.get(`${instance}/streams/${videoId}`);
                const stream = sRes.data.audioStreams.find(s => s.format === 'M4A') || sRes.data.audioStreams[0];
                if (stream && stream.url) {
                    const streamData = await axios.get(stream.url, { responseType: 'stream' });
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', streamData.headers['content-type'] || 'audio/mp4');
                    }
                    return streamData.data.pipe(res);
                }
            } catch (err) {}
        }
        if (!res.headersSent) res.status(500).end();
    };

    try {
        const ytDlpProcess = spawn('yt-dlp', ['-f', 'ba[ext=m4a]/ba', '-o', '-', `https://www.youtube.com/watch?v=${videoId}`]);
        
        ytDlpProcess.stdout.on('data', () => {
            if (!res.headersSent) res.setHeader('Content-Type', 'audio/mp4');
        });

        ytDlpProcess.stdout.pipe(res, { end: false });

        ytDlpProcess.on('error', () => {
            startFallback();
        });

        ytDlpProcess.on('close', (code) => {
            if (code !== 0) {
                startFallback();
            } else {
                res.end();
            }
        });

        req.on('close', () => { ytDlpProcess.kill(); });
    } catch (e) {
        startFallback();
    }
});

module.exports = app;
