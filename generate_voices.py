import os
import json
import urllib.request
import urllib.error
import time

API_KEY = "sk_785d5f75a0e3ec89f4d5fcfc73b8823ae9dfeacacc9566e4"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "audio")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Voice IDs:
# Narrator: 'pNInz6obpgDQGcFmaJgB' (Adam - deep, resonant, mythic)
# Mushika: 'ErXwobaYiN019PkySvjV' (Antoni - energetic, expressive, loyal mouse companion)

NARRATOR_VOICE = "pNInz6obpgDQGcFmaJgB"
MUSHIKA_VOICE = "ErXwobaYiN019PkySvjV"

VOICE_SCRIPTS = [
    {
        "filename": "intro_story.mp3",
        "voice_id": NARRATOR_VOICE,
        "text": "Welcome, divine devotee! This is Vighnaharta, the battle for cosmic wisdom. Five sacred Akhanda Diyas burn within Ganesha's sanctum. The demon legions of Mahavighna march to extinguish them! Tap approaching demons to strike them with Lord Ganesha's golden Parashu. Protect the Diyas and break every obstacle!"
    },
    {
        "filename": "mushika_w1_start.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "Prabhu Ganesha! Matsarasura's shadow wisps are creeping toward our temple! Do not let them touch the sanctum, swing your Parashu!"
    },
    {
        "filename": "mushika_w2_taunt.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "Aha, a good warm-up, Prabhu! But look! Krodhasura's barbed crawlers are swarming from the flanks! Are you getting slow, or did you eat too many modaks?"
    },
    {
        "filename": "mushika_w3_taunt.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "O Lambodara! Wave three! The heavy stone golems of Lobhasura take two direct hits! Shatter them before they crush my snacks!"
    },
    {
        "filename": "mushika_w4_taunt.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "Hot, hot, hot! Analasura's blazing fire scythes are spinning toward us! Quick, Lord of Wisdom, banish the inferno!"
    },
    {
        "filename": "mushika_w5_taunt.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "The cosmic Sri Yantra is spinning! Halfway to victory, Prabhu! Show all the worlds why you are the true Vighnaharta!"
    },
    {
        "filename": "mushika_w6_taunt.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "Thunder and tempest! Even the heavens shake, but our sacred diyas burn bright! Don't let your guard down now, Ganesha!"
    },
    {
        "filename": "mushika_w7_taunt.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "The celestial gates are in sight! Only an elephant god with an unbeatable spirit can withstand this onslaught!"
    },
    {
        "filename": "mushika_w8_taunt.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "The demonic eclipse deepens! The supreme titan Mahavighna stirs in the darkness! Unleash your full divine might!"
    },
    {
        "filename": "mushika_w10_boss.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "Behold! Mahavighna has arrived! Deflect his heavy dark orbs back into his face! For Kailash and the universe!"
    },
    {
        "filename": "mushika_victory.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "Jaya Ganesha! Victory is ours! You broke every obstacle and saved the universe! Now, where is my victory modak?"
    },
    {
        "filename": "mushika_breach.mp3",
        "voice_id": MUSHIKA_VOICE,
        "text": "Prabhu, watch out! A sacred diya has been extinguished! Defend the sanctum!"
    }
]

def generate_voice(item):
    out_path = os.path.join(OUTPUT_DIR, item["filename"])
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        print(f"[SKIP] {item['filename']} already exists ({os.path.getsize(out_path)} bytes)")
        return True

    print(f"[GEN] Generating {item['filename']}...")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{item['voice_id']}"
    payload = json.dumps({
        "text": item["text"],
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            audio_bytes = resp.read()
            with open(out_path, "wb") as f:
                f.write(audio_bytes)
            print(f"[DONE] Saved {item['filename']} ({len(audio_bytes)} bytes)")
            time.sleep(0.5) # gentle pacing
            return True
    except urllib.error.HTTPError as e:
        print(f"[FAIL] HTTPError {e.code} for {item['filename']}: {e.read().decode('utf-8', errors='ignore')}")
        return False
    except Exception as e:
        print(f"[FAIL] Error for {item['filename']}: {e}")
        return False

def main():
    print(f"Starting ElevenLabs voice generation into {OUTPUT_DIR}...")
    success_count = 0
    for item in VOICE_SCRIPTS:
        if generate_voice(item):
            success_count += 1
    print(f"Completed: {success_count}/{len(VOICE_SCRIPTS)} voice files ready.")

if __name__ == "__main__":
    main()
