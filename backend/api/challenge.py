from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import asyncio
import logging

from database.connection import get_db
from schemas.challenge import (
    CreateChallengeRequest, JoinChallengeRequest, ChallengeResponse, 
    ChallengeParticipantResponse, ChallengeQuestionResponse, SubmitAnswerRequest, 
    SubmitAnswerResponse, ChallengeResultResponse
)
from services.challenge_service import (
    create_challenge, get_challenge, add_participant, start_challenge, 
    get_next_question, submit_answer, get_challenge_results
)
from database.models import Challenge, ChallengeParticipant

logger = logging.getLogger("ammachi.api.challenge")
router = APIRouter()

# ----------------------------------------------------
# WEBSOCKET MANAGER
# ----------------------------------------------------
class ConnectionManager:
    def __init__(self):
        # Maps challenge_id to list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, challenge_id: str):
        await websocket.accept()
        if challenge_id not in self.active_connections:
            self.active_connections[challenge_id] = []
        self.active_connections[challenge_id].append(websocket)

    def disconnect(self, websocket: WebSocket, challenge_id: str):
        if challenge_id in self.active_connections:
            if websocket in self.active_connections[challenge_id]:
                self.active_connections[challenge_id].remove(websocket)
            if not self.active_connections[challenge_id]:
                del self.active_connections[challenge_id]

    async def broadcast_state(self, challenge_id: str, message: dict):
        if challenge_id in self.active_connections:
            # We must await the send_json calls individually
            # to avoid modifying the list during iteration if one fails
            dead_sockets = []
            for connection in self.active_connections[challenge_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    dead_sockets.append(connection)
            
            for dead in dead_sockets:
                self.disconnect(dead, challenge_id)

manager = ConnectionManager()

def build_challenge_response(ch: Challenge) -> ChallengeResponse:
    parts = []
    for p in ch.participants:
        parts.append(ChallengeParticipantResponse(
            id=p.id,
            nickname=p.nickname,
            score=p.score,
            joined_at=p.joined_at
        ))
    return ChallengeResponse(
        id=ch.id,
        language=ch.language,
        difficulty=ch.difficulty,
        status=ch.status,
        start_time=ch.start_time,
        end_time=ch.end_time,
        participants=parts
    )

async def notify_challenge_update(db: Session, challenge_id: str):
    ch = get_challenge(db, challenge_id)
    if ch:
        state = build_challenge_response(ch).dict()
        state["type"] = "STATE_UPDATE"
        # Convert datetimes to isoformat for JSON
        for p in state["participants"]:
            if isinstance(p["joined_at"], str) is False:
                p["joined_at"] = p["joined_at"].isoformat()
        if state["start_time"]: state["start_time"] = state["start_time"].isoformat()
        if state["end_time"]: state["end_time"] = state["end_time"].isoformat()
        
        await manager.broadcast_state(challenge_id, state)

# ----------------------------------------------------
# REST ENDPOINTS
# ----------------------------------------------------

@router.post("", response_model=ChallengeResponse)
async def api_create_challenge(req: CreateChallengeRequest, db: Session = Depends(get_db)):
    ch = create_challenge(db, req.language, req.difficulty, req.nickname)
    return build_challenge_response(ch)

@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def api_get_challenge(challenge_id: str, db: Session = Depends(get_db)):
    ch = get_challenge(db, challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return build_challenge_response(ch)

@router.post("/{challenge_id}/join", response_model=ChallengeResponse)
async def api_join_challenge(challenge_id: str, req: JoinChallengeRequest, db: Session = Depends(get_db)):
    ch = get_challenge(db, challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if ch.status != "WAITING":
        raise HTTPException(status_code=400, detail="Challenge already started or ended")
        
    add_participant(db, challenge_id, req.nickname)
    db.refresh(ch)
    
    # Notify others via websocket
    await notify_challenge_update(db, challenge_id)
    
    return build_challenge_response(ch)

@router.post("/{challenge_id}/start", response_model=ChallengeResponse)
async def api_start_challenge(challenge_id: str, db: Session = Depends(get_db)):
    ch = start_challenge(db, challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    await notify_challenge_update(db, challenge_id)
    return build_challenge_response(ch)

@router.get("/{challenge_id}/question", response_model=ChallengeQuestionResponse)
async def api_get_question(challenge_id: str, participant_id: int, db: Session = Depends(get_db)):
    q = get_next_question(db, challenge_id, participant_id)
    if not q:
        raise HTTPException(status_code=404, detail="No questions available")
        
    return ChallengeQuestionResponse(
        id=q.id,
        q_type=q.q_type,
        question_text=q.question_text,
        options=q.options
    )

@router.post("/{challenge_id}/answer", response_model=SubmitAnswerResponse)
async def api_submit_answer(challenge_id: str, req: SubmitAnswerRequest, db: Session = Depends(get_db)):
    res = submit_answer(db, challenge_id, req.participant_id, req.question_id, req.submitted_answer)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
        
    await notify_challenge_update(db, challenge_id)
        
    return SubmitAnswerResponse(
        is_correct=res["is_correct"],
        points_awarded=res["points_awarded"],
        correct_answer=res["correct_answer"],
        explanation=res["explanation"]
    )

@router.get("/{challenge_id}/results", response_model=List[ChallengeResultResponse])
async def api_get_results(challenge_id: str, db: Session = Depends(get_db)):
    res = get_challenge_results(db, challenge_id)
    if not res:
        raise HTTPException(status_code=404, detail="No results found")
    return res

# ----------------------------------------------------
# WEBSOCKET ENDPOINT
# ----------------------------------------------------
@router.websocket("/{challenge_id}/ws")
async def websocket_endpoint(websocket: WebSocket, challenge_id: str, db: Session = Depends(get_db)):
    await manager.connect(websocket, challenge_id)
    
    # Send initial state
    await notify_challenge_update(db, challenge_id)
    
    try:
        while True:
            # We don't expect messages from client for MVP, but we keep connection alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, challenge_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, challenge_id)
