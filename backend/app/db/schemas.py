"""
Plain dict-based schema helper (Mongo is schemaless — this just documents the
shape of a screening record so every file that writes one agrees on the fields).
"""
from datetime import datetime


def build_screening_record(filename: str, quality: dict) -> dict:
    return {
        "filename": filename,
        "quality": quality,
        "created_at": datetime.utcnow(),
        # populated in later phases once the classifier exists:
        "prediction": None,
        "confidence": None,
        "abstained": None,
    }