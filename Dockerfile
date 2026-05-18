FROM node:20-slim

# Install dependencies for yt-dlp and ffmpeg
RUN apt-get update && \
    apt-get install -y python3 curl ffmpeg && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Render uses the PORT environment variable
ENV PORT=5001
EXPOSE 5001

# Run the server
CMD ["node", "server.js"]
