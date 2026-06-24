import datetime
from collections import Counter

# ── TASTE PROFILE ──────────────────────────────────────────
def build_taste_profile(history):
    """
    Build a profile from listening history.
    history = list of {title, uploaderName, duration, id}
    """
    if not history:
        return {}

    artists = []
    languages = []
    
    for track in history:
        artist = track.get('uploaderName', '')
        # Get first artist if multiple
        primary = artist.split(',')[0].strip()
        if primary:
            artists.append(primary)
        
        # Detect language from title
        title = track.get('title', '')
        lang = detect_language(title)
        languages.append(lang)

    artist_counts = Counter(artists)
    language_counts = Counter(languages)

    return {
        'top_artists': [a for a, _ in artist_counts.most_common(10)],
        'top_languages': [l for l, _ in language_counts.most_common(5)],
        'total_played': len(history),
        'artist_weights': dict(artist_counts),
        'language_weights': dict(language_counts)
    }

def detect_language(text):
    """Simple language detection based on character sets and regional keywords"""
    if not text:
        return 'unknown'
    
    # Check for Indian scripts
    tamil_chars = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
    telugu_chars = sum(1 for c in text if '\u0C00' <= c <= '\u0C7F')
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    kannada_chars = sum(1 for c in text if '\u0C80' <= c <= '\u0CFF')
    
    if tamil_chars > 2: return 'tamil'
    if telugu_chars > 2: return 'telugu'
    if hindi_chars > 2: return 'hindi'
    if kannada_chars > 2: return 'kannada'
    
    # Check keywords for regional detection
    tamil_keywords = ['from', 'petta', 'rajini', 'thalapathy', 'anirudh', 
                      'kollywood', 'vijay', 'ajith', 'karuppu', 'dude']
    hindi_keywords = ['bollywood', 'arijit', 'atif', 'shreya', 'kumar sanu',
                      'lata', 'kishore', 'brahmastra', 'kesariya']
    telugu_keywords = ['tollywood', 'thaman', 'devi sri prasad', 'allu arjun',
                       'prabhas', 'mahesh']
    
    text_lower = text.lower()
    
    if any(k in text_lower for k in tamil_keywords): return 'tamil'
    if any(k in text_lower for k in hindi_keywords): return 'hindi'
    if any(k in text_lower for k in telugu_keywords): return 'telugu'
    
    return 'english'

# ── MOOD / CONTEXT DETECTION ──────────────────────────────────
def get_current_context():
    """
    Determine mood preference based on time of day:
    - 6 AM to 12 PM: energetic
    - 10 PM to 6 AM: chill
    - other times: normal
    """
    hour = datetime.datetime.now().hour
    if 6 <= hour < 12:
        return 'energetic'
    elif hour >= 22 or hour < 6:
        return 'chill'
    else:
        return 'normal'

def score_track_mood(title, artist, context):
    """
    Score track based on context mood.
    Returns a score bonus or penalty.
    """
    if context == 'normal':
        return 0

    title_lower = title.lower()
    artist_lower = artist.lower()
    combined = f"{title_lower} {artist_lower}"

    chill_keywords = [
        'lofi', 'acoustic', 'chill', 'sleep', 'relax', 'piano', 'slowed', 
        'reverb', 'ambient', 'sad', 'unplugged', 'healing', 'slumber', 
        'soft', 'meditation', 'lullaby', 'instrumental', 'peaceful'
    ]
    
    energetic_keywords = [
        'remix', 'dance', 'club', 'party', 'rock', 'dj', 'edm', 'workout', 
        'gym', 'rap', 'hip hop', 'energetic', 'bassboosted', 'hardcore', 
        'phonk', 'metal', 'hype', 'upbeat', 'electronic'
    ]

    has_chill = any(k in combined for k in chill_keywords)
    has_energetic = any(k in combined for k in energetic_keywords)

    if context == 'chill':
        if has_chill:
            return 20  # Bonus for chill songs at night
        if has_energetic:
            return -15 # Penalty for high-energy tracks at night
    elif context == 'energetic':
        if has_energetic:
            return 20  # Bonus for energetic songs in the morning
        if has_chill:
            return -10 # Mild penalty for slow songs in the morning

    return 0

# ── SCORING ALGORITHM ──────────────────────────────────────
def score_track(track, current_track, taste_profile, recently_played_ids):
    """
    Score a candidate track for recommendation.
    Higher score = better recommendation.
    """
    score = 0
    
    track_artist = track.get('uploaderName', '').lower()
    track_title = track.get('title', '')
    track_id = track.get('id', '')
    
    current_artist = current_track.get('uploaderName', '').lower()
    current_title = current_track.get('title', '').lower()
    
    # ── Don't recommend recently played ──
    if track_id in recently_played_ids:
        return -1
    
    # ── Same artist as current song ──
    if current_artist and current_artist in track_artist:
        score += 30
    
    # ── Artist in user's top artists ──
    top_artists = [a.lower() for a in taste_profile.get('top_artists', [])]
    artist_weights = {k.lower(): v for k, v in taste_profile.get('artist_weights', {}).items()}
    
    for artist in top_artists[:3]:  # Top 3 artists get bonus
        if artist in track_artist:
            weight = artist_weights.get(artist, 1)
            score += 20 + (weight * 2)
            break
    
    # ── Language match ──
    current_lang = detect_language(current_title)
    track_lang = detect_language(track_title)
    
    if current_lang == track_lang:
        score += 25
    
    # ── User's preferred language ──
    top_langs = taste_profile.get('top_languages', [])
    if top_langs and track_lang == top_langs[0]:
        score += 15
    
    # ── Duration similarity (±60 seconds) ──
    current_duration = current_track.get('duration', 0) or 0
    track_duration = track.get('duration', 0) or 0
    
    if current_duration and track_duration:
        diff = abs(current_duration - track_duration)
        if diff <= 60:
            score += 10
        elif diff <= 120:
            score += 5
    
    # ── Keyword similarity in title ──
    current_words = set(current_title.lower().split())
    track_words = set(track_title.lower().split())
    common_words = current_words & track_words
    
    # Remove common English words
    stopwords = {'the', 'a', 'an', 'from', 'of', 'in', 'on', 'at', 'to', 'for'}
    meaningful_common = common_words - stopwords
    
    score += len(meaningful_common) * 5

    # ── Mood Context Scoring ──
    context = get_current_context()
    score += score_track_mood(track_title, track_artist, context)
    
    return score

def rank_recommendations(candidates, current_track, taste_profile, recently_played_ids):
    """Rank candidate tracks by score"""
    scored = []
    
    for track in candidates:
        score = score_track(track, current_track, taste_profile, recently_played_ids)
        if score >= 0:  # Filter out recently played (score = -1)
            scored.append((score, track))
    
    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)
    
    return [track for _, track in scored]
