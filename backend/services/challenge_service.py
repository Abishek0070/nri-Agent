import random
import string
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models import Challenge, ChallengeParticipant, ChallengeQuestion, ChallengeAnswer
from services.challenge_ai import generate_questions_batch, evaluate_free_text_answer

logger = logging.getLogger("ammachi.challenge_service")

CHALLENGE_DURATION_MINUTES = 5

def generate_challenge_id(length=6) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def create_challenge(db: Session, language: str, difficulty: str, created_by_nickname: str) -> Challenge:
    challenge_id = generate_challenge_id()
    # Create challenge
    new_challenge = Challenge(
        id=challenge_id,
        language=language,
        difficulty=difficulty,
        status="WAITING"
    )
    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)
    
    # Add creator as first participant
    add_participant(db, challenge_id, created_by_nickname)
    
    # Trigger background generation of questions (simplified: we'll generate sync here for MVP, 
    # but could be async in a real prod env)
    try:
        generated = generate_questions_batch(language, difficulty, count=10)
        for gq in generated:
            db.add(ChallengeQuestion(
                challenge_id=challenge_id,
                q_type=gq.type,
                question_text=gq.question,
                options=gq.options,
                correct_answer=gq.correct_answer,
                explanation=gq.explanation
            ))
        db.commit()
    except Exception as e:
        logger.error(f"Failed to generate initial questions: {e}")
        
    return new_challenge

def get_challenge(db: Session, challenge_id: str) -> Optional[Challenge]:
    return db.query(Challenge).filter(Challenge.id == challenge_id).first()

def add_participant(db: Session, challenge_id: str, nickname: str) -> ChallengeParticipant:
    # Check if participant exists
    existing = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.nickname == nickname
    ).first()
    if existing:
        return existing
        
    p = ChallengeParticipant(
        challenge_id=challenge_id,
        nickname=nickname
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def start_challenge(db: Session, challenge_id: str) -> Optional[Challenge]:
    ch = get_challenge(db, challenge_id)
    if not ch or ch.status != "WAITING":
        return ch
        
    ch.status = "ACTIVE"
    ch.start_time = datetime.utcnow()
    db.commit()
    db.refresh(ch)
    return ch

def get_next_question(db: Session, challenge_id: str, participant_id: int) -> Optional[ChallengeQuestion]:
    # Find a question in this challenge that this participant hasn't answered yet
    answered_sq = db.query(ChallengeAnswer.question_id).filter(
        ChallengeAnswer.challenge_id == challenge_id,
        ChallengeAnswer.participant_id == participant_id
    ).subquery()
    
    q = db.query(ChallengeQuestion).filter(
        ChallengeQuestion.challenge_id == challenge_id,
        ~ChallengeQuestion.id.in_(answered_sq)
    ).order_by(ChallengeQuestion.id).first()
    
    # If no questions left, generate more dynamically
    if not q:
        ch = get_challenge(db, challenge_id)
        if ch:
            generated = generate_questions_batch(ch.language, ch.difficulty, count=5)
            for gq in generated:
                new_q = ChallengeQuestion(
                    challenge_id=challenge_id,
                    q_type=gq.type,
                    question_text=gq.question,
                    options=gq.options,
                    correct_answer=gq.correct_answer,
                    explanation=gq.explanation
                )
                db.add(new_q)
            db.commit()
            
            # Fetch again
            q = db.query(ChallengeQuestion).filter(
                ChallengeQuestion.challenge_id == challenge_id,
                ~ChallengeQuestion.id.in_(answered_sq)
            ).order_by(ChallengeQuestion.id).first()
            
    return q

def submit_answer(db: Session, challenge_id: str, participant_id: int, question_id: int, answer: str) -> Dict[str, Any]:
    ch = get_challenge(db, challenge_id)
    if not ch or ch.status != "ACTIVE":
        return {"error": "Challenge is not active"}
        

    # Check if already answered
    existing_ans = db.query(ChallengeAnswer).filter(
        ChallengeAnswer.participant_id == participant_id,
        ChallengeAnswer.question_id == question_id
    ).first()
    
    if existing_ans:
        return {"error": "Question already answered"}
        
    q = db.query(ChallengeQuestion).filter(ChallengeQuestion.id == question_id).first()
    if not q:
        return {"error": "Question not found"}
        
    is_correct = False
    points = 0
    
    # Evaluation logic
    if q.q_type == "multiple_choice":
        is_correct = (answer.strip().lower() == q.correct_answer.strip().lower())
    else:
        eval_res = evaluate_free_text_answer(ch.language, q.question_text, q.correct_answer, answer)
        is_correct = eval_res["is_correct"]
        
    if is_correct:
        # 100 points base. Time bonus could be added here if we tracked when the question was served
        points = 100
        
    ans_record = ChallengeAnswer(
        challenge_id=challenge_id,
        participant_id=participant_id,
        question_id=question_id,
        submitted_answer=answer,
        is_correct=1 if is_correct else 0,
        points_awarded=points
    )
    db.add(ans_record)
    
    # Update participant score
    p = db.query(ChallengeParticipant).filter(ChallengeParticipant.id == participant_id).first()
    if p:
        p.score += points
        
    db.commit()
    
    # Check if participant has reached 10 questions
    ans_count = db.query(ChallengeAnswer).filter(
        ChallengeAnswer.challenge_id == challenge_id,
        ChallengeAnswer.participant_id == participant_id
    ).count()
    
    if ans_count >= 10:
        ch.status = "COMPLETED"
        db.commit()
    
    return {
        "is_correct": is_correct,
        "points_awarded": points,
        "correct_answer": q.correct_answer,
        "explanation": q.explanation
    }

def get_challenge_results(db: Session, challenge_id: str) -> List[Dict[str, Any]]:
    participants = db.query(ChallengeParticipant).filter(ChallengeParticipant.challenge_id == challenge_id).order_by(ChallengeParticipant.score.desc()).all()
    
    results = []
    for idx, p in enumerate(participants):
        ans_stats = db.query(
            func.count(ChallengeAnswer.id).label('total'),
            func.sum(ChallengeAnswer.is_correct).label('correct')
        ).filter(ChallengeAnswer.participant_id == p.id).first()
        
        results.append({
            "participant_id": p.id,
            "nickname": p.nickname,
            "score": p.score,
            "rank": idx + 1,
            "correct_answers": ans_stats.correct or 0,
            "total_answers": ans_stats.total or 0
        })
    return results
