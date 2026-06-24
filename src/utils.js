import axios from 'axios';
import React from 'react';

export const renderArtists = (track, viewArtist) => {
  if (!track) return null;
  const artists = track.artists;
  const defaultName = track.uploaderName || track.artist || 'Unknown Artist';
  
  if (artists && artists.length > 0) {
    return artists.map((a, idx) => (
      <React.Fragment key={a.id || idx}>
        <span 
          onClick={(e) => { 
            e.stopPropagation(); 
            viewArtist(a.name, a.id); 
          }} 
          className="hover:underline cursor-pointer hover:text-white"
        >
          {a.name}
        </span>
        {idx < artists.length - 1 && <span>, </span>}
      </React.Fragment>
    ));
  }
  
  // Fallback: split string if it contains comma-separated values
  const names = defaultName.split(', ');
  return names.map((name, idx) => (
    <React.Fragment key={idx}>
      <span 
        onClick={(e) => { 
          e.stopPropagation(); 
          viewArtist(name.trim()); 
        }} 
        className="hover:underline cursor-pointer hover:text-white"
      >
        {name.trim()}
      </span>
      {idx < names.length - 1 && <span>, </span>}
    </React.Fragment>
  ));
};

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
  if (!t || isNaN(t) || !isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// When running on Android, 'localhost' points to the device itself.
// You must change 'YOUR_SERVER_IP' to your computer's IP address (e.g. 192.168.1.5)
// to allow the mobile app to connect to your backend services.
const SERVER_IP = 'localhost'; 

export const getHost = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return SERVER_IP;
  return host;
};

export const ENGINES = [
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://api.piped.victr.me"
];
