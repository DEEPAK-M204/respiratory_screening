"""
Module 4 — Feature Extraction

Converts cleaned audio (from Phase 7) into the representations the CNN+BiLSTM
will actually train on: a Mel spectrogram (the main 2D input) plus three
scalar-over-time features (ZCR, spectral centroid, RMS energy) that give the
model extra signal about noisiness, brightness, and loudness bursts -- useful
because crackles (sudden RMS bursts) and wheezes (higher ZCR) look different
on these even before the CNN sees them.
"""
import numpy as np
import librosa

SR = 16000                 # must match Phase 7's TARGET_SR
FIXED_DURATION_SEC = 5.0   # pad/truncate every clip to this length
FIXED_LENGTH = int(SR * FIXED_DURATION_SEC)

N_MELS = 64
N_FFT = 1024
HOP_LENGTH = 512


def fix_length(y: np.ndarray, target_length: int = FIXED_LENGTH) -> np.ndarray:
    """
    CNNs need a fixed input shape. Recordings vary in length after Phase 7's
    silence trimming, so pad short clips with zeros (silence) and truncate
    long ones -- truncating from the end, since the start of a breathing
    recording is usually where the clearest cycle is.
    """
    if len(y) >= target_length:
        return y[:target_length]
    pad_width = target_length - len(y)
    return np.pad(y, (0, pad_width), mode="constant")


def extract_mel_spectrogram(y: np.ndarray, sr: int = SR) -> np.ndarray:
    """Returns a (N_MELS, T) log-mel spectrogram -- the CNN's main input."""
    mel = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH, n_mels=N_MELS
    )
    return librosa.power_to_db(mel, ref=np.max)


def extract_scalar_features(y: np.ndarray, sr: int = SR) -> dict:
    """
    Frame-level scalar features, summarized as (mean, std) pairs -- gives the
    model compact extra signal alongside the spectrogram, without blowing up
    input size the way keeping the full per-frame sequence would.
    """
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    rms = librosa.feature.rms(y=y)[0]

    return {
        "zcr_mean": float(np.mean(zcr)),
        "zcr_std": float(np.std(zcr)),
        "centroid_mean": float(np.mean(centroid)),
        "centroid_std": float(np.std(centroid)),
        "rms_mean": float(np.mean(rms)),
        "rms_std": float(np.std(rms)),
    }


def extract_features(y: np.ndarray, sr: int = SR) -> dict:
    """Full extraction pipeline for one audio clip."""
    y_fixed = fix_length(y)
    mel_spec = extract_mel_spectrogram(y_fixed, sr)
    scalars = extract_scalar_features(y_fixed, sr)
    return {"mel_spectrogram": mel_spec, **scalars}
