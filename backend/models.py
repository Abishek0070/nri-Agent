from pydantic import BaseModel
from typing import Optional, List

# Auth Models
class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    username: Optional[str] = None


# Story Models
# Story Models Removed

# Voice Models
class VoiceResponse(BaseModel):
    feedback: str
    transcription: str
