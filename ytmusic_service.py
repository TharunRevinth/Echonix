from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from ytmusicapi import YTMusic
import os
from dotenv import load_dotenv
from recommendation_engine import build_taste_profile, rank_recommendations

load_dotenv()

app = Flask(__name__)
CORS(app, origins="*") # Allow all for network visibility, internal verify() still protects routes

# Use browser.json for persistent auth (playlists, liked, history)
# Priority: BROWSER_JSON_PATH env var (for Electron), then local browser.json
browser_json = os.getenv("BROWSER_JSON_PATH", "browser.json")

if os.path.exists(browser_json):
    ytmusic = YTMusic(browser_json)
else:
    ytmusic = YTMusic()

INTERNAL_SECRET = os.getenv("INTERNAL_API_SECRET")

def parse_duration_to_seconds(dur):
    if not dur:
        return 0
    if isinstance(dur, (int, float)):
        return int(dur)
    if isinstance(dur, str):
        parts = dur.split(':')
        try:
            if len(parts) == 1:
                return int(parts[0])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except ValueError:
            return 0
    return 0

def verify():
    if request.headers.get("X-Internal-Token") != INTERNAL_SECRET:
        abort(403)

@app.route('/ytmusic/playlists')
def playlists():
    verify()
    try:
        return jsonify(ytmusic.get_library_playlists(limit=25))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ytmusic/liked')
def liked():
    verify()
    try:
        return jsonify(ytmusic.get_liked_songs(limit=50))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ytmusic/history')
def history():
    verify()
    try:
        return jsonify(ytmusic.get_history())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ytmusic/home')
def home():
    verify()
    try:
        return jsonify(ytmusic.get_home(limit=6))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ytmusic/playlist/<pid>')
def playlist(pid):
    verify()
    if not pid.replace('-','').replace('_','').isalnum():
        abort(400)
    try:
        return jsonify(ytmusic.get_playlist(pid, limit=50))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ytmusic/radio/<video_id>')
def get_radio(video_id):
    verify()
    try:
        data = ytmusic.get_watch_playlist(videoId=video_id, limit=25)
        tracks = [{
            'id': t.get('videoId') or t.get('id'),
            'title': t.get('title') or t.get('name') or 'Unknown Title',
            'uploaderName': ', '.join(a['name'] for a in (t.get('artists') or [])) if t.get('artists') else (t.get('artist') or t.get('byline') or 'Unknown Artist'),
            'thumbnail': (t.get('thumbnail') or t.get('thumbnails') or [{}])[-1].get('url', ''),
            'duration': t.get('length', 0) or t.get('duration_seconds', 0),
            'isYTMusic': True
        } for t in data.get('tracks', []) if (t.get('videoId') or t.get('id'))]
        return jsonify(tracks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ytmusic/taste-profile', methods=['POST'])
def taste_profile():
    verify()
    try:
        data = request.json or {}
        history = data.get('history', [])
        profile = build_taste_profile(history)
        return jsonify(profile)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ytmusic/recommendations', methods=['POST'])
def recommendations():
    verify()
    try:
        data = request.json or {}
        current_track = data.get('currentTrack', {})
        history = data.get('history', [])
        recently_played_ids = data.get('recentlyPlayedIds', [])
        
        video_id = current_track.get('videoId') or current_track.get('id')
        if not video_id:
            return jsonify([])
        
        watch_data = ytmusic.get_watch_playlist(videoId=video_id, limit=25)
        candidates = [{
            'id': t.get('videoId') or t.get('id'),
            'title': t.get('title') or t.get('name') or 'Unknown Title',
            'uploaderName': ', '.join(a['name'] for a in (t.get('artists') or [])) if t.get('artists') else (t.get('artist') or t.get('byline') or 'Unknown Artist'),
            'thumbnail': (t.get('thumbnail') or t.get('thumbnails') or [{}])[-1].get('url', '') if isinstance(t.get('thumbnail'), list) or isinstance(t.get('thumbnails'), list) else '',
            'duration': parse_duration_to_seconds(t.get('length')) or parse_duration_to_seconds(t.get('duration_seconds')) or 0,
            'isYTMusic': True
        } for t in watch_data.get('tracks', []) if (t.get('videoId') or t.get('id'))]
        
        # Filter candidates to avoid duplicating current track
        candidates = [c for c in candidates if c['id'] != video_id]
        
        # Ensure current track duration is int
        current_track_copy = current_track.copy()
        current_track_copy['duration'] = parse_duration_to_seconds(current_track.get('duration'))
        
        profile = build_taste_profile(history)
        ranked = rank_recommendations(candidates, current_track_copy, profile, recently_played_ids)
        
        return jsonify(ranked)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv("YTMUSIC_SERVICE_PORT", 5002))
    app.run(host='0.0.0.0', port=port, debug=False)
