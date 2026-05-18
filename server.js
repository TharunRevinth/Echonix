const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());

app.get('/api/search', (req, res) => {
    const query = req.query.q;
    const ytDlpProcess = spawn('yt-dlp', ['--no-playlist', '--flat-playlist', '--dump-json', `ytsearch10:${query}`]);
    let output = '';
    ytDlpProcess.stdout.on('data', (data) => { output += data.toString(); });
    ytDlpProcess.on('close', () => {
        try {
            const results = output.trim().split('\n').filter(l => l).map(line => JSON.parse(line));
            const items = results.map(item => ({
                title: item.title,
                uploaderName: item.uploader || item.channel,
                thumbnail: item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url) ? `/api/proxy-image?url=${encodeURIComponent(item.thumbnail || item.thumbnails[0].url)}` : null,
                url: `https://www.youtube.com/watch?v=${item.id}`,
                duration: item.duration,
                id: item.id
            }));
            res.json({ items });
        } catch (e) { res.status(500).json({ error: "Search failed" }); }
    });
});

app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    try {
        const response = await axios.get(imageUrl, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) { res.status(500).send("Failed to fetch image"); }
});

app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;
    res.setHeader('Content-Type', 'audio/mpeg');
    const ytDlpProcess = spawn('yt-dlp', ['-f', 'bestaudio', '-o', '-', `https://www.youtube.com/watch?v=${videoId}`]);
    ytDlpProcess.stdout.pipe(res);
    req.on('close', () => { ytDlpProcess.kill(); });
});

app.listen(PORT, () => { console.log(`Backend running on http://localhost:${PORT}`); });
