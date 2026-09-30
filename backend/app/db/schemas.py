"""
Plain dict-based schema helper for screening records.
"""
from datetime import datetime
from typing import Optional, Dict, List, Any


def build_screening_record(
    filename: str,
    original_filename: Optional[str] = None,
    file_size_bytes: Optional[int] = None,
    content_type: Optional[str] = None,
    quality: Optional[dict] = None,
    prediction: Optional[str] = None,
    confidence: Optional[float] = None,
    decision: Optional[str] = None,
    temperature: Optional[float] = None,
    prediction_set: Optional[List[str]] = None,
    probabilities: Optional[Dict[str, float]] = None,
    abstain_reasons: Optional[List[str]] = None,
) -> dict:
    is_abstained = (
        decision == "ABSTAIN"
        if decision is not None
        else (quality is None or not quality.get("usable", False))
    )

    return {
        "original_filename": original_filename or filename,
        "saved_filename": filename,
        "file_size_bytes": file_size_bytes,
        "content_type": content_type,
        "quality": quality,
        "prediction": prediction,
        "confidence": confidence,
        "decision": decision,
        "temperature": temperature,
        "prediction_set": prediction_set or [],
        "probabilities": probabilities or {},
        "abstain_reasons": abstain_reasons or [],
        "abstained": is_abstained,
        "created_at": datetime.utcnow(),
    }