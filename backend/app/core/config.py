"""
Centralized configuration. Every other file reads settings from here instead
of calling os.getenv() directly — one place to change, one place to check.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory: d:\respiratory-screening\backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

# Try backend/.env first, then root .env
if (BACKEND_DIR / ".env").exists():
    load_dotenv(BACKEND_DIR / ".env")
elif (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")
else:
    load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/").strip() or "mongodb://localhost:27017/"
DB_NAME = os.getenv("DB_NAME", "respiratory_screening")

DEFAULT_UPLOAD_DIR = BACKEND_DIR / "app" / "storage" / "uploads"
raw_upload = os.getenv("UPLOAD_DIR")
if raw_upload:
    raw_path = Path(raw_upload)
    UPLOAD_DIR = raw_path.resolve() if raw_path.is_absolute() else (BACKEND_DIR / raw_path).resolve()
else:
    UPLOAD_DIR = DEFAULT_UPLOAD_DIR

Q_ABSTAIN_TIER1 = float(os.getenv("Q_ABSTAIN_TIER1", "0.35"))
PORT = int(os.getenv("PORT", "8000"))

os.makedirs(UPLOAD_DIR, exist_ok=True)