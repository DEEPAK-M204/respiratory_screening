"""
Module 2 — Recording Quality Assessment (RQA)

Computes a composite quality score Q in [0, 1] from basic, explainable signal
statistics. Each sub-score is independently in [0, 1] (1 = good); Q is their
mean. Kept deliberately simple and explainable for a first review — a panel
should be able to follow exactly why a recording scored the way it did.
"""
import numpy as np
import librosa


def assess_quality(y: np.ndarray, sr: int) -> dict:
    duration = len(y) / sr if sr else 0.0

    # ── Duration score: penalize clips shorter than ~3 respiratory cycles ──
    duration_score = float(np.clip(duration / 3.0, 0.0, 1.0))

    # ── Clipping score: fraction of samples pinned near full-scale amplitude ─
    clip_ratio = float(np.mean(np.abs(y) > 0.98)) if len(y) else 1.0
    clipping_score = float(np.clip(1.0 - clip_ratio * 10, 0.0, 1.0))

    # ── Silence score: adaptive silence estimation relative to dynamic range ─
    frame_len = 1024
    if len(y) >= frame_len:
        frames = librosa.util.frame(y, frame_length=frame_len, hop_length=frame_len // 2)
        frame_rms = np.sqrt(np.mean(frames ** 2, axis=0))
        max_rms = float(np.max(frame_rms)) if len(frame_rms) else 0.0
        
        if max_rms < 0.003:
            # Entire signal is negligible ambient noise or pure silence
            silence_ratio = 1.0
        else:
            # Adaptive silence threshold: 8% of peak frame RMS or minimum 0.004 floor
            adaptive_thresh = max(0.004, max_rms * 0.08)
            silence_ratio = float(np.mean(frame_rms < adaptive_thresh))
    else:
        frame_rms = np.array([])
        max_rms = 0.0
        silence_ratio = 1.0

    silence_score = float(np.clip(1.0 - silence_ratio, 0.0, 1.0))

    # ── SNR estimate: loudest 15% of frames vs quietest 15% (noise-floor proxy)
    if len(frame_rms) >= 10 and max_rms >= 0.003:
        sorted_rms = np.sort(frame_rms)
        portion = max(1, int(len(sorted_rms) * 0.15))
        noise_floor = float(np.mean(sorted_rms[:portion])) + 1e-6
        signal_level = float(np.mean(sorted_rms[-portion:])) + 1e-6
        snr_db = float(20 * np.log10(signal_level / noise_floor))
        # 20 dB SNR represents an excellent acoustic ratio for breathing screening
        snr_score = float(np.clip(snr_db / 20.0, 0.0, 1.0))
    else:
        snr_db = 0.0 if max_rms < 0.003 else None
        snr_score = 0.0

    Q = float(np.mean([duration_score, clipping_score, silence_score, snr_score]))

    return {
        "Q": round(Q, 3),
        "duration_sec": round(duration, 2),
        "duration_score": round(duration_score, 3),
        "clipping_ratio": round(clip_ratio, 4),
        "clipping_score": round(clipping_score, 3),
        "silence_ratio": round(silence_ratio, 3),
        "silence_score": round(silence_score, 3),
        "snr_db": round(snr_db, 2) if snr_db is not None else None,
        "snr_score": round(snr_score, 3),
    }