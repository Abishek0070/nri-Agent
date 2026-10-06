from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from database.connection import Base

class Letter(Base):
    __tablename__ = 'letters'
    id = Column(Integer, primary_key=True, index=True)
    language = Column(String(50), nullable=False)
    character = Column(String(10), nullable=False)
    unicode_hex = Column(String(20))
    letter_type = Column(String(50)) # e.g. 'vowel', 'consonant'
    difficulty = Column(String(50)) # e.g. 'beginner'
    created_at = Column(DateTime, server_default=func.now())

class HandwritingAttempt(Base):
    __tablename__ = 'handwriting_attempts'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    letter_id = Column(Integer, ForeignKey("letters.id"))
    is_correct = Column(Boolean, default=False)
    score = Column(Integer, nullable=True)
    detected_char = Column(String(10), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
