"""
Screening API Router: receives audio recording, executes Recording Quality
Assessment (RQA) and ML classification with Q-ATS temperature calibration,
conformal prediction sets, and selective classification rule.
"""
import os
import uuid
import logging
from typing import Dict, Any
import librosa
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.config import UPLOAD_DIR
from app.ml.predictor import predictor
from app.db.mongo_client import screenings_collection
from app.db.schemas import build_screening_record

logger = logging.getLogger("screening_api")
router = APIRouter()

ALLOWED_EXTENSIONS = {".wav", ".mp3"}


@router.post("/analyze")
async def analyze_recording(
    file: UploadFile = File(...),
    mode: str = "realtime_mic",
) -> Dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only WAV or MP3 files are accepted")

    # 1. Save uploaded file with unique UUID
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    try:
        contents = await file.read()
        file_size = len(contents)
        with open(saved_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Could not save audio file")

    # 2. Decode audio with Librosa (sr=None preserves native rate for RQA & ML pipeline)
    try:
        y, sr = librosa.load(saved_path, sr=None, mono=True)
        if len(y) == 0:
            raise ValueError("Audio decoded to empty array")
    except Exception as e:
        logger.warning(f"Unreadable audio file '{file.filename}': {e}")
        raise HTTPException(status_code=422, detail=f"Could not read audio file: {e}")

    # 3. Execute ML Inference + RQA + Q-ATS + Conformal Prediction Pipeline
    ml_output = predictor.predict(y, sr, mode=mode)

    # 4. Construct and persist screening record in MongoDB
    record = build_screening_record(
        filename=saved_name,
        original_filename=file.filename,
        file_size_bytes=file_size,
        content_type=file.content_type,
        quality=ml_output.get("quality"),
        prediction=ml_output.get("prediction"),
        confidence=ml_output.get("confidence"),
        decision=ml_output.get("decision"),
        temperature=ml_output.get("temperature"),
        prediction_set=ml_output.get("prediction_set"),
        probabilities=ml_output.get("probabilities"),
        abstain_reasons=ml_output.get("abstain_reasons"),
    )
    record["mode"] = mode
    record["triage_level"] = ml_output.get("triage_level")
    record["guidance"] = ml_output.get("guidance")
    record["biomarkers"] = ml_output.get("biomarkers", {})

    doc_id = uuid.uuid4().hex
    try:
        insert_result = screenings_collection.insert_one(record)
        doc_id = str(insert_result.inserted_id)
    except Exception as e:
        logger.warning(f"MongoDB storage skipped or failed: {e}")

    # 5. Return standardized API response
    return {
        "id": doc_id,
        "filename": saved_name,
        "original_filename": file.filename,
        "prediction": ml_output.get("prediction"),
        "confidence": ml_output.get("confidence"),
        "Q": ml_output.get("Q"),
        "temperature": ml_output.get("temperature"),
        "decision": ml_output.get("decision"),
        "triage_level": ml_output.get("triage_level"),
        "guidance": ml_output.get("guidance"),
        "biomarkers": ml_output.get("biomarkers", {}),
        "mode": mode,
        "prediction_set": ml_output.get("prediction_set", []),
        "probabilities": ml_output.get("probabilities", {}),
        "quality": ml_output.get("quality", {}),
        "abstain_reasons": ml_output.get("abstain_reasons", []),
    }


@router.get("/history")
def get_history():
    try:
        records = list(screenings_collection.find().sort("created_at", -1).limit(50))
        for r in records:
            r["_id"] = str(r["_id"])
        return records
    except Exception as e:
        logger.warning(f"Failed to fetch history from MongoDB: {e}")
        return []