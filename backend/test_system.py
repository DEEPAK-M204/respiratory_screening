"""
Automated Test Suite for RespiraScreen System:
- Module 2: Recording Quality Assessment (RQA)
- Module 3 & 4: Feature Extraction & ML Predictor (Dual-Mode Q-ATS, Conformal Sets, Tiered Decision)
- FastAPI Web API: Health, Dual-Mode Audio Analysis, History Endpoints
"""
import io
import sys
import unittest
import numpy as np
import soundfile as sf
from starlette.testclient import TestClient

from app.main import app
from app.rqa.quality_assessor import assess_quality
from app.ml.predictor import predictor
from app.ml.dataset import extract_model_features, prepare_tensors_for_inference


class TestRecordingQualityAssessment(unittest.TestCase):
    """Unit tests for Module 2: Recording Quality Assessment (RQA)."""

    def setUp(self):
        self.sr = 16000

    def test_clean_audio_quality(self):
        # 4 seconds of clean sinusoidal signal
        t = np.linspace(0, 4.0, 4 * self.sr, endpoint=False)
        y = 0.5 * np.sin(2 * np.pi * 440 * t).astype(np.float32)
        q_result = assess_quality(y, self.sr)

        self.assertIn("Q", q_result)
        self.assertGreaterEqual(q_result["Q"], 0.5)
        self.assertEqual(q_result["duration_score"], 1.0)
        self.assertEqual(q_result["clipping_score"], 1.0)
        self.assertEqual(q_result["silence_score"], 1.0)

    def test_silent_audio_abstains(self):
        # 4 seconds of pure silence
        y = np.zeros(4 * self.sr, dtype=np.float32)
        q_result = assess_quality(y, self.sr)

        # Silence score must be 0.0 for pure silence
        self.assertEqual(q_result["silence_score"], 0.0)

    def test_low_quality_corrupted_audio_abstains(self):
        # 0.5 seconds of silent audio (short + silent)
        y = np.zeros(int(0.5 * self.sr), dtype=np.float32)
        q_result = assess_quality(y, self.sr)

        # Quality Q should be strictly below the 0.35 abstention gate
        self.assertLess(q_result["Q"], 0.35)

    def test_clipped_audio_penalized(self):
        # 4 seconds of heavily clipped square-like audio
        y = np.ones(4 * self.sr, dtype=np.float32) * 0.99
        q_result = assess_quality(y, self.sr)

        self.assertEqual(q_result["clipping_score"], 0.0)


class TestMLPredictorPipeline(unittest.TestCase):
    """Unit tests for ML Feature Extractor, Model, Dual-Mode Q-ATS, and Selective Inference."""

    def setUp(self):
        self.sr = 16000
        t = np.linspace(0, 4.0, 4 * self.sr, endpoint=False)
        self.clean_audio = (0.4 * np.sin(2 * np.pi * 300 * t)).astype(np.float32)

    def test_feature_extraction_shapes(self):
        mel_spec, scalars = extract_model_features(self.clean_audio, self.sr)
        # 5.0 seconds at 16kHz -> 80,000 samples // 512 hop_length + 1 = 157 frames
        self.assertEqual(mel_spec.shape, (64, 157))
        for key in ["zcr_mean", "zcr_std", "centroid_mean", "centroid_std", "rms_mean", "rms_std"]:
            self.assertIn(key, scalars)
            self.assertIsInstance(scalars[key], float)

    def test_q_ats_temperature_calculation(self):
        # In realtime_mic mode, T(1.0) should equal t_base (~1.05)
        temp_realtime_high = predictor.calculate_q_ats_temperature(1.0, mode="realtime_mic")
        self.assertAlmostEqual(temp_realtime_high, 1.05, places=2)

        # In clinical_upload mode, T(1.0) should equal ~1.3876
        temp_clinical_high = predictor.calculate_q_ats_temperature(1.0, mode="clinical_upload")
        self.assertAlmostEqual(temp_clinical_high, predictor.t_base, places=2)

        # Temperature monotonically increases as quality decreases
        temp_realtime_low = predictor.calculate_q_ats_temperature(0.0, mode="realtime_mic")
        self.assertGreater(temp_realtime_low, temp_realtime_high)

    def test_full_prediction_contract_realtime_mic(self):
        result = predictor.predict(self.clean_audio, self.sr, mode="realtime_mic")
        self.assertIn("prediction", result)
        self.assertIn("confidence", result)
        self.assertIn("Q", result)
        self.assertIn("temperature", result)
        self.assertIn("decision", result)
        self.assertIn(result["decision"], ["ACCEPT", "SUGGESTION", "RETRY_QUALITY", "ABSTAIN"])
        self.assertIn("triage_level", result)
        self.assertIn("guidance", result)
        self.assertIn("prediction_set", result)
        self.assertIsInstance(result["prediction_set"], list)
        self.assertIn("probabilities", result)
        self.assertEqual(len(result["probabilities"]), 5)

        # Probabilities sum to approximately 1.0
        prob_sum = sum(result["probabilities"].values())
        self.assertAlmostEqual(prob_sum, 1.0, places=2)

    def test_prediction_clinical_upload_mode(self):
        result = predictor.predict(self.clean_audio, self.sr, mode="clinical_upload")
        self.assertEqual(result["mode"], "clinical_upload")
        self.assertIn("decision", result)


class TestFastAPIEndpoints(unittest.TestCase):
    """Integration tests for FastAPI endpoints using TestClient."""

    def setUp(self):
        self.client = TestClient(app)
        self.sr = 16000

    def _generate_wav_bytes(self, duration=4.0, freq=440.0):
        t = np.linspace(0, duration, int(duration * self.sr), endpoint=False)
        audio = (0.5 * np.sin(2 * np.pi * freq * t)).astype(np.float32)
        buf = io.BytesIO()
        sf.write(buf, audio, self.sr, format="WAV")
        buf.seek(0)
        return buf.read()

    def test_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_analyze_valid_wav_realtime_mode(self):
        wav_bytes = self._generate_wav_bytes()
        files = {"file": ("test_breath.wav", wav_bytes, "audio/wav")}
        response = self.client.post("/api/analyze?mode=realtime_mic", files=files)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("prediction", data)
        self.assertIn("confidence", data)
        self.assertIn("Q", data)
        self.assertIn("decision", data)
        self.assertIn("triage_level", data)
        self.assertIn("guidance", data)
        self.assertEqual(data["mode"], "realtime_mic")
        self.assertIn("probabilities", data)

    def test_analyze_invalid_extension(self):
        files = {"file": ("malicious.exe", b"binary content", "application/octet-stream")}
        response = self.client.post("/api/analyze", files=files)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only WAV or MP3 files are accepted", response.json()["detail"])

    def test_history_endpoint(self):
        response = self.client.get("/api/history")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    sys.exit(0 if result.wasSuccessful() else 1)
