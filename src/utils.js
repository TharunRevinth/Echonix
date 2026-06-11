import axios from 'axios';

export const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

export const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

export const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

export const formatTime = (t) => {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const cleanString = (str) => {
  if (!str) return "";
  return str
    .replace(/\(official video\)/gi, '')
    .replace(/\(lyrics\)/gi, '')
    .replace(/\(lyric video\)/gi, '')
    .replace(/\[official audio\]/gi, '')
    .replace(/\(official audio\)/gi, '')
    .replace(/\[lyrics\]/gi, '')
    .replace(/\(hd\)/gi, '')
    .replace(/\(4k\)/gi, '')
    .replace(/\(8k\)/gi, '')
    .replace(/full video.*/gi, '')
    .replace(/lyric video.*/gi, '')
    .replace(/official video.*/gi, '')
    .replace(/\|.*/gi, '')
    .replace(/ft\..*/gi, '')
    .replace(/feat\..*/gi, '')
    .replace(/ - Topic$/gi, '')
    .replace(/\[.*\]/g, '')
    .trim();
};

export const parseLRC = (lrcText) => {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d+):(\d+\.?\d*)\]/g;
  
  lines.forEach(line => {
    const timestamps = [...line.matchAll(timeRegex)];
    if (timestamps.length > 0) {
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        timestamps.forEach(match => {
          const minutes = parseInt(match[1]);
          const seconds = parseFloat(match[2]);
          result.push({ time: minutes * 60 + seconds, text });
        });
      }
    }
  });
  
  return result.sort((a, b) => a.time - b.time);
};

export const getHost = () => {
  const host = window.location.hostname;
  return host === 'localhost' ? 'localhost' : host;
};

export const ENGINES = [
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://api.piped.victr.me"
];
