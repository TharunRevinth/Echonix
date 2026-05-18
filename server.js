const express = require('express');
const { exec, spawn } = require('child_process');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());

// --- SEARCH ENDPOINT ---
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const cmd = `yt-dlp "ytsearch10:${query}" --dump-json --flat-playlist`;
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Search error: ${error}`);
            return res.status(500).json({ error: "Search failed" });
        }
        
        try {
            const results = stdout.trim().split('\n').map(line => JSON.parse(line));
            const items = results.map(item => {
                const thumbnailUrl = item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url);
                return {
                    title: item.title,
                    uploaderName: item.uploader || item.channel,
                    // Proxy the thumbnail to avoid CORS/Referer issues
                    thumbnail: thumbnailUrl ? `/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}` : null,
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    duration: item.duration
                };
            });
            res.json({ items });
        } catch (e) {
            console.error(`Parse error: ${e}`);
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
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.youtube.com/'
            }
        });
        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) {
        console.error(`Image proxy error: ${error.message}`);
        res.status(500).send("Failed to fetch image");
    }
});

// --- STREAM ENDPOINT ---
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send("Missing video ID");

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Set appropriate headers for live audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    const ytDlpProcess = spawn('yt-dlp', [
        '--no-playlist',
        '-f', 'ba',
        '--no-part',
        '--no-cache-dir',
        '-o', '-',
        youtubeUrl
    ]);

    ytDlpProcess.stdout.pipe(res);

    ytDlpProcess.stderr.on('data', (data) => {
        // console.error(`yt-dlp log: ${data}`);
    });

    ytDlpProcess.on('error', (err) => {
        console.error(`Failed to start yt-dlp: ${err}`);
        res.status(500).end();
    });

    req.on('close', () => {
        ytDlpProcess.kill();
    });
});

app.listen(PORT, () => {
    console.log(`Pipeline Backend running on http://localhost:${PORT}`);
});
