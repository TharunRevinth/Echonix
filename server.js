const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());

const PIPED = ["https://pipedapi.syncpundit.io", "https://pipedapi.kavin.rocks", "https://piped-api.garudalinux.org"];

app.get('/api/search', (req, res) => {
    const query = req.query.q;
    const ytDlpProcess = spawn('yt-dlp', ['--no-playlist', '--flat-playlist', '--dump-json', `ytsearch10:${query}`]);
    let output = '';
    ytDlpProcess.stdout.on('data', (d) => { output += d.toString(); });
    ytDlpProcess.on('close', async (code) => {
        if (code === 0 && output.trim()) {
            try {
                const results = output.trim().split('\n').filter(l => l).map(line => JSON.parse(line));
                return res.json({ items: results.map(i => ({ 
                    title: i.title, 
                    uploaderName: i.uploader || i.channel, 
                    thumbnail: `/api/proxy-image?url=${encodeURIComponent(i.thumbnail || i.thumbnails?.[0]?.url)}`, 
                    url: `https://www.youtube.com/watch?v=${i.id}`, 
                    id: i.id 
                }))});
            } catch (e) {}
        }
        
        for (const instance of PIPED) {
            try {
                const pRes = await axios.get(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, { timeout: 5000 });
                if (pRes.data && pRes.data.items) return res.json(pRes.data);
            } catch (err) {}
        }
        res.status(500).json({ error: "Search failed" });
    });
});

app.get('/api/proxy-image', async (req, res) => {
    try {
        const r = await axios.get(req.query.url, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
        r.data.pipe(res);
    } catch (e) { res.status(500).end(); }
});

app.get('/api/stream', async (req, res) => {
    const id = req.query.id;
    let fallbackTriggered = false;

    const startFallback = async () => {
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        for (const instance of PIPED) {
            try {
                const s = await axios.get(`${instance}/streams/${id}`);
                const stream = s.data.audioStreams.find(s => s.format === 'M4A') || s.data.audioStreams[0];
                if (stream && stream.url) {
                    const d = await axios.get(stream.url, { responseType: 'stream' });
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', d.headers['content-type'] || 'audio/mpeg');
                    }
                    return d.data.pipe(res);
                }
            } catch (err) {}
        }
        if (!res.headersSent) res.status(500).end();
    };

    const y = spawn('yt-dlp', ['-f', 'ba[ext=m4a]/ba', '-o', '-', `https://www.youtube.com/watch?v=${id}`]);
    
    y.stdout.on('data', () => {
        if (!res.headersSent) res.setHeader('Content-Type', 'audio/mp4');
    });

    y.stdout.pipe(res, { end: false });
    
    y.on('error', (err) => {
        console.error("yt-dlp spawn error:", err);
        startFallback();
    });

    y.on('close', (code) => {
        if (code !== 0) {
            startFallback();
        } else {
            res.end();
        }
    });

    req.on('close', () => {
        y.kill();
    });
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));
