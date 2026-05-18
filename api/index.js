const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { spawn } = require('child_process');
const app = express();

app.use(cors());

// --- SEARCH ENDPOINT ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const ytDlpProcess = spawn('yt-dlp', [
        '--no-playlist',
        '--flat-playlist',
        '--dump-json',
        `ytsearch10:${query}`
    ]);

    let output = '';
    ytDlpProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    ytDlpProcess.on('close', () => {
        try {
            const results = output.trim().split('\n').filter(l => l).map(line => JSON.parse(line));
            const items = results.map(item => {
                const thumbnailUrl = item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url);
                return {
                    title: item.title,
                    uploaderName: item.uploader || item.channel,
                    thumbnail: thumbnailUrl ? `/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}` : null,
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    duration: item.duration,
                    id: item.id
                };
            });
            res.json({ items });
        } catch (e) {
            res.status(500).json({ error: "Failed to parse search results" });
        }
    });
});

// --- IMAGE PROXY ENDPOINT ---
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("Missing image URL");

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send("Failed to fetch image");
    }
});

// --- STREAM ENDPOINT ---
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send("Missing video ID");

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // M4A is the preferred format, which is audio/mp4
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');

    const ytDlpProcess = spawn('yt-dlp', [
        '--no-playlist',
        '-f', 'ba[ext=m4a]/ba', // Prefer M4A for faster extraction
        '--no-part',
        '--no-cache-dir',
        '-o', '-',
        youtubeUrl
    ]);

    ytDlpProcess.stdout.pipe(res);

    ytDlpProcess.on('error', (err) => {
        res.status(500).end();
    });

    req.on('close', () => {
        ytDlpProcess.kill();
    });
});

module.exports = app;
