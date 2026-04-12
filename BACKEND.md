# 🏗️ Ammachi-AI — Backend Architecture (Detailed Documentation)

> A top-to-bottom walkthrough of every layer, file, module, endpoint, and design decision in the **Ammachi-AI** backend.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Tech Stack Summary](#2-tech-stack-summary)
3. [Directory Structure](#3-directory-structure)
4. [Entry Point — `main.py`](#4-entry-point--mainpy)
5. [Configuration & Environment Variables](#5-configuration--environment-variables)
6. [Database Layer — `database.py`](#6-database-layer--databasepy)
7. [Data Models — `models.py`](#7-data-models--modelspy)
8. [API Routers (The `api/` Package)](#8-api-routers-the-api-package)
   - 8.1 [Authentication — `api/auth.py`](#81-authentication--apiauthpy)
   - 8.2 [Vision / Handwriting — `api/vision.py`](#82-vision--handwriting--apivisionpy)
   - 8.3 [Voice Agent — `api/voice.py`](#83-voice-agent--apivoicepy)
   - 8.4 [Cultural Discovery Agent — `api/culture.py`](#84-cultural-discovery-agent--apiculturepy)
9. [LangGraph Agent Orchestration](#9-langgraph-agent-orchestration)
10. [AI / LLM Integration](#10-ai--llm-integration)
11. [Text-to-Speech Pipeline](#11-text-to-speech-pipeline)
12. [Utility & Debug Scripts](#12-utility--debug-scripts)
13. [Dependencies — `requirements.txt`](#13-dependencies--requirementstxt)
14. [Security Considerations](#14-security-considerations)
15. [Deployment Notes](#15-deployment-notes)
16. [Data Flow Diagrams](#16-data-flow-diagrams)

---

## 1. High-Level Overview

The Ammachi-AI backend is a **Python / FastAPI** server that powers an AI-native language tutor for children. It exposes four groups of REST endpoints consumed by a **Streamlit** frontend:

| Domain | Purpose |
|---|---|
| **Auth** | User signup, login (password + Google OAuth2) |
| **Vision** | Handwriting analysis — stroke tracing and OCR on uploaded images/videos |
| **Voice** | Speech-to-text transcription, stutter cleaning, and conversational AI response |
| **Culture** | Festival-based cultural discovery powered by a LangGraph multi-tool agent |

All AI reasoning is performed via external LLM APIs (primarily **Groq**) orchestrated through **LangChain** and **LangGraph**.

---

## 2. Tech Stack Summary

| Layer | Technology |
|---|---|
| Web Framework | **FastAPI** (with Uvicorn ASGI server) |
| Data Validation | **Pydantic v2** |
| Database | **SQLite** (`ammachi.db`, local-first) |
| Password Hashing | **passlib** (PBKDF2-SHA256) |
| Authentication | **PyJWT** (HS256 tokens) + **Google OAuth2** |
| LLM Inference | **Groq Cloud** (Llama-4-Scout, Llama-3.3-70b, GPT-OSS-120b) |
| Agent Orchestration | **LangGraph** `StateGraph` with tool nodes |
| LLM Bindings | **LangChain** (`langchain-groq`, `langchain-core`) |
| Vision / CV | **OpenCV**, **MediaPipe** (hand tracking), **Tesseract OCR** |
| Speech-to-Text | **Groq Whisper** (`whisper-large-v3`) |
| Text-to-Speech | **ElevenLabs** (multilingual v2) + **gTTS** (Tamil fallback) |
| Web Search | **DuckDuckGo Search** (video/image retrieval) |
| Environment Config | **python-dotenv** (`.env` file) |

---

## 3. Directory Structure

```
backend/
├── main.py              # FastAPI application entry point
├── database.py          # SQLite database layer (init, CRUD, auth helpers)
├── models.py            # Pydantic request/response schemas
├── requirements.txt     # Python dependencies
├── ammachi.db           # SQLite database file (auto-created)
├── api/                 # FastAPI routers (one per domain)
│   ├── __init__.py      # Package marker (empty)
│   ├── auth.py          # Login, signup, Google OAuth2 endpoints
│   ├── vision.py        # Handwriting & image analysis endpoints
│   ├── voice.py         # Speech transcription & TTS endpoints
│   └── culture.py       # Cultural discovery LangGraph agent endpoint
├── diag.py              # Diagnostic script — tests imports, DB, JWT, Pydantic
├── debug_mp.py          # MediaPipe availability check
└── test_graph.py        # Quick smoke test for LangGraph compilation
```

---

## 4. Entry Point — `main.py`

**File:** `backend/main.py`

This is the application bootstrap. It performs four things:

1. **Loads environment variables** from `.env` via `python-dotenv`.
2. **Initializes the database** by calling `database.init_db()` — creates the `users` table and seeds a default `student` user.
3. **Creates the FastAPI app** with the title `"Ammachi Backend"`.
4. **Registers CORS middleware** — wide-open (`allow_origins=["*"]`) to allow the Streamlit frontend to call the API from any origin.
5. **Includes four routers:**

| Router | Prefix | Tags |
|---|---|---|
| `auth.router` | *(none)* | `Auth` |
| `vision.router` | `/vision` | `Vision` |
| `voice.router` | `/voice` | `Voice` |
| `culture.router` | `/culture` | `Culture` |

A health-check endpoint is available at:

```
GET /  →  {"message": "Ammachi API is running!"}
```

### How to Start

```bash
cd backend
uvicorn main:app --reload --port 8000
```

---

## 5. Configuration & Environment Variables

All secrets are loaded from a `.env` file in the `backend/` directory.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | **Yes** | API key for Groq Cloud (LLM inference & Whisper STT) |
| `ELEVENLABS_API_KEY` / `ELEVEN_LABS_API` | No | ElevenLabs TTS key (falls back to gTTS) |
| `ELEVENLABS_VOICE_ID` | No | Custom voice ID (default: `ThT5KcBeYPX3keUQqHPh` — "Dorothy") |
| `GOOGLE_CLIENT_ID` | No | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | No | OAuth2 redirect (default: `http://localhost:8501`) |
| `JWT_SECRET` | No | Secret for signing JWT tokens (default: `ammachi-secret-key-12345`) |
| `TESSERACT_PATH` | No | Custom path to the Tesseract binary (useful on Windows) |

---

## 6. Database Layer — `database.py`

**File:** `backend/database.py`

### Storage

- **Engine:** SQLite (file: `ammachi.db`)
- **Access:** Raw `sqlite3` module (no ORM)

### Schema

```sql
CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    password_hash TEXT,          -- PBKDF2-SHA256 hash (NULL for Google-only accounts)
    google_id     TEXT,          -- Google OAuth2 subject ID
    points        INTEGER DEFAULT 0,
    stamps        TEXT DEFAULT '[]'   -- JSON array of earned cultural stamps
);
```

A lightweight **migration** runs on every startup: if the `password_hash` column doesn't exist (legacy schema), it is added via `ALTER TABLE`.

### Seeded Data

On first launch, a default user is created:

| username | password | points |
|---|---|---|
| `student` | `password123` | 0 |

> ⚠️ **Security Warning:** This default account uses a well-known password. In a production deployment, you **must** remove this account or change its password immediately after first launch.

### Exported Functions

| Function | Signature | Description |
|---|---|---|
| `init_db()` | `() → None` | Creates table, runs migrations, seeds default user |
| `get_user(username)` | `str → dict \| None` | Fetch user by username |
| `create_user(username, password?, google_id?)` | `str, str?, str? → bool` | Insert new user; returns `False` on duplicate |
| `verify_password(plain, hashed)` | `str, str → bool` | Validate a password against its hash |
| `get_user_by_google_id(google_id)` | `str → dict \| None` | Lookup user by Google OAuth subject ID |
| `update_score(username, points_add, new_stamp?)` | `str, int, str? → dict \| None` | Add points and optionally append a unique stamp |

### Password Hashing

Uses `passlib.context.CryptContext` with the **PBKDF2-SHA256** scheme. Passwords are never stored in plaintext.

---

## 7. Data Models — `models.py`

**File:** `backend/models.py`

All request/response bodies are validated with **Pydantic `BaseModel`**.

### Auth Models

| Model | Fields | Used By |
|---|---|---|
| `LoginRequest` | `username: str`, `password: str` | `POST /login` |
| `SignupRequest` | `username: str`, `password: str` | `POST /signup` |
| `GoogleAuthRequest` | `id_token: str` | `POST /auth/google` |
| `LoginResponse` | `success: bool`, `message: str`, `token: str?`, `username: str?` | All auth responses |

### Vision Models

| Model | Fields | Used By |
|---|---|---|
| `VisionResponse` | `detected_text: str`, `feedback: str`, `is_correct: bool` | `POST /vision/analyze` |

### Voice Models

| Model | Fields | Used By |
|---|---|---|
| `VoiceResponse` | `feedback: str`, `transcription: str` | `POST /voice/analyze` |

---

## 8. API Routers (The `api/` Package)

Each file in `api/` defines a FastAPI `APIRouter`. They are imported and mounted in `main.py`.

---

### 8.1 Authentication — `api/auth.py`

**File:** `backend/api/auth.py`

Handles user authentication through two strategies: **local credentials** and **Google OAuth2**.

#### JWT Token Generation

```python
create_token(username) → str
```

Creates an HS256 JWT with a 7-day expiry containing the `username` claim.

#### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/config` | Returns `{ google_client_id }` for the frontend to initiate OAuth |
| `POST` | `/login` | Accepts `LoginRequest`, verifies password, returns JWT |
| `POST` | `/signup` | Accepts `SignupRequest`, creates user, returns JWT |
| `GET` | `/auth/google/url` | Generates a Google OAuth2 consent URL using `google_auth_oauthlib` |
| `POST` | `/auth/google/exchange` | Exchanges an OAuth authorization code for user identity; creates user if new; returns JWT |
| `POST` | `/auth/google` | Alternate: accepts a raw Google `id_token` directly; verifies and logs in |

#### Google OAuth2 Flow

1. Frontend calls `GET /auth/google/url` → receives consent URL.
2. User authenticates on Google → redirected back with an authorization `code`.
3. Frontend sends `code` to `POST /auth/google/exchange`.
4. Backend exchanges the code for tokens, verifies the ID token, extracts `sub` (Google ID) and `email`.
5. If no user exists for that Google ID, one is created automatically.
6. A JWT is returned to the frontend.

---

### 8.2 Vision / Handwriting — `api/vision.py`

**File:** `backend/api/vision.py`

Analyzes handwriting images and videos uploaded by the child.

#### Components

| Component | Purpose |
|---|---|
| **MediaPipe Hands** | Tracks the index-finger tip (landmark 8) across video frames to extract the stroke path |
| **OpenCV** | Video frame extraction, image preprocessing (resize, adaptive threshold) |
| **Tesseract OCR** | Local OCR for Tamil + English text extraction |
| **Groq LLM (Llama-4-Scout)** | Multimodal analysis — receives base64-encoded image + prompt |

#### Endpoint

```
POST /vision/analyze
```

| Parameter | Type | Description |
|---|---|---|
| `file` | `UploadFile` | Image (`.png`) or video (`.mp4`) of handwriting |
| `target_char` | `str` (optional) | The Tamil character the child is trying to write |
| `mode` | `str` (default `"trace"`) | `"trace"` for stroke analysis, `"general"` for OCR + feedback |

#### Processing Pipeline

**Trace Mode:**
1. If input is a video, extract finger-tip trajectory using MediaPipe Hands → render white stroke lines on a black canvas.
2. If MediaPipe is unavailable, fall back to extracting the first video frame.
3. Send the resulting image (base64) + a system prompt to the Groq multimodal LLM for stroke-order analysis.

**General Mode:**
1. If input is a video, extract the middle frame.
2. Run Tesseract OCR on the image (Tamil + English, PSM 6).
3. Provide the OCR result as a hint to the LLM alongside the base64 image.
4. LLM transcribes, corrects, and gives Ammachi-style feedback.

#### Response

```json
{
  "detected_text": "Handwriting analysis (trace)",
  "feedback": "Kanna, start from the top like a little mountain!",
  "is_correct": true
}
```

#### Cleanup

All temporary files (`*.mp4`, `*_stroke.png`, `*_frame.png`) are deleted in a `finally` block.

---

### 8.3 Voice Agent — `api/voice.py`

**File:** `backend/api/voice.py`

Handles the full speech interaction loop: **STT → Stutter Cleaning → Conversational Reply → TTS**.

#### Endpoint: Analyze Voice

```
POST /voice/analyze
```

| Parameter | Type | Description |
|---|---|---|
| `file` | `UploadFile` | Audio file (`.wav`) recorded from the child |

**Pipeline:**

1. **Save** the uploaded audio to a temp `.wav` file.
2. **Transcribe** using Groq's `whisper-large-v3` model with Tamil (`ta`) language hint.
3. **Patience Agent** — a secondary LLM call (Llama-3.3-70b) cleans the transcription:
   - Removes stutters (`"A... A... Amma"` → `"Amma"`)
   - Strips filler words (`um`, `uh`)
   - Fixes minor phonetic errors
4. **Conversational Reply** — another LLM call generates Ammachi's response:
   - Replies relevantly in Tanglish
   - Performs **recasting** (repeats the child's sentence correctly if there was a mistake)
   - Uses warm terms of endearment (Kanna, Chellam, Sabash)
5. Returns `VoiceResponse` with `transcription` (cleaned text) and `feedback` (Ammachi's reply).

#### Endpoint: Text-to-Speech

```
POST /voice/speak
```

| Parameter | Type | Description |
|---|---|---|
| `text` | `str` (form) | The text to convert to speech |

**Pipeline:**

1. **Clean** the text — strip markdown (`**`, `_`, `#`), replace colons with periods, remove dashes.
2. **Detect language** — checks for Tamil Unicode range (`\u0B80`–`\u0BFF`).
3. **Tamil text** → uses **gTTS** (Google Text-to-Speech) with `lang='ta'`.
4. **English/Tanglish text** → uses **ElevenLabs** (`eleven_multilingual_v2` model, "Dorothy" voice).
5. **Fallback** → if ElevenLabs fails, falls back to gTTS in English.
6. Returns a `StreamingResponse` with `audio/mpeg` content.

---

### 8.4 Cultural Discovery Agent — `api/culture.py`

**File:** `backend/api/culture.py`

The most complex module — a **LangGraph-powered multi-tool agent** that teaches children about Indian festivals through interactive storytelling.

#### Tools Registered with the Agent

| Tool | Description |
|---|---|
| `search_youtube(query, language)` | Searches DuckDuckGo for a kid-friendly video; returns `[VIDEO: url]` |
| `search_image(query, language)` | Searches DuckDuckGo for a festival cartoon image; returns `[IMAGE: url]` |
| `update_user_score(username, points, stamp)` | Awards points and cultural stamps to the user in the DB |
| `get_festival_content(festival_name)` | Returns a hardcoded educational description for 10+ Indian festivals |
| `get_relevant_festival(language)` | Maps a language (Tamil, Hindi, etc.) to its culturally relevant festivals |

#### LangGraph Agent Architecture

```
┌─────────────┐     tool_calls?     ┌─────────────┐
│             │ ──── Yes ──────────►│             │
│  agent_node │                     │  tool_node  │
│  (LLM call) │ ◄──────────────────│  (executes) │
│             │                     │             │
└──────┬──────┘                     └─────────────┘
       │ No tool_calls
       ▼
      END
```

- **State:** `AgentState` — a `TypedDict` with `messages: List[BaseMessage]` and `username: str`.
- **Agent Node:** Calls the LLM (`openai/gpt-oss-120b` via Groq) with tools bound.
- **Tool Node:** Executes whichever tool the LLM invoked.
- **Conditional Edge:** If the LLM response contains `tool_calls`, route to tool node; otherwise, end.
- The tool node always routes back to the agent node (allows multi-step tool use).

#### Dynamic System Prompt

The system prompt adapts based on the selected language:

| Language | Persona | Style |
|---|---|---|
| Tamil | Ammachi | Tanglish |
| Hindi | Dadi | Hinglish |
| Other | Grandma | English |

The prompt instructs the agent to:
1. Greet the child warmly.
2. List relevant festivals (using `get_relevant_festival`).
3. Once a festival is picked, fetch content, an image, and a video.
4. Present the story with embedded `[IMAGE: ...]` and `[VIDEO: ...]` tags.
5. Challenge the child with a question.
6. Award 10 points + a cultural stamp only for correct answers.

#### Endpoint

```
POST /culture/chat
```

| Parameter | Type | Description |
|---|---|---|
| `message` | `str` (form) | The child's latest message |
| `history` | `str` (form) | JSON-serialized chat history (`[{role, content}, ...]`) |
| `username` | `str` (form, default `"student"`) | The logged-in username |
| `language` | `str` (form, default `"Tamil"`) | The target language |

**Processing:**

1. Deserialize `history` from JSON.
2. Build the LangChain message list: `SystemMessage` (persona prompt) + history + new `HumanMessage`.
3. **Scrub** any leaked technical artifacts (JSON tool calls, XML tags, LangChain internals) from historical messages.
4. Invoke the compiled LangGraph `app_graph`.
5. Scrub the final response again.
6. Fetch the user's latest `points` and `stamps` from the database.
7. Return `CultureResponse`.

#### Response

```json
{
  "response": "Kanna! Let's learn about Pongal today! 🎉 ...",
  "points": 30,
  "stamps": ["Pongal Master", "Diwali Explorer"]
}
```

---

## 9. LangGraph Agent Orchestration

The cultural discovery module uses **LangGraph** (from the LangChain ecosystem) to build a stateful, tool-calling agent loop.

### Graph Definition

```python
workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)      # LLM reasoning
workflow.add_node("action", tool_node)      # Tool execution
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("action", "agent")        # Always loop back
app_graph = workflow.compile()
```

### Why LangGraph?

- Provides a **cyclic** agent loop (agent → tool → agent → ...) until the LLM stops calling tools.
- Manages **state accumulation** — each message and tool result is appended to the state.
- Enables easy extension with new tools (just add to the `tools` list).

---

## 10. AI / LLM Integration

The backend uses **three different LLM models** through Groq Cloud, each chosen for its strengths:

| Use Case | Model | Called Via |
|---|---|---|
| Vision (Handwriting) | `meta-llama/llama-4-scout-17b-16e-instruct` | `ChatGroq` (multimodal — image + text) |
| Voice (Stutter cleaning + Reply) | `llama-3.3-70b-versatile` | `ChatGroq` (text-only, fast) |
| Culture Agent | `openai/gpt-oss-120b` | `ChatGroq` with `.bind_tools()` |

### Multimodal Flow (Vision)

1. Image is base64-encoded.
2. Sent as a `content` array: `[{type: "text", ...}, {type: "image_url", ...}]`.
3. The LLM processes both text instructions and the image simultaneously.

### Tool-Calling Flow (Culture)

1. LLM receives messages + tool schemas.
2. LLM returns a response with `tool_calls` (structured JSON).
3. LangGraph's `ToolNode` executes the tool and appends the result.
4. LLM receives the tool output and formulates the next response.

---

## 11. Text-to-Speech Pipeline

The TTS system uses a **language-aware dual-engine** approach:

```
Input Text
    │
    ├── Contains Tamil chars (U+0B80–U+0BFF)?
    │       │
    │       └── Yes → gTTS (lang='ta') → audio/mpeg
    │
    └── No (English / Tanglish)
            │
            ├── ElevenLabs available?
            │       │
            │       └── Yes → ElevenLabs (eleven_multilingual_v2) → audio/mpeg stream
            │
            └── No → gTTS (lang='en') fallback → audio/mpeg
```

### Pre-Processing

Before any TTS call, the text is cleaned:
- Markdown bold/italic markers (`**`, `_`) removed
- Colons replaced with periods
- Hash symbols and dashes removed
- This prevents the TTS engine from literally saying "asterisk" or "colon"

---

## 12. Utility & Debug Scripts

| File | Purpose |
|---|---|
| `diag.py` | Smoke-tests all critical imports (database, auth, models, JWT, passlib). Useful for verifying the environment is set up correctly. |
| `debug_mp.py` | Checks if MediaPipe is installed and its `solutions` module is accessible. |
| `test_graph.py` | Attempts to import and compile the LangGraph agent. Catches and prints any errors. |

These are **developer tools** — not part of the production runtime.

---

## 13. Dependencies — `requirements.txt`

| Package | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `python-multipart` | File upload support for FastAPI |
| `pydantic` | Data validation |
| `python-dotenv` | `.env` file loading |
| `groq` | Groq Cloud SDK (Whisper STT) |
| `deepgram-sdk` | Deepgram SDK (listed but not actively used in current code) |
| `langgraph` | Agent orchestration framework |
| `langchain` | LLM abstraction layer |
| `langchain-groq` | Groq LLM bindings for LangChain |
| `duckduckgo-search` | Web/video/image search (no API key needed) |
| `langchain-google-genai` | Google Generative AI bindings (listed, not actively used) |
| `mediapipe` | Hand tracking for stroke extraction |
| `opencv-python-headless` | Image/video processing (headless for server) |
| `transformers` | Hugging Face transformers (listed for potential local models) |
| `torch` | PyTorch (ML runtime) |
| `accelerate` | Hugging Face model acceleration |
| `qwen-vl-utils` | Qwen2-VL vision-language utilities |
| `decord` | Efficient video decoding |
| `torchvision` | Vision utilities for PyTorch |
| `elevenlabs` | ElevenLabs TTS SDK |
| `gTTS` | Google Text-to-Speech (Tamil fallback) |
| `langchain-openai` | OpenAI bindings for LangChain |

### Implicit Dependencies (not in requirements.txt but used)

| Package | Purpose |
|---|---|
| `passlib` | Password hashing (PBKDF2-SHA256) |
| `PyJWT` | JWT token creation/verification |
| `google-auth` | Google OAuth2 token verification |
| `google-auth-oauthlib` | Google OAuth2 flow |
| `pytesseract` | Python wrapper for Tesseract OCR |
| `Pillow` | Image manipulation (`PIL.Image`) |

---

## 14. Security Considerations

| Area | Implementation | Notes |
|---|---|---|
| **Password Storage** | PBKDF2-SHA256 via passlib | ✅ Industry-standard hashing |
| **Authentication** | JWT (HS256, 7-day expiry) | ⚠️ Default secret key is hardcoded — must override via `JWT_SECRET` env var in production |
| **CORS** | `allow_origins=["*"]` | ⚠️ Wide open — should be restricted to the Streamlit frontend domain in production |
| **SQL Injection** | Parameterized queries throughout | ✅ Safe |
| **File Uploads** | Temp files with cleanup in `finally` | ✅ No persistent user-uploaded files |
| **API Keys** | Loaded from `.env`, never committed | ✅ `.env` is in `.gitignore` |
| **OAuth2** | Full server-side code exchange flow | ✅ Secrets never exposed to client |

---

## 15. Deployment Notes

### Running Locally

```bash
cd backend
pip install -r requirements.txt
# Create .env with required API keys
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Deployment

```bash
# Use a production ASGI server
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:8000
```

### System Dependencies

- **Tesseract OCR** must be installed on the host for Tamil handwriting recognition:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install tesseract-ocr tesseract-ocr-tam
  ```
- **MediaPipe** requires a compatible Python version and may not work on all architectures.

### Database

SQLite is used for simplicity (local-first). For multi-instance deployments, migrate to PostgreSQL or another shared database.

---

## 16. Data Flow Diagrams

### Overall Request Flow

```
┌──────────────────┐        HTTP/REST        ┌──────────────────────────────┐
│   Streamlit UI   │ ◄─────────────────────► │    FastAPI Backend (8000)    │
│  (localhost:8501) │                         │                              │
└──────────────────┘                         │  ┌──────────┐ ┌──────────┐  │
                                             │  │ Auth API │ │Vision API│  │
                                             │  └────┬─────┘ └────┬─────┘  │
                                             │       │            │        │
                                             │  ┌────▼─────┐ ┌───▼──────┐ │
                                             │  │ SQLite DB│ │ Groq LLM │ │
                                             │  └──────────┘ │ MediaPipe│ │
                                             │               │ Tesseract│ │
                                             │               └──────────┘ │
                                             │  ┌──────────┐ ┌──────────┐ │
                                             │  │Voice API │ │Culture   │ │
                                             │  │          │ │Agent API │ │
                                             │  └────┬─────┘ └────┬─────┘ │
                                             │       │            │        │
                                             │  ┌────▼─────┐ ┌───▼──────┐ │
                                             │  │ Whisper  │ │ LangGraph│ │
                                             │  │ ElevenLab│ │ DuckDuck │ │
                                             │  │ gTTS     │ │ Go Search│ │
                                             │  └──────────┘ └──────────┘ │
                                             └──────────────────────────────┘
```

### Cultural Agent Multi-Turn Flow

```
Child: "Tell me about Pongal!"
         │
         ▼
  ┌─────────────┐
  │ System Prompt│ (Ammachi persona)
  │ + History    │
  │ + New Message│
  └──────┬──────┘
         ▼
  ┌─────────────┐   calls get_festival_content("pongal")
  │  Agent LLM  │ ──────────────────────────────────────►  Tool: Returns story context
  │             │ ◄──────────────────────────────────────
  │             │   calls search_image("pongal")
  │             │ ──────────────────────────────────────►  Tool: Returns [IMAGE: url]
  │             │ ◄──────────────────────────────────────
  │             │   calls search_youtube("pongal")
  │             │ ──────────────────────────────────────►  Tool: Returns [VIDEO: url]
  │             │ ◄──────────────────────────────────────
  │             │
  │  Composes   │ → "Kanna! Pongal is... [IMAGE: ...] [VIDEO: ...] Now tell me..."
  │  final reply│
  └─────────────┘
         │
         ▼
  Response to child with points & stamps
```

---

## Summary

The Ammachi-AI backend is a **FastAPI** application structured around four domain routers, each leveraging different AI capabilities:

- **Auth** provides secure credential and OAuth2-based authentication.
- **Vision** combines computer vision (MediaPipe, OpenCV, Tesseract) with multimodal LLMs for handwriting tutoring.
- **Voice** chains Whisper STT → stutter cleaning → conversational AI → dual-engine TTS for an inclusive voice experience.
- **Culture** uses a LangGraph agent with five tools to deliver interactive, festival-based cultural education.

The architecture is **modular**, **local-first** (SQLite), and **cloud-enhanced** (Groq, ElevenLabs), making it easy to develop locally while still leveraging powerful AI services.
