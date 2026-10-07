from datetime import datetime

try:
    from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
    from sqlalchemy.orm import relationship
    from database.connection import Base

    if Base is not None:
        class User(Base):
            __tablename__ = "users"

            id = Column(Integer, primary_key=True, index=True)
            username = Column(String(100), unique=True, index=True, nullable=False)
            password_hash = Column(String(255), nullable=True)
            google_id = Column(String(255), unique=True, index=True, nullable=True)
            points = Column(Integer, default=0)
            current_language = Column(String(50), default="Tamil")
            avatar_url = Column(String(500), nullable=True)
            created_at = Column(DateTime, default=datetime.utcnow)
            updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

            # Relationships
            progress_records = relationship("LearningProgress", back_populates="user", cascade="all, delete-orphan")
            stamps = relationship("CulturalStamp", back_populates="user", cascade="all, delete-orphan")
            sessions = relationship("LearningSession", back_populates="user", cascade="all, delete-orphan")

        class LearningProgress(Base):
            __tablename__ = "learning_progress"

            id = Column(Integer, primary_key=True, index=True)
            user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
            module = Column(String(50), nullable=False)  # 'writing', 'voice', 'culture'
            activity = Column(String(150), nullable=False)  # e.g., 'Letter அ Tracing', 'Pongal Quiz'
            score = Column(Integer, default=0)
            language = Column(String(50), default="Tamil")
            created_at = Column(DateTime, default=datetime.utcnow)

            user = relationship("User", back_populates="progress_records")

        class CulturalStamp(Base):
            __tablename__ = "cultural_stamps"

            id = Column(Integer, primary_key=True, index=True)
            user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
            stamp_name = Column(String(100), nullable=False)
            badge_icon = Column(String(100), default="🪔")
            earned_at = Column(DateTime, default=datetime.utcnow)

            user = relationship("User", back_populates="stamps")

        class LearningSession(Base):
            __tablename__ = "learning_sessions"

            id = Column(Integer, primary_key=True, index=True)
            user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
            module = Column(String(50), nullable=False)
            score = Column(Integer, default=0)
            session_metadata = Column(JSON, nullable=True)
            created_at = Column(DateTime, default=datetime.utcnow)

            user = relationship("User", back_populates="sessions")

        # ====================================================
        # AMMACHI CHALLENGE MODELS
        # ====================================================

        class Challenge(Base):
            __tablename__ = "challenges"

            id = Column(String(20), primary_key=True, index=True) # E.g., 'K7X92P'
            language = Column(String(50), nullable=False)
            difficulty = Column(String(50), nullable=False)
            status = Column(String(20), default="WAITING") # WAITING, ACTIVE, COMPLETED
            created_at = Column(DateTime, default=datetime.utcnow)
            start_time = Column(DateTime, nullable=True)
            end_time = Column(DateTime, nullable=True)

            participants = relationship("ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")
            questions = relationship("ChallengeQuestion", back_populates="challenge", cascade="all, delete-orphan")
            answers = relationship("ChallengeAnswer", back_populates="challenge", cascade="all, delete-orphan")

        class ChallengeParticipant(Base):
            __tablename__ = "challenge_participants"

            id = Column(Integer, primary_key=True, index=True)
            challenge_id = Column(String(20), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
            nickname = Column(String(50), nullable=False)
            score = Column(Integer, default=0)
            joined_at = Column(DateTime, default=datetime.utcnow)

            challenge = relationship("Challenge", back_populates="participants")
            answers = relationship("ChallengeAnswer", back_populates="participant", cascade="all, delete-orphan")

        class ChallengeQuestion(Base):
            __tablename__ = "challenge_questions"

            id = Column(Integer, primary_key=True, index=True)
            challenge_id = Column(String(20), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
            q_type = Column(String(50), nullable=False) # multiple_choice, translation, etc.
            question_text = Column(String(500), nullable=False)
            options = Column(JSON, nullable=True) # List of strings for MCQ
            correct_answer = Column(String(255), nullable=False)
            explanation = Column(String(500), nullable=True)
            created_at = Column(DateTime, default=datetime.utcnow)

            challenge = relationship("Challenge", back_populates="questions")

        class ChallengeAnswer(Base):
            __tablename__ = "challenge_answers"

            id = Column(Integer, primary_key=True, index=True)
            challenge_id = Column(String(20), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
            participant_id = Column(Integer, ForeignKey("challenge_participants.id", ondelete="CASCADE"), nullable=False)
            question_id = Column(Integer, ForeignKey("challenge_questions.id", ondelete="CASCADE"), nullable=False)
            submitted_answer = Column(String(255), nullable=False)
            is_correct = Column(Integer, default=0) # boolean stored as int for sqlite compat
            points_awarded = Column(Integer, default=0)
            created_at = Column(DateTime, default=datetime.utcnow)

            challenge = relationship("Challenge", back_populates="answers")
            participant = relationship("ChallengeParticipant", back_populates="answers")
    else:
        User = None
        LearningProgress = None
        CulturalStamp = None
        LearningSession = None

except Exception:
    User = None
    LearningProgress = None
    CulturalStamp = None
    LearningSession = None
