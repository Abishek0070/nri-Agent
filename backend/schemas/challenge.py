from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CreateChallengeRequest(BaseModel):
    language: str
    difficulty: str
    nickname: str

class JoinChallengeRequest(BaseModel):
    nickname: str

class ChallengeParticipantResponse(BaseModel):
    id: int
    nickname: str
    score: int
    joined_at: datetime

class ChallengeResponse(BaseModel):
    id: str
    language: str
    difficulty: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    participants: List[ChallengeParticipantResponse] = []
    
class GeneratedQuestion(BaseModel):
    type: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None

class ChallengeQuestionResponse(BaseModel):
    id: int
    q_type: str
    question_text: str
    options: Optional[List[str]] = None
    # Correct answer intentionally omitted

class SubmitAnswerRequest(BaseModel):
    participant_id: int
    question_id: int
    submitted_answer: str

class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    points_awarded: int
    correct_answer: str
    explanation: Optional[str] = None

class ChallengeResultResponse(BaseModel):
    participant_id: int
    nickname: str
    score: int
    rank: int
    correct_answers: int
    total_answers: int
