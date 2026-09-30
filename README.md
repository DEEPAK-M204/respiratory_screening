# RespiraScreen — Safety-Aware Respiratory Sound Screening System

An AI-assisted respiratory screening prototype designed to evaluate breathing sound quality before acoustic classification. Built with a FastAPI backend, React + Vite frontend, and a modular audio processing and feature extraction pipeline.

---

## System Architecture

```text
respiratory-screening/
├── backend/                  # FastAPI Web Server & API
│   ├── app/
│   │   ├── api/              # API Route Handlers (health, screening)
│   │   ├── core/             # Centralized Configuration & Environment Settings
│   │   ├── db/               # MongoDB Client & Screening Schemas
│   │   ├── rqa/              # Recording Quality Assessment (Module 2)
│   │   ├── storage/          # Audio Storage (uploads)
│   │   └── main.py           # FastAPI Application Entry Point & Static Mounts
│   ├── .env.example          # Backend Environment Template
│   └── requirements.txt      # Backend Python Dependencies
├── data/                     # ML Dataset & Audio Processing Pipelines
│   ├── splits/               # Train, Validation, and Test Split CSVs
│   ├── audio_preprocessor.py # Resampling, Filtering, Noise Reduction (Module 3)
│   ├── feature_extractor.py  # Mel Spectrograms & Scalar Extraction (Module 4)
│   ├── batch_preprocess.py   # Batch Preprocessing Runner
│   ├── batch_extract_features.py # Batch Feature Extraction (.npz generation)
│   ├── build_quality_metadata.py # RQA Quality Assessment over Splits
│   ├── check_features.py     # Feature Verification Script
│   ├── prepare_dataset.py    # Group-Level Split Generator (Asthma V2 Dataset)
│   └── requirements.txt      # Data & ML Pipeline Dependencies
├── frontend/                 # React 19 + Vite Application
│   ├── src/
│   │   ├── api/              # Axios API Client & Audio URL Helpers
│   │   ├── components/       # UI Components (Layout, WaveformPlayer, QualityBadge, Icons)
│   │   ├── pages/            # Application Pages (Screen, Results, History, Learn)
│   │   ├── utils/            # Audio WAV Encoding Utilities
│   │   ├── App.jsx           # Client-Side Routing
│   │   └── main.jsx          # React DOM Mount
│   ├── .env.example          # Frontend Environment Template
│   ├── tailwind.config.js    # Design System & Colors
│   └── package.json          # Node Dependencies & Scripts
├── .gitignore                # Global Git Ignore Rules
└── README.md                 # Project Overview & Quickstart Guide
```

---

## Features & Modules

- **Module 1 — Audio Capture & Pacing**: Live browser-based microphone recording with a 6-second breathing cycle pacer (Inhale $\to$ Hold $\to$ Exhale) and local WAV PCM encoding.
- **Module 2 — Recording Quality Assessment (RQA)**: Explainable composite acoustic score $Q \in [0, 1]$ computed from duration adequacy, clipping ratio, silence ratio, and signal-to-noise ratio (SNR).
- **Module 3 — Audio Preprocessing**: Standardized resampling (16 kHz mono), 4th-order Butterworth bandpass filtering (100–2000 Hz), stationary noise reduction, silence trimming, and amplitude normalization.
- **Module 4 — Feature Extraction**: 64-band Log-Mel Spectrogram generation along with scalar acoustic features (Zero-Crossing Rate, Spectral Centroid, and RMS Energy) compressed into `.npz` format.
- **Decision-Support Frontend**: Mobile-responsive UI built with patient-first language, interactive waveform playback (WaveSurfer.js), progressive disclosure checklists, and past screening history.

---

## Quickstart Guide

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend API will be available at `http://localhost:8000/api` (Swagger docs at `http://localhost:8000/docs`).

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend application will be accessible at `http://localhost:5173`.

### 3. Data & ML Feature Pipeline

```bash
# Install data processing dependencies
pip install -r data/requirements.txt

# Run dataset splits
python data/prepare_dataset.py

# Run batch preprocessing
python data/batch_preprocess.py

# Extract Mel spectrogram features to NPZ
python data/batch_extract_features.py

# Verify feature extraction
python data/check_features.py
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
MONGO_URI=mongodb://localhost:27017/
DB_NAME=respiratory_screening
UPLOAD_DIR=app/storage/uploads
Q_ABSTAIN_TIER1=0.35
PORT=8000
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Quality Gate & Abstention Protocol

If a recording scores $Q < 0.35$, the screening engine abstains from diagnostic prediction to avoid misleading or hallucinated classifications on corrupted/unclear audio.
