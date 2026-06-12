from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from ytmusicapi import YTMusic
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://127.0.0.1:5001", "http://localhost:5001"])

# Use browser.json for persistent auth (playlists, liked, history)
# Fallback to anonymous if not present
if os.path.exists("browser.json"):
    ytmusic = YTMusic("browser.json")
else:
    ytmusic = YTMusic()

INTERNAL_SECRET = os.getenv("INTERNAL_API_SECRET")

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

if __name__ == '__main__':
    port = int(os.getenv("YTMUSIC_SERVICE_PORT", 5002))
    app.run(host='127.0.0.1', port=port, debug=False)
