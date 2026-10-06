from pydantic import BaseModel
from typing import Optional

class HandwritingEvaluationResponse(BaseModel):
    success: bool
    status: str
    target: str
    detected: Optional[str]
    is_correct: bool
    score: Optional[int]
    confidence: Optional[float]
    feedback: str
