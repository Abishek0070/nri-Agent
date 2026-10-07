from pydantic import BaseModel
from typing import List, Optional, Any

class StampItem(BaseModel):
    stamp_name: str
    badge_icon: str
    earned_at: str

class ActivityItem(BaseModel):
    id: int
    module: str
    activity: str
    score: int
    language: str
    created_at: str

class UserProfileResponse(BaseModel):
    username: str
    avatar_url: Optional[str] = None
    points: int
    current_language: str
    streak: int
    overall_progress: int
    writing_score: int
    speaking_score: int
    culture_score: int
    total_activities: int
    badges_count: int
    stamps: List[StampItem]
    recent_activities: List[ActivityItem]

class UpdateLanguageRequest(BaseModel):
    language: str
