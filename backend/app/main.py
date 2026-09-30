from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import health, screening
from app.core.config import UPLOAD_DIR

app = FastAPI(title="Respiratory Screening API — Phase 1 & Real-Time Engine")

# Allow all localhost and 127.0.0.1 ports (5173, 5174, etc.) for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount audio storage directory for playback streaming in the frontend
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(health.router, prefix="/api")
app.include_router(screening.router, prefix="/api")