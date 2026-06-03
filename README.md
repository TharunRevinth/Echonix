# Echonix: Advanced AI-Powered Music Streaming Platform

Echonix is a sophisticated, full-stack music streaming application that integrates modern web technologies with artificial intelligence to provide a seamless and intelligent listening experience. Built with a robust React frontend and a high-performance Node.js proxy backend, Echonix offers high-fidelity audio streaming, AI-driven music discovery, and global radio access.

## Key Features

- **AI-Driven Discovery:** Utilize advanced language models via OpenRouter to search for music based on "vibes" or descriptions rather than just titles and artists.
- **High-Fidelity Streaming:** A custom-built backend proxy ensures uninterrupted playback by bypassing CORS limitations and optimizing audio delivery from multiple sources.
- **Global Radio Integration:** Access thousands of live radio stations worldwide through the integrated Radio Browser API, covering diverse genres and regions.
- **AI Lyric Analysis:** Real-time lyric fetching and synchronization, supplemented by AI-powered "vibe analysis" that provides technical and emotional insights into your favorite tracks.
- **Offline Capabilities:** Integrated MP3 download functionality allows users to save tracks for offline listening.
- **Dynamic Queue Management:** Seamlessly manage your listening experience with a flexible queue, liked songs collection, and detailed listening history.

## Tech Stack

### Frontend
- **React 19:** Utilizing the latest React features for a responsive and performant UI.
- **Tailwind CSS 4.0:** Leveraging next-generation styling for a sleek, modern aesthetic.
- **Lucide React:** A comprehensive set of clean and consistent icons.
- **Axios:** For robust API communication and handling.

### Backend
- **Node.js & Express:** A lightweight and scalable server architecture.
- **yt-dlp (via youtube-dl-exec):** Industrial-grade audio extraction and streaming engine.
- **yt-search:** Efficient metadata retrieval for music discovery.
- **Radio Browser API:** Providing access to a global directory of radio stations.

### AI Integration
- **OpenRouter API:** Powering the "Vibe Search" and "Lyric Analysis" using state-of-the-art models like Gemini 2.0 Flash.

## Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn
- An OpenRouter API Key (for AI features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/echonix.git
   cd echonix
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   REACT_APP_OPENROUTER_KEY=your_openrouter_api_key_here
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```
   This command concurrently starts the Express backend (port 5001) and the React development server (port 3000).

## Usage

- **Standard Search:** Enter a song title or artist in the search bar to find and stream tracks instantly.
- **AI Vibe Search:** Toggle the "AI Mode" in the search bar and describe the atmosphere or mood you're looking for (e.g., "Lo-fi beats for late-night coding").
- **Radio FM:** Navigate to the Radio view to explore global frequencies and discover new music from around the world.
- **Downloads:** Click the download icon on any track to save it as an MP3 file to your local device.
- **Lyrics Analysis:** While a track is playing, open the lyrics view and click "Analyze Vibe" to get AI-generated insights into the song.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. **Fork** the Project.
2. **Create** your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. **Commit** your Changes (`git commit -m 'Add some AmazingFeature'`).
4. **Push** to the Branch (`git push origin feature/AmazingFeature`).
5. **Open** a Pull Request.

