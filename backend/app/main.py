from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, screening

app = FastAPI(title="Respiratory Screening API — Phase 1")

# Without this, the React dev server (port 5173) is blocked from calling this
# API (port 8000) by the browser's same-origin policy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(screening.router, prefix="/api")