"""
Module 1's backend counterpart: receives the uploaded recording, runs Module 2
(RQA), saves the file + result, and returns the quality report to the frontend.
"""
import os
import uuid
import librosa
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.config import UPLOAD_DIR, Q_ABSTAIN_TIER1
from app.rqa.quality_assessor import assess_quality
from app.db.mongo_client import screenings_collection
from app.db.schemas import build_screening_record

router = APIRouter()

ALLOWED_EXTENSIONS = {".wav", ".mp3"}


@router.post("/analyze")
async def analyze_recording(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only WAV or MP3 files are accepted")

    # save the uploaded file with a unique name (avoid overwriting same-named uploads)
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)

    # load audio; never crash the demo on a corrupt/unreadable file
    try:
        y, sr = librosa.load(saved_path, sr=22050, mono=True)
        if len(y) == 0:
            raise ValueError("decoded to empty audio")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read audio file: {e}")

    quality = assess_quality(y, sr)
    quality["usable"] = quality["Q"] >= Q_ABSTAIN_TIER1

    record = build_screening_record(filename=saved_name, quality=quality)
    result = screenings_collection.insert_one(record)

    return {
        "id": str(result.inserted_id),
        "filename": saved_name,
        "quality": quality,
    }


@router.get("/history")
def get_history():
    records = list(screenings_collection.find().sort("created_at", -1).limit(50))
    for r in records:
        r["_id"] = str(r["_id"])
    return records