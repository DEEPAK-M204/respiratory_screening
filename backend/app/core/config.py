"""
Centralized configuration. Every other file reads settings from here instead
of calling os.getenv() directly — one place to change, one place to check.
"""
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = os.getenv("DB_NAME", "respiratory_screening")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "app/storage/uploads")
Q_ABSTAIN_TIER1 = float(os.getenv("Q_ABSTAIN_TIER1", "0.35"))
PORT = int(os.getenv("PORT", "8000"))

os.makedirs(UPLOAD_DIR, exist_ok=True)