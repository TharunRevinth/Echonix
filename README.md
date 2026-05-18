# Echonix: AI-Powered Retro Walkman

Echonix is a modern, high-fidelity music streaming application with a nostalgic "Retro Walkman" aesthetic. It combines the aesthetic of 90s hardware with cutting-edge AI features, providing a unique playback experience.

## 🚀 Key Features
- **Retro Walkman UI**: Features a spinning disc animation for track cover art, glass reflection effects, and analog-style controls.
- **AI Echo Analyzer**: Powered by Google Gemini 1.5 Flash, it provides real-time "Tape Data" analysis, explaining the meaning and vibe of lyrics in a punchy, technical style.
- **Local Pipeline Proxy**: Utilizes a custom backend proxy for reliable audio streaming and search, bypassing common CORS and 404 issues.
- **Dual-Source Lyrics**: Robust lyrics fetching through LRCLIB and Lyrics.ovh, with automatic string cleaning for better accuracy.
- **Spotify Integration**: Connect your Spotify account to view and access your personal playlists directly within the retro interface.

## 🛠️ Tech Stack
- **Frontend**: React.js, Tailwind CSS (Custom Retro Styles), Lucide React (Icons)
- **Backend**: Node.js, Express (Custom Streaming Pipeline)
- **AI**: Google Gemini API
- **Data Sources**: YouTube (via yt-dlp), Spotify API, LRCLIB, Lyrics.ovh, MusicBrainz

## 📦 Deployment Note
This project is designed to be deployed on **Vercel**. 
- The Frontend is a standard React application.
- The Backend functions as a proxy for audio streaming and search metadata.

---
*Created with nostalgia and AI.*
