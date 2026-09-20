"""
Synthesizes an authentic, epic Hindu Mythological Climax Battle BGM.
Features:
- Nasik Dhol & Pakhawaj thunderous bass kicks
- Snappy Tasha & Damru rhythmic battle cadence
- Sacred Temple Ghanta & Manjira metallic bronze cymbals
- Ceremonial Shankha (Conch Shell) divine blasts
- Raag Shivaranjani / Bhairav heroic Sitar & Shehnai lead melody
- Deep Sa-Pa cosmic Tanpura drone
"""

import math
import struct
import wave
import subprocess
import os
import random

SAMPLE_RATE = 44100
BPM = 136.0
BEAT_DUR = 60.0 / BPM
TOTAL_BARS = 16
BEATS_PER_BAR = 4
TOTAL_BEATS = TOTAL_BARS * BEATS_PER_BAR
TOTAL_DUR = TOTAL_BEATS * BEAT_DUR
NUM_SAMPLES = int(SAMPLE_RATE * TOTAL_DUR)

print(f"Generating Hindu Mythological Climax BGM: {TOTAL_DUR:.2f}s ({TOTAL_BARS} bars @ {BPM} BPM)...")

# Stereo sample buffers (left, right)
left_ch = [0.0] * NUM_SAMPLES
right_ch = [0.0] * NUM_SAMPLES

def add_sample(buf, idx, val):
    if 0 <= idx < NUM_SAMPLES:
        buf[idx] += val

# --- 1. Sa-Pa Tanpura & Cosmic Sanctum Drone (C2 = 65.41Hz, G2 = 98Hz, C3 = 130.81Hz) ---
print("Layering Tanpura & Sanctum resonance...")
for i in range(NUM_SAMPLES):
    t = i / SAMPLE_RATE
    # Gentle breathing modulation
    mod = 0.85 + 0.15 * math.sin(2 * math.pi * 0.25 * t)
    # Fundamental Sa
    sa1 = math.sin(2 * math.pi * 65.41 * t) * 0.08
    # Fifth Pa
    pa = math.sin(2 * math.pi * 98.00 * t) * 0.06
    # Upper Sa
    sa2 = math.sin(2 * math.pi * 130.81 * t + 0.3) * 0.04
    # Warm rich 2nd harmonic
    harm = math.sin(2 * math.pi * 196.00 * t + 0.7) * 0.02
    drone_val = (sa1 + pa + sa2 + harm) * mod

    left_ch[i] += drone_val * 0.95
    right_ch[i] += drone_val * 1.05

# --- 2. Heavy Dholak / Nasik Dhol Bass Drums ---
def render_dhol(start_time, intensity=1.0, is_open=True):
    start_sample = int(start_time * SAMPLE_RATE)
    dur = 0.38 if is_open else 0.22
    samples = int(dur * SAMPLE_RATE)
    base_freq = 110.0 if is_open else 135.0
    end_freq = 36.0 if is_open else 48.0

    for s in range(samples):
        idx = start_sample + s
        if idx >= NUM_SAMPLES:
            break
        t_drum = s / SAMPLE_RATE
        progress = s / samples

        # Exponential pitch drop (striking taut skin)
        freq = base_freq * math.exp(-12.0 * t_drum) + end_freq
        amp = intensity * (1.0 - progress) ** 1.8

        # Skin resonance with slight saturation
        sample_val = math.sin(2 * math.pi * freq * t_drum) * amp * 0.45
        # Add quick click transient at strike
        if s < 350:
            click = (1.0 - s / 350) * 0.25 * (1.0 if s % 2 == 0 else -1.0)
            sample_val += click

        add_sample(left_ch, idx, sample_val * 0.92)
        add_sample(right_ch, idx, sample_val * 1.08)

# --- 3. Crisp Tasha / Dholak Slap (High attack rim strike) ---
def render_tasha(start_time, intensity=0.7):
    start_sample = int(start_time * SAMPLE_RATE)
    dur = 0.12
    samples = int(dur * SAMPLE_RATE)
    random.seed(int(start_time * 1000))

    for s in range(samples):
        idx = start_sample + s
        if idx >= NUM_SAMPLES:
            break
        t = s / SAMPLE_RATE
        env = intensity * math.exp(-32.0 * t)
        # Bandpassed noise + wood resonance
        noise = (random.random() * 2.0 - 1.0) * 0.6
        body = math.sin(2 * math.pi * 840.0 * t) * 0.4 + math.sin(2 * math.pi * 1450.0 * t) * 0.25
        val = (noise + body) * env * 0.28

        add_sample(left_ch, idx, val * 1.1)
        add_sample(right_ch, idx, val * 0.9)

# --- 4. Damru Rattle (Quick double-strike roll) ---
def render_damru_roll(start_time, intensity=0.5):
    # Rapid rattle of 4 strikes
    for r in range(4):
        st = start_time + r * 0.042
        start_sample = int(st * SAMPLE_RATE)
        dur = 0.05
        samples = int(dur * SAMPLE_RATE)
        for s in range(samples):
            idx = start_sample + s
            if idx >= NUM_SAMPLES:
                break
            t = s / SAMPLE_RATE
            env = intensity * math.exp(-55.0 * t)
            freq = 460.0 if r % 2 == 0 else 580.0
            val = math.sin(2 * math.pi * freq * t) * env * 0.18
            # Pan alternating
            pan_l = 0.7 if r % 2 == 0 else 0.3
            pan_r = 1.0 - pan_l
            add_sample(left_ch, idx, val * pan_l)
            add_sample(right_ch, idx, val * pan_r)

# --- 5. Brass Temple Bell (Maha-Aarti Ghanta) ---
def render_temple_bell(start_time, freq=880.0, intensity=0.6, dur=1.8):
    start_sample = int(start_time * SAMPLE_RATE)
    samples = int(dur * SAMPLE_RATE)
    # Bell partials (non-harmonic ratios typical of temple bronze)
    partials = [
        (1.0, 0.45, 1.0),
        (2.02, 0.30, 0.8),
        (2.78, 0.22, 0.65),
        (4.15, 0.15, 0.45),
        (5.42, 0.08, 0.3)
    ]
    for s in range(samples):
        idx = start_sample + s
        if idx >= NUM_SAMPLES:
            break
        t = s / SAMPLE_RATE
        val = 0.0
        for ratio, weight, decay_rate in partials:
            p_freq = freq * ratio
            env = math.exp(-decay_rate * 3.2 * t)
            val += math.sin(2 * math.pi * p_freq * t) * weight * env
        val *= intensity * 0.22
        add_sample(left_ch, idx, val * 0.88)
        add_sample(right_ch, idx, val * 1.12)

# --- 6. Manjira / Hand Cymbals (Clash on offbeats) ---
def render_manjira(start_time, intensity=0.4):
    start_sample = int(start_time * SAMPLE_RATE)
    dur = 0.45
    samples = int(dur * SAMPLE_RATE)
    for s in range(samples):
        idx = start_sample + s
        if idx >= NUM_SAMPLES:
            break
        t = s / SAMPLE_RATE
        env = intensity * math.exp(-9.0 * t)
        # Inharmonic high shimmering frequencies
        c1 = math.sin(2 * math.pi * 3240.0 * t) * 0.35
        c2 = math.sin(2 * math.pi * 4820.0 * t) * 0.30
        c3 = math.sin(2 * math.pi * 6150.0 * t) * 0.20
        c4 = math.sin(2 * math.pi * 7900.0 * t) * 0.15
        val = (c1 + c2 + c3 + c4) * env * 0.14
        add_sample(left_ch, idx, val * 1.05)
        add_sample(right_ch, idx, val * 0.95)

# --- 7. Ceremonial Shankha Blast (Divine Conch Horn) ---
def render_shankha(start_time, dur=2.4, intensity=0.6):
    start_sample = int(start_time * SAMPLE_RATE)
    samples = int(dur * SAMPLE_RATE)
    freqs = [261.63, 392.00, 523.25] # C4, G4, C5 shell resonance
    weights = [0.45, 0.35, 0.20]

    for s in range(samples):
        idx = start_sample + s
        if idx >= NUM_SAMPLES:
            break
        t = s / SAMPLE_RATE
        # Swelling envelope
        if t < 0.35:
            env = (t / 0.35) ** 1.5
        elif t < dur - 0.7:
            env = 1.0
        else:
            env = max(0.0, (dur - t) / 0.7) ** 1.8

        # Vibrato
        vib = 1.0 + 0.015 * math.sin(2 * math.pi * 5.2 * t)
        val = 0.0
        for f, w in zip(freqs, weights):
            # Rich brassy wave
            harmonic = math.sin(2 * math.pi * f * vib * t) + 0.3 * math.sin(2 * math.pi * f * 2 * vib * t)
            val += harmonic * w
        val *= env * intensity * 0.26
        add_sample(left_ch, idx, val * 0.98)
        add_sample(right_ch, idx, val * 1.02)

# --- 8. Melodic Sitar / Shehnai Heroic Motif in Raag Shivaranjani / Bhairav ---
# Notes: Sa (C4=261.63), Re_komal (Db4=277.18), Ga (E4=329.63), Ma (F4=349.23), Pa (G4=392.00), Dha_komal (Ab4=415.30), Ni (B4=493.88), Sa' (C5=523.25), Re' (Db5=554.37), Ga' (E5=659.25), Pa' (G5=783.99)
C4 = 261.63; Db4 = 277.18; E4 = 329.63; F4 = 349.23; G4 = 392.00; Ab4 = 415.30; B4 = 493.88
C5 = 523.25; Db5 = 554.37; E5 = 659.25; G5 = 783.99

# 16-bar melodic phrase (4 beats per bar):
# Heroic anthem motif building to climactic peak
MELODY = [
    # Bar 1-2: Awakening fanfare (Sa - Pa - Ga - Sa)
    (0.0, C4, 1.0, 0.4), (1.0, G4, 1.0, 0.45), (2.0, E4, 1.0, 0.45), (3.0, G4, 1.0, 0.5),
    (4.0, C5, 1.5, 0.55), (5.5, B4, 0.5, 0.4), (6.0, Ab4, 1.0, 0.45), (7.0, G4, 1.0, 0.5),

    # Bar 3-4: Rhythmic syncopated flourish
    (8.0, E4, 0.5, 0.4), (8.5, F4, 0.5, 0.45), (9.0, G4, 1.0, 0.5), (10.0, Ab4, 0.5, 0.45), (10.5, B4, 0.5, 0.5),
    (11.0, C5, 2.0, 0.6), (13.0, Db5, 1.0, 0.55), (14.0, C5, 1.0, 0.5), (15.0, G4, 1.0, 0.45),

    # Bar 5-6: Ascending Shiva Tandav momentum
    (16.0, G4, 0.5, 0.45), (16.5, Ab4, 0.5, 0.45), (17.0, C5, 1.0, 0.55), (18.0, Db5, 1.0, 0.6),
    (19.0, E5, 2.0, 0.65), (21.0, Db5, 1.0, 0.55), (22.0, C5, 1.0, 0.55), (23.0, B4, 1.0, 0.5),

    # Bar 7-8: Climax high peak fanfare
    (24.0, C5, 1.0, 0.6), (25.0, E5, 1.0, 0.65), (26.0, G5, 2.0, 0.75),
    (28.0, E5, 1.0, 0.65), (29.0, Db5, 1.0, 0.6), (30.0, C5, 2.0, 0.7),

    # Bar 9-10: Variation with energetic cadence
    (32.0, C4, 0.75, 0.45), (32.75, E4, 0.75, 0.45), (33.5, G4, 0.5, 0.5), (34.0, C5, 1.5, 0.6),
    (36.0, Db5, 1.0, 0.6), (37.0, C5, 1.0, 0.55), (38.0, Ab4, 1.0, 0.5), (39.0, G4, 1.0, 0.5),

    # Bar 11-12: Rapid arpeggio run
    (40.0, E4, 0.5, 0.45), (40.5, G4, 0.5, 0.45), (41.0, C5, 0.5, 0.5), (41.5, Db5, 0.5, 0.55),
    (42.0, E5, 1.0, 0.65), (43.0, G5, 1.0, 0.7), (44.0, E5, 1.0, 0.65), (45.0, C5, 1.0, 0.6),
    (46.0, Db5, 1.0, 0.55), (47.0, C5, 1.0, 0.6),

    # Bar 13-14: Thunderous pre-climax resolve
    (48.0, G4, 0.5, 0.5), (48.5, C5, 0.5, 0.55), (49.0, Db5, 1.0, 0.6), (50.0, E5, 1.0, 0.7),
    (51.0, G5, 2.0, 0.8), (53.0, E5, 1.0, 0.7), (54.0, Db5, 1.0, 0.65), (55.0, C5, 1.0, 0.6),

    # Bar 15-16: Grand Maha-Aarti Finale resolving cleanly back into Loop
    (56.0, C5, 1.0, 0.7), (57.0, G4, 1.0, 0.6), (58.0, C5, 1.0, 0.7), (59.0, E5, 1.0, 0.75),
    (60.0, C5, 2.5, 0.8), (62.5, B4, 0.5, 0.5), (63.0, G4, 1.0, 0.5)
]

def render_sitar_note(start_time, freq, dur, intensity=0.5):
    start_sample = int(start_time * SAMPLE_RATE)
    samples = int(dur * SAMPLE_RATE)
    for s in range(samples):
        idx = start_sample + s
        if idx >= NUM_SAMPLES:
            break
        t = s / SAMPLE_RATE
        # Sitar plucking envelope (sharp attack with jawari buzz)
        env = intensity * math.exp(-2.5 * t)
        # Sitar jawari overtones
        f1 = math.sin(2 * math.pi * freq * t)
        f2 = 0.45 * math.sin(2 * math.pi * freq * 2.0 * t + 0.2)
        f3 = 0.25 * math.sin(2 * math.pi * freq * 3.0 * t + 0.4)
        f4 = 0.15 * math.sin(2 * math.pi * freq * 4.0 * t)
        val = (f1 + f2 + f3 + f4) * env * 0.18
        add_sample(left_ch, idx, val * 0.95)
        add_sample(right_ch, idx, val * 1.05)

print("Arranging percussion, bells, conches, and melody...")

# Render Shankha blasts at dramatic structural points
render_shankha(0.0 * BEAT_DUR, dur=3.2, intensity=0.7)
render_shankha(32.0 * BEAT_DUR, dur=3.2, intensity=0.75)
render_shankha(60.0 * BEAT_DUR, dur=3.0, intensity=0.8)

# Render Temple Bells on main cadence downbeats
for bar in range(TOTAL_BARS):
    beat = bar * BEATS_PER_BAR
    # Large brass temple bell on 1st beat of every 2 bars
    if bar % 2 == 0:
        render_temple_bell(beat * BEAT_DUR, freq=440.0, intensity=0.6, dur=3.0)
    else:
        render_temple_bell(beat * BEAT_DUR, freq=660.0, intensity=0.45, dur=2.2)

# Render Indian Battle Percussion pattern across all 64 beats
for beat_idx in range(TOTAL_BEATS):
    b_time = beat_idx * BEAT_DUR
    bar_pos = beat_idx % BEATS_PER_BAR

    # Dhol Heavy Bass kicks on beats 1 and 3, plus syncopations
    if bar_pos == 0:
        render_dhol(b_time, intensity=1.0, is_open=True)
    elif bar_pos == 2:
        render_dhol(b_time, intensity=0.85, is_open=True)
    elif bar_pos == 1:
        # Offbeat syncopation
        render_dhol(b_time + BEAT_DUR * 0.5, intensity=0.7, is_open=False)
    elif bar_pos == 3:
        # Pickup kick into next bar
        render_dhol(b_time + BEAT_DUR * 0.75, intensity=0.8, is_open=False)

    # Tasha / Dholak slaps (crisp rhythmic motor)
    render_tasha(b_time, intensity=0.55)
    render_tasha(b_time + BEAT_DUR * 0.5, intensity=0.75)
    if bar_pos in [1, 3]:
        render_tasha(b_time + BEAT_DUR * 0.25, intensity=0.45)
        render_tasha(b_time + BEAT_DUR * 0.75, intensity=0.5)

    # Manjira hand cymbals on syncopated eighths
    render_manjira(b_time + BEAT_DUR * 0.5, intensity=0.4)

    # Damru roll every 4 bars for battle excitement
    if beat_idx % 16 == 14:
        render_damru_roll(b_time, intensity=0.65)

# Render Melodic Sitar Anthem
for beat_offset, note_freq, note_len_beats, note_vol in MELODY:
    t_start = beat_offset * BEAT_DUR
    t_dur = note_len_beats * BEAT_DUR
    render_sitar_note(t_start, note_freq, t_dur, intensity=note_vol)

# Normalize audio to prevent clipping and ensure rich loud presence
print("Normalizing audio dynamics...")
max_peak = 0.0001
for i in range(NUM_SAMPLES):
    max_peak = max(max_peak, abs(left_ch[i]), abs(right_ch[i]))

gain = 0.88 / max_peak
print(f"Max peak was {max_peak:.3f}, applying gain {gain:.2f}")

wav_path = os.path.join(os.path.dirname(__file__), "assets", "audio", "climax_mythological_bgm.wav")
mp3_path = os.path.join(os.path.dirname(__file__), "assets", "audio", "climax_mythological_bgm.mp3")

with wave.open(wav_path, 'wb') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2) # 16-bit
    wf.setframerate(SAMPLE_RATE)
    frames = bytearray()
    for i in range(NUM_SAMPLES):
        l = int(max(-32767, min(32767, left_ch[i] * gain * 32767)))
        r = int(max(-32767, min(32767, right_ch[i] * gain * 32767)))
        frames.extend(struct.pack('<hh', l, r))
    wf.writeframes(frames)

print(f"WAV saved successfully: {wav_path} ({os.path.getsize(wav_path)} bytes)")

# Convert to high-quality compressed MP3 via ffmpeg
print("Encoding to MP3 via ffmpeg...")
try:
    cmd = ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "192k", mp3_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"MP3 converted successfully: {mp3_path} ({os.path.getsize(mp3_path)} bytes)")
    # Keep both or remove wav to save repo space
    if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 10000:
        os.remove(wav_path)
        print("Cleaned up uncompressed WAV, keeping pristine 192kbps MP3.")
except Exception as e:
    print(f"ffmpeg conversion note: {e}")

print("Hindu Mythological Climax BGM synthesis complete!")
