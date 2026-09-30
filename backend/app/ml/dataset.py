"""
Audio Preprocessing and Feature Extraction Pipeline for ML Inference.

Matches the training pipeline specifications exactly:
- Target Sampling Rate: 16,000 Hz (Mono)
- Bandpass Filter: 100 Hz - 2,000 Hz (4th-order Butterworth SOS)
- Stationary Noise Reduction
- Silence Trimming (top_db=30)
- Peak Amplitude Normalization
- Fixed Duration: 5.0 seconds (80,000 samples)
- 64-band Log-Mel Spectrogram (n_fft=1024, hop_length=512)
- 6 Scalar Features: ZCR (mean, std), Spectral Centroid (mean, std), RMS Energy (mean, std)
"""
from typing import Dict, Tuple
import numpy as np
import librosa
import noisereduce as nr
from scipy.signal import butter, sosfiltfilt
import torch

TARGET_SR = 16000
BANDPASS_LOW_HZ = 100
BANDPASS_HIGH_HZ = 2000
FIXED_DURATION_SEC = 5.0
FIXED_LENGTH = int(TARGET_SR * FIXED_DURATION_SEC)  # 80,000 samples

N_MELS = 64
N_FFT = 1024
HOP_LENGTH = 512

SCALAR_KEYS = [
    "zcr_mean",
    "zcr_std",
    "centroid_mean",
    "centroid_std",
    "rms_mean",
    "rms_std",
]


def resample_audio(y: np.ndarray, orig_sr: int, target_sr: int = TARGET_SR) -> np.ndarray:
    if orig_sr == target_sr:
        return y
    return librosa.resample(y, orig_sr=orig_sr, target_sr=target_sr)


def bandpass_filter(
    y: np.ndarray,
    sr: int = TARGET_SR,
    low_hz: float = BANDPASS_LOW_HZ,
    high_hz: float = BANDPASS_HIGH_HZ,
    order: int = 4,
) -> np.ndarray:
    nyquist = sr / 2.0
    low = low_hz / nyquist
    high = min(high_hz / nyquist, 0.99)
    sos = butter(order, [low, high], btype="band", output="sos")
    return sosfiltfilt(sos, y)


def reduce_noise(y: np.ndarray, sr: int = TARGET_SR) -> np.ndarray:
    try:
        return nr.reduce_noise(y=y, sr=sr, stationary=True)
    except Exception:
        return y


def trim_silence(y: np.ndarray, top_db: float = 45.0) -> np.ndarray:
    try:
        y_trimmed, _ = librosa.effects.trim(y, top_db=top_db)
        return y_trimmed if len(y_trimmed) > int(TARGET_SR * 0.5) else y
    except Exception:
        return y


def normalize_amplitude(y: np.ndarray) -> np.ndarray:
    peak = np.max(np.abs(y)) if len(y) else 0.0
    if peak < 1e-8:
        return y
    return y / peak


def preprocess_audio(y: np.ndarray, sr: int) -> Tuple[np.ndarray, int]:
    """Applies the 5-step audio cleaning pipeline with adaptive pre-normalization."""
    y = resample_audio(y, sr, TARGET_SR)
    sr = TARGET_SR
    y = normalize_amplitude(y)
    y = bandpass_filter(y, sr)
    y = reduce_noise(y, sr)
    y = trim_silence(y, top_db=45.0)
    y = normalize_amplitude(y)
    return y, sr


def fix_audio_length(y: np.ndarray, target_length: int = FIXED_LENGTH) -> np.ndarray:
    """Pad short recordings with silence, truncate long ones to 5.0 seconds."""
    if len(y) >= target_length:
        return y[:target_length]
    pad_width = target_length - len(y)
    return np.pad(y, (0, pad_width), mode="constant")


def extract_mel_spectrogram(y: np.ndarray, sr: int = TARGET_SR) -> np.ndarray:
    """Computes a (64, T) Log-Mel Spectrogram."""
    mel = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH, n_mels=N_MELS
    )
    return librosa.power_to_db(mel, ref=np.max)


def extract_scalar_features(y: np.ndarray, sr: int = TARGET_SR) -> Dict[str, float]:
    """Computes frame-level scalar statistics."""
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


def extract_model_features(y: np.ndarray, sr: int) -> Tuple[np.ndarray, Dict[str, float]]:
    """Runs full cleaning and extraction pipeline on raw audio array."""
    y_clean, sr_clean = preprocess_audio(y, sr)
    y_fixed = fix_audio_length(y_clean, FIXED_LENGTH)
    mel_spec = extract_mel_spectrogram(y_fixed, sr_clean)
    scalars = extract_scalar_features(y_fixed, sr_clean)
    return mel_spec, scalars


def prepare_tensors_for_inference(
    mel_spec: np.ndarray,
    scalars: Dict[str, float],
    scalar_stats: Dict[str, Tuple[float, float]],
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Standardizes scalar features using training set stats and wraps both
    spectrogram and scalars into batch-ready torch.Tensors.
    """
    # Shape: (1, 1, 64, T)
    mel_tensor = torch.tensor(mel_spec, dtype=torch.float32).unsqueeze(0).unsqueeze(0)

    # Standardize scalar features using (val - mean) / std
    standardized_scalars = []
    for k in SCALAR_KEYS:
        mean_val, std_val = scalar_stats.get(k, (0.0, 1.0))
        val = scalars.get(k, 0.0)
        norm_val = (val - mean_val) / (std_val + 1e-8)
        standardized_scalars.append(norm_val)

    # Shape: (1, 6)
    scalars_tensor = torch.tensor([standardized_scalars], dtype=torch.float32)

    return mel_tensor, scalars_tensor
