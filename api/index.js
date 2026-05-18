const express = require('express');
const cors = require('cors');
const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const app = express();

app.use(cors());

// --- SEARCH ENDPOINT ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        // We use youtube-dl-exec to fetch search results as JSON
        const output = await youtubedl(`ytsearch10:${query}`, {
            dumpJson: true,
            flatPlaylist: true,
        });

        const results = Array.isArray(output) ? output : [output];
        // Note: flat-playlist dump can be a single object or multiple
        const entries = output.entries || results;

        const items = entries.map(item => {
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
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: "Search failed", 
            message: error.message,
            hint: "If this is on Vercel, the binary might be missing. Ensure postinstall script runs or binary is included."
        });
    }
});

// --- IMAGE PROXY ENDPOINT ---
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("Missing image URL");

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://www.youtube.com/'
            }
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

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Create a readable stream directly from youtube-dl-exec
    const stream = youtubedl.exec(youtubeUrl, {
        format: 'bestaudio',
        output: '-',
    });

    stream.stdout.pipe(res);

    stream.on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).end();
    });

    req.on('close', () => {
        if (stream.kill) stream.kill();
    });
});

module.exports = app;
