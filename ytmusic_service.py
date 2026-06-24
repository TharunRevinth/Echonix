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
            'artists': [{'name': a.get('name'), 'id': a.get('id') or a.get('browseId')} for a in t.get('artists', [])] if t.get('artists') else [],
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
            'artists': [{'name': a.get('name'), 'id': a.get('id') or a.get('browseId')} for a in t.get('artists', [])] if t.get('artists') else [],
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

@app.route('/ytmusic/artist-search')
def artist_search():
    verify()
    try:
        name = request.args.get('name')
        if not name:
            return jsonify({"error": "Missing artist name"}), 400
        results = ytmusic.search(name, filter='artists')
        if results and len(results) > 0:
            best = results[0]
            raw_url = (best.get('thumbnails') or [{}])[-1].get('url', '') if best.get('thumbnails') else ''
            image_url = raw_url
            if raw_url and '=' in raw_url:
                base, suffix = raw_url.split('=', 1)
                import re
                new_suffix = re.sub(r'w\d+', 'w500', suffix)
                new_suffix = re.sub(r'h\d+', 'h500', new_suffix)
                if '-p' not in new_suffix and '-c' not in new_suffix:
                    if '-l90-rj' in new_suffix:
                        new_suffix = new_suffix.replace('-l90-rj', '-p-l90-rj')
                    elif '-rj' in new_suffix:
                        new_suffix = new_suffix.replace('-rj', '-p-rj')
                    else:
                        new_suffix += '-p'
                image_url = f"{base}={new_suffix}"
            return jsonify({
                'id': best.get('browseId'),
                'name': best.get('artist') or best.get('name'),
                'thumbnail': image_url
            })
        return jsonify({"error": "Artist not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ytmusic/artist/<channelId>')
def get_artist(channelId):
    verify()
    try:
        data = ytmusic.get_artist(channelId)
        thumbnails = data.get('thumbnails', [])
        banner_url = thumbnails[-1].get('url', '') if thumbnails else ''
        
        # Try to find the square thumbnail from artist search first to avoid cropping banner if possible
        image_url = ''
        artist_name = data.get('name')
        if artist_name:
            try:
                search_results = ytmusic.search(artist_name, filter='artists')
                for r in search_results:
                    if r.get('browseId') == channelId:
                        search_thumbs = r.get('thumbnails', [])
                        if search_thumbs:
                            image_url = search_thumbs[-1].get('url', '')
                            break
            except Exception:
                pass
                
        # If search failed or wasn't found, use the banner URL rewritten to be square
        if not image_url:
            image_url = banner_url
            
        # Ensure the image URL is scaled to a high-quality square (500x500)
        if image_url and '=' in image_url:
            base, suffix = image_url.split('=', 1)
            import re
            new_suffix = re.sub(r'w\d+', 'w500', suffix)
            new_suffix = re.sub(r'h\d+', 'h500', new_suffix)
            if '-p' not in new_suffix and '-c' not in new_suffix:
                if '-l90-rj' in new_suffix:
                    new_suffix = new_suffix.replace('-l90-rj', '-p-l90-rj')
                elif '-rj' in new_suffix:
                    new_suffix = new_suffix.replace('-rj', '-p-rj')
                else:
                    new_suffix += '-p'
            image_url = f"{base}={new_suffix}"
            
        songs = []
        songs_data = data.get('songs', {})
        songs_results = songs_data.get('results', [])
        browse_id = songs_data.get('browseId')
        
        for t in songs_results:
            songs.append({
                'id': t.get('videoId') or t.get('id'),
                'title': t.get('title') or t.get('name') or 'Unknown Title',
                'uploaderName': data.get('name'),
                'artists': [{'name': a.get('name'), 'id': a.get('id') or a.get('browseId')} for a in t.get('artists', [])] if t.get('artists') else [{'name': data.get('name'), 'id': channelId}],
                'thumbnail': (t.get('thumbnails') or [{}])[-1].get('url', '') if t.get('thumbnails') else '',
                'duration': parse_duration_to_seconds(t.get('length')) or parse_duration_to_seconds(t.get('duration_seconds')) or 0,
                'isYTMusic': True
            })
            
        albums = []
        albums_data = data.get('albums', {})
        albums_results = albums_data.get('results', [])
        for a in albums_results:
            albums.append({
                'id': a.get('browseId') or a.get('id'),
                'title': a.get('title') or 'Unknown Album',
                'year': a.get('year', ''),
                'thumbnail': (a.get('thumbnails') or [{}])[-1].get('url', '') if a.get('thumbnails') else ''
            })

        singles = []
        singles_data = data.get('singles', {})
        singles_results = singles_data.get('results', [])
        for s in singles_results:
            singles.append({
                'id': s.get('browseId') or s.get('id'),
                'title': s.get('title') or 'Unknown Single',
                'year': s.get('year', ''),
                'thumbnail': (s.get('thumbnails') or [{}])[-1].get('url', '') if s.get('thumbnails') else ''
            })
            
        return jsonify({
            'id': channelId,
            'name': data.get('name'),
            'description': data.get('description', ''),
            'thumbnail': image_url,
            'songs': songs,
            'albums': albums,
            'singles': singles,
            'songsBrowseId': browse_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv("YTMUSIC_SERVICE_PORT", 5002))
    app.run(host='0.0.0.0', port=port, debug=False)
