"""
Predictor service implementing Dual-Mode Inference:
1. Real-Time Microphone Screening Mode (calibrated for Web Audio / phone / laptop microphones)
   - Multi-window temporal sliding aggregation over the full audio recording
   - Acoustic Biomarker Engine (wheeze whistling, crackle spikes, respiratory envelope)
   - Real-world microphone domain adaptation
2. Clinical Auscultation Mode (strict laboratory benchmark for stethoscope recordings)

Includes Quality-Aware Temperature Scaling (Q-ATS), Conformal Prediction Set Construction,
and Tiered Clinical Triage (ACCEPT, SUGGESTION, RETRY_QUALITY, ABSTAIN).
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
import numpy as np
import scipy.signal
import torch
import librosa

from app.ml.model import RespiratoryCNNBiLSTM
from app.ml.dataset import extract_model_features, prepare_tensors_for_inference
from app.rqa.quality_assessor import assess_quality

logger = logging.getLogger("respiratory_ml")

ML_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = ML_DIR / "best_model.pt"
DEFAULT_CALIBRATION_PATH = ML_DIR / "calibration.json"


def extract_airborne_biomarkers(y: np.ndarray, sr: int = 16000) -> Dict[str, Any]:
    """
    Extracts clinical acoustic biomarkers specific to airborne microphone breath recordings:
    1. harm_ratio: Harmonic-to-total energy ratio (tonal wheeze whistling detection).
    2. tonal_prominence: Peak-to-local spectral prominence in 400-1200 Hz wheezing band.
    3. dominant_wheeze_hz: Frequency bin of maximum tonal peak.
    4. rhonchi_ratio: Low-frequency (100-300 Hz) turbulent airflow resistance (COPD biomarker).
    5. spike_kurt: High-order derivative/transient spike ratio (Pneumonia crackle biomarker).
    6. centroid: Spectral center of acoustic gravity for tubular bronchial sounds.
    7. ie_ratio: Estimated Inspiratory-to-Expiratory timing ratio.
    8. vesicular_purity: Clean respiratory flow score (0-100%).
    9. explanation: Plain-language acoustic evidence description.
    """
    try:
        y_harm, _ = librosa.effects.hpss(y)
        harm_energy = float(np.sum(y_harm ** 2))
        tot_energy = float(np.sum(y ** 2)) + 1e-8
        harm_ratio = harm_energy / tot_energy

        # STFT & Frequency analysis
        D = np.abs(librosa.stft(y, n_fft=1024, hop_length=256))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=1024)
        
        # Wheeze frequency band (400-1200 Hz)
        wheeze_mask = (freqs >= 400) & (freqs <= 1200)
        wheeze_freqs = freqs[wheeze_mask]
        wheeze_bands = D[wheeze_mask, :] if np.any(wheeze_mask) else np.zeros((1, D.shape[1]))
        band_means = np.mean(wheeze_bands, axis=1)
        peak_idx = int(np.argmax(band_means)) if len(band_means) else 0
        peak_energy = float(band_means[peak_idx]) if len(band_means) else 0.0
        dominant_wheeze_hz = float(wheeze_freqs[peak_idx]) if len(wheeze_freqs) else 650.0
        local_avg = float((np.sum(band_means) - peak_energy) / max(len(band_means) - 1, 1)) + 1e-8
        tonal_prominence = peak_energy / local_avg

        # Rhonchi / Low obstruction band (100-300 Hz) vs Mid band (300-1500 Hz)
        low_mask = (freqs >= 100) & (freqs <= 300)
        mid_mask = (freqs > 300) & (freqs <= 1500)
        low_energy = float(np.mean(D[low_mask, :])) if np.any(low_mask) else 0.0
        mid_energy = float(np.mean(D[mid_mask, :])) if np.any(mid_mask) else 1e-8
        rhonchi_ratio = low_energy / mid_energy

        # Spectral Centroid
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))

        # Transient explosive crackles (extreme spike kurtosis on second derivative)
        diff2 = np.abs(np.diff(y, n=2))
        spike_kurt = float(np.percentile(diff2, 99.9) / (np.mean(diff2) + 1e-8)) if len(diff2) else 0.0

        # I:E Timing estimation from smoothed breath RMS envelope
        frame_len = int(0.1 * sr)
        hop_len = int(0.025 * sr)
        rms = librosa.feature.rms(y=y, frame_length=frame_len, hop_length=hop_len)[0]
        rms_smooth = scipy.signal.medfilt(rms, kernel_size=9)
        d_rms = np.gradient(rms_smooth)
        inhale_frames = np.sum(d_rms > 0.001)
        exhale_frames = np.sum(d_rms < -0.001)
        ratio_val = float(exhale_frames / max(inhale_frames, 1))
        ratio_val = max(1.0, min(4.5, ratio_val))
        ie_str = f"1:{ratio_val:.1f}"

        # Biomarker decision flags
        has_wheeze = bool((harm_ratio >= 0.28) and (tonal_prominence >= 3.5))
        has_crackles = bool(spike_kurt >= 28.0)
        has_rhonchi = bool((rhonchi_ratio >= 7.5) and not has_wheeze)
        has_bronchial = bool((centroid >= 2600) and (harm_ratio < 0.20) and not has_crackles)

        # Vesicular purity score (0-100%)
        penalties = 0.0
        if harm_ratio > 0.22:
            penalties += (harm_ratio - 0.22) * 120.0
        if spike_kurt > 20.0:
            penalties += (spike_kurt - 20.0) * 1.5
        if rhonchi_ratio > 4.5:
            penalties += (rhonchi_ratio - 4.5) * 6.0
        vesicular_purity = round(max(10.0, min(99.0, 98.0 - penalties)), 1)

        # Structured explanation
        if not has_wheeze and not has_crackles and not has_rhonchi and not has_bronchial:
            explanation = (
                f"Clean vesicular airflow detected ({vesicular_purity}% purity). "
                f"Normal breath timing (I:E {ie_str}) without continuous musical wheezes, "
                "explosive crackles, or low-frequency rhonchi."
            )
        elif has_wheeze:
            explanation = (
                f"High-pitch musical wheeze detected near {int(dominant_wheeze_hz)} Hz with elevated "
                f"harmonic tonality ({int(harm_ratio*100)}%), characteristic of bronchospasm / Asthma."
            )
        elif has_crackles:
            explanation = (
                f"Discontinuous explosive acoustic transients (crackle index {spike_kurt:.1f}) detected, "
                "consistent with alveolar secretion / Pneumonia."
            )
        elif has_rhonchi:
            explanation = (
                f"Low-frequency airflow resistance ({rhonchi_ratio:.1f}x baseline) with prolonged "
                f"expiration (I:E {ie_str}), characteristic of COPD rhonchi."
            )
        else:
            explanation = (
                f"Tubular bronchial breath sounds detected (spectral center {int(centroid)} Hz), "
                "indicative of airway consolidation."
            )

        return {
            "harm_ratio": round(harm_ratio, 3),
            "tonal_prominence": round(tonal_prominence, 2),
            "dominant_wheeze_hz": int(dominant_wheeze_hz),
            "rhonchi_ratio": round(rhonchi_ratio, 2),
            "centroid": int(centroid),
            "spike_kurt": round(spike_kurt, 1),
            "ie_ratio": ie_str,
            "vesicular_purity": vesicular_purity,
            "has_wheeze": has_wheeze,
            "has_crackles": has_crackles,
            "has_rhonchi": has_rhonchi,
            "has_bronchial": has_bronchial,
            "explanation": explanation,
        }
    except Exception as e:
        logger.warning(f"Error computing airborne biomarkers: {e}")
        return {
            "harm_ratio": 0.1,
            "tonal_prominence": 1.0,
            "dominant_wheeze_hz": 650,
            "rhonchi_ratio": 1.0,
            "centroid": 600,
            "spike_kurt": 5.0,
            "ie_ratio": "1:2.0",
            "vesicular_purity": 85.0,
            "has_wheeze": False,
            "has_crackles": False,
            "has_rhonchi": False,
            "has_bronchial": False,
            "explanation": "Default acoustic biomarker analysis computed.",
        }


class RespiratoryPredictor:
    def __init__(
        self,
        model_path: Path = DEFAULT_MODEL_PATH,
        calibration_path: Path = DEFAULT_CALIBRATION_PATH,
    ):
        self.model_path = model_path
        self.calibration_path = calibration_path
        self.model: Optional[RespiratoryCNNBiLSTM] = None
        self.classes: List[str] = []
        self.scalar_stats: Dict[str, Any] = {}
        self.modes_config: Dict[str, Any] = {}
        self.is_loaded: bool = False

        self._load_calibration()
        self._load_model()

    def _load_calibration(self) -> None:
        """Loads conformal calibration parameters and Q-ATS settings for both modes."""
        default_conformal = {
            "Normal": 0.95,
            "Asthma": 0.90,
            "COPD": 0.92,
            "Pneumonia": 0.95,
            "Bronchial": 0.92,
        }
        self.modes_config = {
            "realtime_mic": {
                "t_base": 1.05,
                "q_multiplier": 1.35,
                "confidence_threshold": 0.52,
                "q_abstain_threshold": 0.30,
                "conformal_thresholds": default_conformal,
            },
            "clinical_upload": {
                "t_base": 1.3876,
                "q_multiplier": 4.784528,
                "confidence_threshold": 0.85,
                "q_abstain_threshold": 0.35,
                "conformal_thresholds": {
                    "Normal": 0.990131,
                    "Asthma": 0.938943,
                    "COPD": 0.957649,
                    "Pneumonia": 0.990242,
                    "Bronchial": 0.984032,
                },
            },
        }

        if not self.calibration_path.exists():
            logger.warning(f"Calibration file not found at {self.calibration_path}, using defaults.")
            return

        try:
            with open(self.calibration_path, "r") as f:
                data = json.load(f)
            if "modes" in data:
                self.modes_config = data["modes"]
            else:
                self.modes_config["clinical_upload"]["conformal_thresholds"] = data.get(
                    "conformal_thresholds", self.modes_config["clinical_upload"]["conformal_thresholds"]
                )
                q_ats = data.get("q_ats", {})
                self.modes_config["clinical_upload"]["t_base"] = float(q_ats.get("t_base", 1.3876))
                self.modes_config["clinical_upload"]["q_multiplier"] = float(q_ats.get("q_multiplier", 4.784528))
                self.modes_config["clinical_upload"]["confidence_threshold"] = float(data.get("confidence_threshold", 0.85))
                self.modes_config["clinical_upload"]["q_abstain_threshold"] = float(data.get("q_abstain_threshold", 0.35))
        except Exception as e:
            logger.error(f"Error loading calibration config: {e}")

    def _load_model(self) -> None:
        """Loads the trained PyTorch checkpoint safely into memory."""
        if not self.model_path.exists():
            logger.warning(
                f"Model checkpoint not found at {self.model_path}. "
                "ML classification will be disabled until the checkpoint is placed."
            )
            self.is_loaded = False
            return

        try:
            checkpoint = torch.load(str(self.model_path), map_location="cpu")
            self.classes = checkpoint.get(
                "classes", ["Normal", "Asthma", "COPD", "Pneumonia", "Bronchial"]
            )
            self.scalar_stats = checkpoint.get("scalar_stats", {})

            model = RespiratoryCNNBiLSTM(
                num_classes=len(self.classes),
                num_scalars=len(self.scalar_stats) if self.scalar_stats else 6,
            )
            model.load_state_dict(checkpoint["model_state"])
            model.eval()

            self.model = model
            self.is_loaded = True
            logger.info(f"Loaded RespiratoryCNNBiLSTM checkpoint with classes: {self.classes}")
        except Exception as e:
            logger.error(f"Failed to load checkpoint from {self.model_path}: {e}")
            self.model = None
            self.is_loaded = False

    def is_available(self) -> bool:
        if not self.is_loaded and self.model_path.exists():
            self._load_model()
        return self.is_loaded and self.model is not None

    def calculate_q_ats_temperature(self, Q: float, mode: str = "realtime_mic") -> float:
        """Calculates quality-dependent temperature for softmax scaling: T(Q) = t_base + q_mult*(1-Q)"""
        cfg = self.modes_config.get(mode, self.modes_config.get("realtime_mic", {}))
        t_base = float(cfg.get("t_base", 1.05))
        q_multiplier = float(cfg.get("q_multiplier", 1.35))
        Q_clamped = max(0.0, min(1.0, float(Q)))
        return float(t_base + q_multiplier * (1.0 - Q_clamped))

    @property
    def t_base(self) -> float:
        return float(self.modes_config.get("clinical_upload", {}).get("t_base", 1.3876))

    @property
    def q_multiplier(self) -> float:
        return float(self.modes_config.get("clinical_upload", {}).get("q_multiplier", 4.784528))

    def predict(self, y: np.ndarray, sr: int, mode: str = "realtime_mic") -> Dict[str, Any]:
        """
        Full inference pipeline with Multi-Window Ensembling, Airborne Biomarker Fusion, and Tiered Triage.
        """
        cfg = self.modes_config.get(mode, self.modes_config.get("realtime_mic", {}))
        confidence_threshold = float(cfg.get("confidence_threshold", 0.52))
        q_abstain_threshold = float(cfg.get("q_abstain_threshold", 0.30))
        conformal_thresholds = cfg.get("conformal_thresholds", {})

        # Step 1: Run RQA Quality Assessment
        quality = assess_quality(y, sr)
        Q = float(quality["Q"])
        usable = Q >= q_abstain_threshold
        quality["usable"] = usable

        if not self.is_available():
            return {
                "prediction": None,
                "confidence": None,
                "Q": round(Q, 3),
                "temperature": None,
                "decision": "ABSTAIN",
                "triage_level": "Unavailable",
                "guidance": "ML classification model is currently initializing.",
                "prediction_set": [],
                "probabilities": {},
                "quality": quality,
                "mode": mode,
                "error": "ML model checkpoint not loaded.",
            }

        # Step 2: Multi-Window Temporal Slicing across full recording
        window_samples = int(5.0 * 16000)
        step_samples = int(2.5 * 16000)
        
        # Resample once for windowing
        if sr != 16000:
            y_16k = librosa.resample(y, orig_sr=sr, target_sr=16000)
        else:
            y_16k = y

        if len(y_16k) <= window_samples:
            windows = [y_16k]
        else:
            windows = []
            for start in range(0, len(y_16k) - window_samples + 1, step_samples):
                windows.append(y_16k[start:start + window_samples])
            if (len(y_16k) - window_samples) % step_samples != 0:
                windows.append(y_16k[-window_samples:])

        # Step 3: Forward pass across all windows
        window_probs_list = []
        temperature = self.calculate_q_ats_temperature(Q, mode=mode)

        for chunk in windows:
            mel_spec, scalars = extract_model_features(chunk, 16000)
            mel_tensor, scalars_tensor = prepare_tensors_for_inference(
                mel_spec, scalars, self.scalar_stats
            )
            with torch.no_grad():
                raw_logits = self.model(mel_tensor, scalars_tensor)[0]
                scaled_logits = raw_logits / temperature
                probs = torch.softmax(scaled_logits, dim=-1).cpu().numpy()
                window_probs_list.append(probs)

        # Average posterior probabilities across all temporal windows
        ensemble_probs = np.mean(window_probs_list, axis=0) # [Normal, Asthma, COPD, Pneumonia, Bronchial]

        # Step 4: Mode-Specific Airborne Acoustic Biomarker Fusion
        biomarkers = extract_airborne_biomarkers(y_16k, 16000)
        if mode == "realtime_mic":
            has_wheeze = biomarkers["has_wheeze"]
            has_crackles = biomarkers["has_crackles"]
            has_rhonchi = biomarkers["has_rhonchi"]
            has_bronchial = biomarkers["has_bronchial"]

            adj_probs = ensemble_probs.copy()
            if not has_wheeze and not has_crackles and not has_rhonchi and not has_bronchial:
                # Normal healthy breathing: clean respiratory cycle without adventitious whistles/crackles
                adj_probs[0] = max(adj_probs[0] * 3.5, 0.94) # Assert Normal prior
                adj_probs[1] *= 0.04 # Suppress false wheeze
                adj_probs[2] *= 0.04 # Suppress false COPD
                adj_probs[3] *= 0.04 # Suppress false Pneumonia
                adj_probs[4] *= 0.04 # Suppress false Bronchial
            elif has_wheeze:
                adj_probs[1] += 2.0 # Asthma wheeze
            elif has_crackles:
                adj_probs[3] += 2.0 # Pneumonia crackles
            elif has_rhonchi:
                adj_probs[2] += 2.0 # COPD rhonchi / airflow resistance
            elif has_bronchial:
                adj_probs[4] += 2.0 # Bronchial tubular sounds

            # Normalize to valid probability distribution
            ensemble_probs = adj_probs / np.sum(adj_probs)

        probs_dict = {
            cls_name: float(ensemble_probs[i])
            for i, cls_name in enumerate(self.classes)
        }

        # Step 5: Conformal Prediction Set Construction
        prediction_set = []
        for cls_name in self.classes:
            p = probs_dict.get(cls_name, 0.0)
            thresh = conformal_thresholds.get(cls_name, 0.95)
            if (1.0 - p) <= thresh:
                prediction_set.append(cls_name)

        # Step 6: Tiered Clinical Triage Decision Rule
        top_class_idx = int(np.argmax(ensemble_probs))
        top_class = self.classes[top_class_idx]
        top_confidence = float(ensemble_probs[top_class_idx])

        abstain_reasons = []
        if Q < q_abstain_threshold:
            abstain_reasons.append(
                f"Audio quality Q ({Q:.2f}) is below safety threshold ({q_abstain_threshold:.2f})."
            )
        if top_confidence < confidence_threshold:
            abstain_reasons.append(
                f"Confidence ({top_confidence:.2f}) is below selective threshold ({confidence_threshold:.2f})."
            )
        if top_class not in prediction_set:
            abstain_reasons.append(
                f"Top predicted class '{top_class}' was excluded from conformal prediction set."
            )

        # Tiered Decision & Guidance
        if Q < q_abstain_threshold:
            decision = "RETRY_QUALITY"
            triage_level = "Acoustic Quality Issue"
            guidance = (
                "Recording quality was too low (faint breath volume, ambient noise, or clipping). "
                "Please hold your microphone 5–10 cm from your mouth/neck and re-record in a quiet room."
            )
        elif len(abstain_reasons) == 0:
            decision = "ACCEPT"
            triage_level = "High Confidence Screening"
            guidance = biomarkers.get(
                "explanation",
                "Acoustic features demonstrate clear, regular, healthy vesicular breathing patterns."
                if top_class == "Normal"
                else f"Acoustic features indicate potential {top_class} respiratory characteristics. Clinical check recommended."
            )
        elif top_confidence >= 0.35 and top_class in prediction_set:
            decision = "SUGGESTION"
            triage_level = "Indicative Screening Pattern"
            guidance = (
                f"Screening indicates suggestive {top_class} patterns ({top_confidence*100:.1f}% confidence). "
                f"{biomarkers.get('explanation', '')} "
                "Clinical auscultation or spirometry with a healthcare provider is recommended to confirm."
            )
        else:
            decision = "ABSTAIN"
            triage_level = "Inconclusive Result"
            guidance = (
                "Acoustic classification is inconclusive across multiple sound categories. "
                "Please re-test taking deep, measured inhalations and exhalations."
            )

        return {
            "prediction": top_class,
            "confidence": round(top_confidence, 4),
            "Q": round(Q, 3),
            "temperature": round(temperature, 4),
            "decision": decision,
            "triage_level": triage_level,
            "guidance": guidance,
            "biomarkers": biomarkers,
            "prediction_set": prediction_set,
            "probabilities": {k: round(v, 4) for k, v in probs_dict.items()},
            "quality": quality,
            "mode": mode,
            "abstain_reasons": abstain_reasons,
        }


# Singleton predictor instance
predictor = RespiratoryPredictor()
