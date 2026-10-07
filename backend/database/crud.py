import os
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
except Exception:
    pwd_context = None

DB_FILE = os.getenv("DB_FILE", "ammachi.db")

def hash_password(password: str) -> str:
    if pwd_context:
        return pwd_context.hash(password)
    salt = secrets.token_hex(8)
    hash_val = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"sha256${salt}${hash_val}"

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password or not plain_password:
        return False
    if pwd_context and not hashed_password.startswith("sha256$"):
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass
    if hashed_password.startswith("sha256$"):
        parts = hashed_password.split("$")
        if len(parts) == 3:
            salt = parts[1]
            check = hashlib.sha256((plain_password + salt).encode()).hexdigest()
            return check == parts[2]
    return plain_password == hashed_password

class UserRecord:
    def __init__(self, id, username, password_hash=None, google_id=None, points=0, current_language="Tamil"):
        self.id = id
        self.username = username
        self.password_hash = password_hash
        self.google_id = google_id
        self.points = points
        self.current_language = current_language
        self.stamps = []

def get_user_by_username(db, username: str):
    # 1. SQLAlchemy ORM (PostgreSQL or SQLite)
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import User
            if User:
                return db.query(User).filter(User.username == username).first()
        except Exception as e:
            pass

    # 2. SQLite Direct Fallback
    if os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, username, password_hash, google_id, points, current_language FROM users WHERE username=?", (username,))
        row = c.fetchone()
        conn.close()
        if row:
            u = UserRecord(row[0], row[1], row[2], row[3], row[4], row[5])
            conn = sqlite3.connect(DB_FILE)
            c2 = conn.cursor()
            c2.execute("SELECT id, stamp_name, badge_icon, earned_at FROM cultural_stamps WHERE user_id=?", (u.id,))
            class StampObj:
                def __init__(self, id, name, icon, earned_at):
                    self.id = id
                    self.stamp_name = name
                    self.badge_icon = icon
                    self.earned_at = datetime.fromisoformat(earned_at) if isinstance(earned_at, str) else earned_at
            u.stamps = [StampObj(r[0], r[1], r[2], r[3]) for r in c2.fetchall()]
            conn.close()
            return u
    return None

def get_user_by_google_id(db, google_id: str):
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import User
            if User:
                return db.query(User).filter(User.google_id == google_id).first()
        except Exception:
            pass

    if os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT username FROM users WHERE google_id=?", (google_id,))
        row = c.fetchone()
        conn.close()
        if row:
            return get_user_by_username(db, row[0])
    return None

def link_google_id_to_user(db, user_id: int, google_id: str):
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import User
            if User:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.google_id = google_id
                    db.commit()
                    db.refresh(user)
                    return user
        except Exception:
            db.rollback()

    if os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE users SET google_id=? WHERE id=?", (google_id, user_id))
        conn.commit()
        conn.close()
    return None

def create_user(db, username: str, password: Optional[str] = None, google_id: Optional[str] = None, current_language: str = "Tamil"):
    hashed_pwd = hash_password(password) if password else None

    # 1. SQLAlchemy ORM
    if hasattr(db, "add") and db is not None:
        try:
            from database.models import User
            if User:
                user = User(
                    username=username,
                    password_hash=hashed_pwd,
                    google_id=google_id,
                    points=0,
                    current_language=current_language
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                return user
        except Exception:
            db.rollback()

    # 2. SQLite Direct Fallback
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO users (username, password_hash, google_id, points, current_language) VALUES (?, ?, ?, ?, ?)",
              (username, hashed_pwd, google_id, 0, current_language))
    user_id = c.lastrowid
    conn.commit()
    conn.close()
    return UserRecord(user_id, username, hashed_pwd, google_id, 0, current_language)

def update_user_language(db, user_id: int, language: str):
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import User
            if User:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.current_language = language
                    db.commit()
                    db.refresh(user)
                    return user
        except Exception:
            db.rollback()

    if os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE users SET current_language=? WHERE id=?", (language, user_id))
        conn.commit()
        conn.close()
    return get_user_by_username(db, "student")

def update_user_points_and_stamp(db, username: str, points_to_add: int = 0, stamp_name: Optional[str] = None, badge_icon: str = "🪔"):
    # 1. SQLAlchemy ORM
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import User, CulturalStamp
            if User and CulturalStamp:
                user = db.query(User).filter(User.username == username).first()
                if user:
                    user.points = (user.points or 0) + max(0, points_to_add)
                    new_stamp = False
                    if stamp_name:
                        existing = db.query(CulturalStamp).filter(
                            CulturalStamp.user_id == user.id,
                            CulturalStamp.stamp_name == stamp_name
                        ).first()
                        if not existing:
                            stamp = CulturalStamp(
                                user_id=user.id,
                                stamp_name=stamp_name,
                                badge_icon=badge_icon
                            )
                            db.add(stamp)
                            new_stamp = True

                    db.commit()
                    db.refresh(user)
                    stamps_list = [s.stamp_name for s in user.stamps]
                    return {
                        "points": user.points,
                        "stamps": stamps_list,
                        "new_stamp_earned": new_stamp
                    }
        except Exception as e:
            db.rollback()

    # 2. SQLite Direct Fallback
    user = get_user_by_username(db, username)
    if not user:
        return {"points": 0, "stamps": [], "new_stamp_earned": False}

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    new_points = (user.points or 0) + max(0, points_to_add)
    c.execute("UPDATE users SET points=? WHERE id=?", (new_points, user.id))

    new_stamp = False
    if stamp_name:
        c.execute("SELECT id FROM cultural_stamps WHERE user_id=? AND stamp_name=?", (user.id, stamp_name))
        if not c.fetchone():
            c.execute("INSERT INTO cultural_stamps (user_id, stamp_name, badge_icon) VALUES (?, ?, ?)",
                      (user.id, stamp_name, badge_icon))
            new_stamp = True

    conn.commit()
    c.execute("SELECT stamp_name FROM cultural_stamps WHERE user_id=?", (user.id,))
    stamps = [r[0] for r in c.fetchall()]
    conn.close()

    return {
        "points": new_points,
        "stamps": stamps,
        "new_stamp_earned": new_stamp
    }

def log_learning_progress(db, user_id: int, module: str, activity: str, score: int, language: str = "Tamil"):
    # 1. SQLAlchemy ORM
    if hasattr(db, "add") and db is not None:
        try:
            from database.models import LearningProgress
            if LearningProgress:
                prog = LearningProgress(
                    user_id=user_id,
                    module=module,
                    activity=activity,
                    score=score,
                    language=language
                )
                db.add(prog)
                db.commit()
                db.refresh(prog)
                return prog.id
        except Exception:
            db.rollback()

    # 2. SQLite Direct Fallback
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO learning_progress (user_id, module, activity, score, language) VALUES (?, ?, ?, ?, ?)",
              (user_id, module, activity, score, language))
    progress_id = c.lastrowid
    conn.commit()
    conn.close()
    return progress_id

def get_user_progress_summary(db, user):
    # 1. SQLAlchemy ORM
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import User, LearningProgress, CulturalStamp
            if User and LearningProgress:
                u = db.query(User).filter(User.id == user.id).first()
                if u:
                    progress_records = db.query(LearningProgress).filter(LearningProgress.user_id == u.id).order_by(LearningProgress.id.desc()).all()
                    stamp_records = db.query(CulturalStamp).filter(CulturalStamp.user_id == u.id).all()

                    writing_scores = [p.score for p in progress_records if p.module == "writing"]
                    speaking_scores = [p.score for p in progress_records if p.module == "voice"]
                    culture_scores = [p.score for p in progress_records if p.module == "culture"]

                    writing_score = int(sum(writing_scores) / len(writing_scores)) if writing_scores else 0
                    speaking_score = int(sum(speaking_scores) / len(speaking_scores)) if speaking_scores else 0
                    culture_score = int(sum(culture_scores) / len(culture_scores)) if culture_scores else 0

                    total_acts = len(progress_records)
                    overall_progress = int((writing_score + speaking_score + culture_score) / 3) if total_acts > 0 else 0

                    stamps = [{"stamp_name": s.stamp_name, "badge_icon": s.badge_icon, "earned_at": str(s.earned_at)} for s in stamp_records]
                    recent = [
                        {
                            "id": p.id,
                            "module": p.module,
                            "activity": p.activity,
                            "score": p.score,
                            "language": p.language,
                            "created_at": str(p.created_at)
                        }
                        for p in progress_records[:10]
                    ]

                    return {
                        "username": u.username,
                        "avatar_url": getattr(u, "avatar_url", None),
                        "points": u.points or 0,
                        "current_language": u.current_language or "Tamil",
                        "streak": max(1, 1 if (u.points or 0) > 0 else 0),
                        "overall_progress": overall_progress,
                        "writing_score": writing_score,
                        "speaking_score": speaking_score,
                        "culture_score": culture_score,
                        "total_activities": total_acts,
                        "badges_count": len(stamps),
                        "stamps": stamps,
                        "recent_activities": recent
                    }
        except Exception as e:
            pass

    # 2. SQLite Direct Fallback
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, module, activity, score, language, created_at FROM learning_progress WHERE user_id=? ORDER BY id DESC", (user.id,))
    rows = c.fetchall()

    writing_scores = [r[3] for r in rows if r[1] == "writing"]
    speaking_scores = [r[3] for r in rows if r[1] == "voice"]
    culture_scores = [r[3] for r in rows if r[1] == "culture"]

    writing_score = int(sum(writing_scores) / len(writing_scores)) if writing_scores else 0
    speaking_score = int(sum(speaking_scores) / len(speaking_scores)) if speaking_scores else 0
    culture_score = int(sum(culture_scores) / len(culture_scores)) if culture_scores else 0

    total_acts = len(rows)
    overall_progress = int((writing_score + speaking_score + culture_score) / 3) if total_acts > 0 else 0

    c.execute("SELECT stamp_name, badge_icon, earned_at FROM cultural_stamps WHERE user_id=?", (user.id,))
    stamp_rows = c.fetchall()
    stamps = [{"stamp_name": r[0], "badge_icon": r[1], "earned_at": str(r[2])} for r in stamp_rows]

    recent = [
        {
            "id": r[0],
            "module": r[1],
            "activity": r[2],
            "score": r[3],
            "language": r[4],
            "created_at": str(r[5])
        }
        for r in rows[:10]
    ]

    c.execute("SELECT points, current_language, avatar_url FROM users WHERE id=?", (user.id,))
    u_row = c.fetchone()
    points = u_row[0] if u_row else 0
    lang = u_row[1] if u_row else "Tamil"
    avatar_url = u_row[2] if u_row and len(u_row) > 2 else None
    conn.close()

    return {
        "username": user.username,
        "avatar_url": avatar_url,
        "points": points,
        "current_language": lang,
        "streak": max(1, 1 if points > 0 else 0),
        "overall_progress": overall_progress,
        "writing_score": writing_score,
        "speaking_score": speaking_score,
        "culture_score": culture_score,
        "total_activities": total_acts,
        "badges_count": len(stamps),
        "stamps": stamps,
        "recent_activities": recent
    }

def update_user_avatar(db, user_id: int, avatar_url: str):
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import User
            if User:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.avatar_url = avatar_url
                    db.commit()
                    db.refresh(user)
                    return user
        except Exception:
            db.rollback()

    if os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE users SET avatar_url=? WHERE id=?", (avatar_url, user_id))
        conn.commit()
        conn.close()
    return get_user_by_username(db, "student")

def log_learning_session(db, user_id: int, module: str, score: int, session_metadata: Dict[str, Any]):
    if hasattr(db, "add") and db is not None:
        try:
            from database.models import LearningSession
            if LearningSession:
                session = LearningSession(
                    user_id=user_id,
                    module=module,
                    score=score,
                    session_metadata=session_metadata
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                return session.id
        except Exception:
            db.rollback()

    if os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO learning_sessions (user_id, module, score, session_metadata) VALUES (?, ?, ?, ?)",
                  (user_id, module, score, json.dumps(session_metadata)))
        sid = c.lastrowid
        conn.commit()
        conn.close()
        return sid
    return None

def get_user_handwriting_stats(db, user_id: int) -> Dict[str, Any]:
    writing_records = []
    if hasattr(db, "query") and db is not None:
        try:
            from database.models import LearningProgress
            if LearningProgress:
                records = db.query(LearningProgress).filter(
                    LearningProgress.user_id == user_id,
                    LearningProgress.module == "writing"
                ).order_by(LearningProgress.id.desc()).all()
                writing_records = [
                    {
                        "id": r.id,
                        "activity": r.activity,
                        "score": r.score,
                        "language": r.language,
                        "created_at": str(r.created_at)
                    }
                    for r in records
                ]
        except Exception:
            pass

    if not writing_records and os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, activity, score, language, created_at FROM learning_progress WHERE user_id=? AND module='writing' ORDER BY id DESC", (user_id,))
        writing_records = [
            {
                "id": r[0],
                "activity": r[1],
                "score": r[2],
                "language": r[3],
                "created_at": str(r[4])
            }
            for r in c.fetchall()
        ]
        conn.close()

    total_attempts = len(writing_records)
    scores = [r["score"] for r in writing_records]
    avg_score = int(sum(scores) / total_attempts) if total_attempts > 0 else 0
    best_score = max(scores) if scores else 0

    # Group scores by character
    char_scores = {}
    for r in writing_records:
        act = r["activity"]
        char = act.replace("Handwriting:", "").strip() if "Handwriting:" in act else act
        if char not in char_scores:
            char_scores[char] = []
        char_scores[char].append(r["score"])

    mastered_chars = []
    weak_chars = []
    best_char = None
    best_char_score = 0

    for char, s_list in char_scores.items():
        max_s = max(s_list)
        avg_s = sum(s_list) / len(s_list)
        if max_s >= 85:
            mastered_chars.append({"char": char, "score": max_s, "attempts": len(s_list)})
        if avg_s < 70 or max_s < 75:
            weak_chars.append({"char": char, "avg_score": int(avg_s), "attempts": len(s_list)})
        if max_s > best_char_score:
            best_char_score = max_s
            best_char = char

    improvement = 0
    if len(scores) >= 5:
        first_avg = sum(scores[-3:]) / 3
        recent_avg = sum(scores[:3]) / 3
        improvement = int(recent_avg - first_avg)

    return {
        "total_attempts": total_attempts,
        "practiced_count": len(char_scores),
        "mastered_count": len(mastered_chars),
        "avg_score": avg_score,
        "best_score": best_score,
        "best_character": best_char or "अ",
        "best_character_score": best_char_score,
        "mastered_characters": mastered_chars,
        "weak_characters": weak_chars,
        "improvement_pct": max(0, improvement),
        "recent_attempts": writing_records[:10]
    }

