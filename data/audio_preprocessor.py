"""
Module 3 — Audio Preprocessing
"""
import numpy as np
import librosa
import noisereduce as nr
from scipy.signal import butter, sosfiltfilt

TARGET_SR = 16000
BANDPASS_LOW_HZ = 100
BANDPASS_HIGH_HZ = 2000


def resample(y, orig_sr, target_sr=TARGET_SR):
    if orig_sr == target_sr:
        return y
    return librosa.resample(y, orig_sr=orig_sr, target_sr=target_sr)


def bandpass_filter(y, sr, low_hz=BANDPASS_LOW_HZ, high_hz=BANDPASS_HIGH_HZ, order=4):
    nyquist = sr / 2
    low = low_hz / nyquist
    high = min(high_hz / nyquist, 0.99)
    sos = butter(order, [low, high], btype="band", output="sos")
    return sosfiltfilt(sos, y)


def reduce_noise(y, sr):
    return nr.reduce_noise(y=y, sr=sr, stationary=True)


def trim_silence(y, top_db=30):
    y_trimmed, _ = librosa.effects.trim(y, top_db=top_db)
    return y_trimmed if len(y_trimmed) > 0 else y


def normalize_amplitude(y):
    peak = np.max(np.abs(y))
    if peak < 1e-8:
        return y
    return y / peak


def preprocess(y, sr):
    y = resample(y, sr, TARGET_SR)
    sr = TARGET_SR
    y = bandpass_filter(y, sr)
    y = reduce_noise(y, sr)
    y = trim_silence(y)
    y = normalize_amplitude(y)
    return y, sr
