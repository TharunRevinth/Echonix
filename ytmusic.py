import sys
import json
from ytmusicapi import YTMusic

yt = YTMusic()

def search_songs(query):
    return yt.search(query, filter="songs")

def search_playlists(query):
    return yt.search(query, filter="playlists")

def get_playlist(playlist_id, limit=100):
    return yt.get_playlist(playlist_id, limit=limit)

def get_home():
    return yt.get_home()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "search_songs":
            query = sys.argv[2]
            print(json.dumps(search_songs(query)))
        elif command == "search_playlists":
            query = sys.argv[2]
            print(json.dumps(search_playlists(query)))
        elif command == "get_playlist":
            playlist_id = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 100
            print(json.dumps(get_playlist(playlist_id, limit=limit)))
        elif command == "get_home":
            print(json.dumps(get_home()))
        else:
            print(json.dumps({"error": "Unknown command"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
