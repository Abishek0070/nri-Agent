# 👵 Ammachi – AI-Powered Native Language Learning Platform for NRI Children

<div align="center">

<img src="frontend/public/logo/logo.png" alt="Ammachi Logo" width="200" />

**Your Personal AI Native Language Companion & Cultural Storyteller**

[![PWA Ready](https://img.shields.io/badge/PWA-Installable-orange?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-Vite%20PWA-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Psycopg3-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org)
[![Bodhan AI](https://img.shields.io/badge/Bodhan%20IndicOCR-AI%20Vision-FF6F00?style=for-the-badge)](https://bodhan.ai)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Multimodal-4285F4?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)

</div>

---

## 📖 Overview

**Ammachi ("Grandmother's Class")** is a production-ready, installable **Progressive Web App (PWA)** designed to help NRI (Non-Resident Indian) children learn, retain, and celebrate Indian native languages (**Tamil, Telugu, Hindi, Malayalam, and Kannada**). 

The platform combines warm, motherly AI mentorship with cutting-edge vision, speech, and agentic workflows across three core modules:

1. ✍️ **AI Handwritten Tutor (Bodhan IndicOCR + Computer Vision)**: Write in a real notebook, snap a photo, and our dedicated preprocessing pipeline (CLAHE, Adaptive Thresholding, EXIF correction) prepares the image for Bodhan's IndicOCR engine. It strictly validates against supported characters to evaluate handwriting accuracy.
2. 🎤 **AI Voice Agent (Deepgram STT + Patience Denoising Agent + ElevenLabs TTS)**: Practice speaking and conversational fluency with an adaptive, stutter-tolerant grandmother persona that recasts mistakes gently.
3. 🏆 **Challenge-a-Friend & Cultural Gamification**: A robust 10-question challenge module allowing kids to compete in language and cultural knowledge, managed by an intelligent multi-agent AI system. Explore Indian festivals, folktales, solve quiz challenges, and collect digital Cultural Stamps.

---

## 🛠️ Upgraded Architecture & Tech Stack

```text
                               ┌────────────────────────────────┐
                               │  Ammachi React 18 Vite PWA     │
                               │  (Tailwind CSS + WebApp Shell) │
                               └───────────────┬────────────────┘
                                               │ HTTP / REST / JWT
                                               ▼
                               ┌────────────────────────────────┐
                               │        FastAPI Backend         │
                               └───────┬───────────────┬────────┘
                                       │               │
            ┌──────────────────────────┼───────────────┼──────────────────────────┐
            ▼                          ▼               ▼                          ▼
 ┌──────────────────────┐   ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────────────┐
 │    Module 1: Vision  │   │  Module 2: Voice   │   │ Module 3: Culture  │   │  Database & Persistence  │
 │  OpenCV Preprocessor │   │  Deepgram Nova-2   │   │  10-Q Challenges   │   │  PostgreSQL (Psycopg 3)  │
 │  Bodhan IndicOCR     │   │  Patience Agent    │   │  Festival Story RAG│   │  SQLAlchemy 2.0 ORM      │
 │  Subset Validation   │   │  ElevenLabs TTS    │   │  Gamified Badges   │   │  (SQLite local fallback) │
 └──────────────────────┘   └────────────────────┘   └────────────────────┘   └──────────────────────────┘
```

### Technology Highlights
- **Frontend PWA**: React 18, Vite 5, Tailwind CSS, `vite-plugin-pwa` (Service Worker, Workbox static asset caching, Web App Manifest, Install prompts), Lucide Icons, Canvas Confetti.
- **Backend API**: FastAPI, Pydantic v2, Python 3.11+, JWT security, CORS middleware.
- **AI / Agent Layer**: Google Gemini (`gemini-1.5-flash` / `gemini-2.0-flash`), LangChain, LangGraph orchestrator, Groq Cloud fallback.
- **Vision / OCR**: Bodhan IndicOCR + custom OpenCV preprocessing pipeline (CLAHE, bilateral filtering, Gaussian adaptive thresholding, intelligent EXIF orientation handling).
- **Speech**: Deepgram STT (`nova-2`), ElevenLabs emotive Grandmother TTS (`eleven_multilingual_v2`), gTTS regional fallback.
- **Database**: PostgreSQL with SQLAlchemy 2.0 and Psycopg 3 driver (with automatic zero-config SQLite development fallback).

---

## 📁 Repository Structure

```
AI-Native-Language-Tutor-main/
│
├── backend/
│   ├── api/
│   │   ├── auth.py              # Authentication (JWT, signup, login, Google OAuth, /me)
│   │   ├── handwriting.py       # Module 1: Handwriting analysis & letters API
│   │   ├── challenge.py         # Module 3: Challenge-a-friend WebSocket and REST endpoints
│   │   ├── voice.py             # Module 2: STT, Patience Agent, & ElevenLabs TTS
│   │   └── user.py              # User progress, stats, and passport stamps
│   │
│   ├── database/
│   │   ├── connection.py         # SQLAlchemy engine, Psycopg 3, & SQLite fallback
│   │   ├── models.py             # User, LearningProgress, CulturalStamp, Session
│   │   ├── handwriting_models.py # Handwriting models (Letters, Attempts)
│   │   └── crud.py               # Data access layer & streak/progress metrics
│   │
│   ├── services/
│   │   ├── bodhan_ocr.py             # Bodhan IndicOCR integration
│   │   ├── handwriting_preprocessor.py # OpenCV pipeline for shadows, EXIF, and cropping
│   │   ├── handwriting_service.py    # Multi-pass OCR validation and language subsets
│   │   ├── challenge_service.py      # Core challenge logic (10-question fixed sets)
│   │   ├── challenge_ai.py           # Gemini prompt-generation for challenges
│   │   ├── gemini_service.py         # Gemini Multimodal Vision & LLM completion
│   │   └── voice_service.py          # Deepgram STT & ElevenLabs/gTTS streaming
│   │
│   ├── tests/
│   │   └── test_handwriting.py  # Unit tests for the Handwriting CV/OCR pipeline
│   │
│   ├── schemas/                  # Pydantic v2 schemas for all APIs
│   ├── main.py                  # FastAPI application entry point
│   └── requirements.txt         # Upgraded Python dependencies
│
├── frontend/
│   ├── public/                  
│   │   └── logo/                # Ammachi Custom Logo
│   ├── src/
│   │   ├── components/          # Mascots, Speech bubbles, Navbars, Audio players
│   │   ├── pages/               # Auth, Dashboard, Handwriting, Challenge, Speaking, Progress
│   │   ├── context/             # AuthContext (JWT) & LanguageContext (Tamil/Telugu/Hindi)
│   │   ├── services/            # Axios API clients
│   │   ├── App.jsx              # React Router setup
│   │   ├── main.jsx             # React entry point & PWA service worker registration
│   │   └── index.css            # Tailwind design system with warm child-friendly theme
│   ├── package.json
│   └── vite.config.js           # Vite PWA configuration
│
├── .env.example                 # Environment configuration template
├── .gitignore                   # Production Git ignore rules
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & **npm**
- **Git**
- *(Optional)* **PostgreSQL** (if omitted, backend runs seamlessly with local SQLite)

---

### 1. Environment Setup

Copy `.env.example` to create your `.env` file in the `backend/` directory:

```bash
cp .env.example backend/.env
```

Configure your API keys in `backend/.env`:
```ini
# PostgreSQL (Optional - falls back to SQLite if omitted)
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/ammachi_db

# Bodhan IndicOCR API
BODHAN_API_KEY=your_bodhan_api_key_here
BODHAN_OCR_ENDPOINT=https://api.bodhan.ai/v1/chat/completions

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Groq Cloud (Fast fallback)
GROQ_API_KEY=your_groq_api_key_here

# Deepgram Speech-to-Text
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# ElevenLabs Voice
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=ThT5KcBeYPX3keUQqHPh

# JWT Security
JWT_SECRET=your_jwt_secret_key_here

# Frontend URL
FRONTEND_URL=http://localhost:5173
PORT=8000
```

---

### 2. Backend Setup & Run

Navigate to `backend/` and install dependencies:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Seed the handwriting database with supported letters:
```bash
python seed_letters.py
```

Start the FastAPI backend server:

```bash
python -m uvicorn main:app --reload --port 8000
```

The API will be live at:
- **API Root**: `http://localhost:8000`
- **Interactive OpenAPI Docs (Swagger)**: `http://localhost:8000/docs`

---

### 3. Frontend Setup & Run

Open a new terminal window, navigate to `frontend/`, and install dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open your browser at:
👉 `http://localhost:5173`

---

## 📱 Testing Progressive Web App (PWA) Features

### 1. Desktop Installation (Chrome / Edge)
1. Open `http://localhost:5173` in Google Chrome or Microsoft Edge.
2. Click the **Install App** icon in the address bar (or Menu > "Install Ammachi's Class").
3. Launch the standalone desktop app window.

### 2. Mobile Installation (iOS / Android)
- **Android (Chrome)**: Tap the 3-dots menu > **"Add to Home screen"** / **"Install app"**.
- **iOS (Safari)**: Tap the Share button > **"Add to Home Screen"**.

### 3. Offline Shell Test
1. In Chrome DevTools, open the **Application** tab.
2. Check **Service Workers** to verify `sw.js` is active.
3. Check the **Offline** checkbox in DevTools Network tab.
4. Refresh the page: the application shell, fonts, cached lessons, and navigation continue to function offline with an amber offline status banner!

---

## 🧪 Testing the 3 Core Modules

### ✍️ Module 1: AI Handwriting Tutor
1. Navigate to `/handwriting` from the Dashboard.
2. Choose your language (Tamil, Telugu, Hindi, Malayalam) and select a target character.
3. Write the character in your physical notebook.
4. Click **"Take Photo & Check"** to snap a photo or upload an image.
5. **How it works:**
   - The backend runs a light Computer Vision preprocessor to normalize EXIF orientation and resize.
   - It makes a call to Bodhan IndicOCR.
   - If Bodhan recognizes an invalid character (e.g. shadow artifact), a heavy CV pass (CLAHE + Thresholding) is run to suppress notebook lines and shadows before re-running OCR.
   - The final detected character is compared against the actual target character, and you are provided deterministic feedback.

### 🎤 Module 2: AI Voice Agent
1. Navigate to `/speaking`.
2. Tap **"Tap to Speak 🎙️"** and grant microphone permission when prompted.
3. Say words or sentences (e.g., *"Vazhaipazham"* or *"Vanakkam Ammachi"*).
4. Tap **"Stop Recording"**:
   - Deepgram transcribes your speech.
   - The Patience Agent denoises any pauses or repetitions.
   - Ammachi replies in a warm voice (ElevenLabs / gTTS) and awards fluency points.

### 🏆 Module 3: Challenge-a-Friend
1. Navigate to `/challenge`.
2. Enter your friend's username to start a new Challenge match.
3. **The 10-Question Gamified Loop:**
   - The Gemini-powered AI generates 5 Language questions (alphabet, words) and 5 Cultural questions (festivals, traditions, states).
   - Real-time WebSockets sync the progress of both players.
   - At the end of the 10 questions, the winner is declared!

---

## 🔒 Security & Best Practices
- **No Hardcoded Secrets**: All API keys, database credentials, and JWT secrets are managed via environment variables.
- **Secure Password Hashing**: Passwords are hashed using salted cryptographic hashing (PBKDF2-SHA256).
- **Protected Endpoints**: JWT validation middleware ensures user privacy and progress integrity.
- **Strict CORS**: Origins are strictly controlled via `FRONTEND_URL` / `CORS_ORIGINS`.
