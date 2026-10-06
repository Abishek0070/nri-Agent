import unicodedata
import logging
from sqlalchemy.orm import Session
from database.handwriting_models import Letter, HandwritingAttempt
from services.bodhan_ocr import BodhanOCRService
from services.handwriting_preprocessor import HandwritingPreprocessor

logger = logging.getLogger("ammachi.handwriting")

def normalize_ocr_character(char: str) -> str:
    """
    Normalizes OCR character for comparison using NFC.
    Removes whitespace and standardizes Unicode.
    """
    if not char:
        return ""
    char = unicodedata.normalize('NFC', char)
    return char.strip()

def is_valid_character(char: str, valid_characters: set) -> bool:
    if not char:
        return False
    # If the exact char is in our db of supported characters for this language
    return char in valid_characters

def _create_result(status: str, target: str, detected: str, is_correct: bool, score: int, confidence: float, feedback: str):
    return {
        "success": True,
        "status": status,
        "target": target,
        "detected": detected,
        "is_correct": is_correct,
        "score": score,
        "confidence": confidence,
        "feedback": feedback
    }

def evaluate_handwriting(db: Session, letter_id: int, image_bytes: bytes, user_id: int = None) -> dict:
    # 1. Fetch expected letter
    letter = db.query(Letter).filter(Letter.id == letter_id).first()
    if not letter:
        raise ValueError(f"Letter with ID {letter_id} not found in database.")
        
    expected_char = normalize_ocr_character(letter.character)
    
    # Fetch all valid characters for this language
    all_language_letters = db.query(Letter.character).filter(Letter.language == letter.language).all()
    valid_characters = set([normalize_ocr_character(l[0]) for l in all_language_letters])
    
    preprocessor = HandwritingPreprocessor()
    ocr_service = BodhanOCRService()
    
    # ---------------------------------------------------------
    # PASS 1: Light Preprocessing
    # ---------------------------------------------------------
    try:
        light_image_bytes = preprocessor.preprocess_light(image_bytes)
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return _create_result("unreadable", expected_char, None, False, None, None, "Invalid image format provided.")

    try:
        raw_char_1, conf_1 = ocr_service.recognize_character(light_image_bytes, letter.language)
        char_1 = normalize_ocr_character(raw_char_1)
        valid_1 = is_valid_character(char_1, valid_characters)
        logger.info(f"[Handwriting] Pass 1 - Detected: '{char_1}', Valid: {valid_1}, Conf: {conf_1}")
    except Exception as e:
        logger.error(f"[Handwriting] Pass 1 OCR Error: {e}")
        return _create_result("ocr_unavailable", expected_char, None, False, None, None, "I couldn't check the image right now. Please try again.")

    # If pass 1 is a valid character, use it!
    if valid_1:
        detected_char = char_1
        confidence = conf_1
    else:
        # ---------------------------------------------------------
        # PASS 2: Heavy Preprocessing (fallback)
        # ---------------------------------------------------------
        try:
            heavy_image_bytes = preprocessor.preprocess_heavy(image_bytes)
            raw_char_2, conf_2 = ocr_service.recognize_character(heavy_image_bytes, letter.language)
            char_2 = normalize_ocr_character(raw_char_2)
            valid_2 = is_valid_character(char_2, valid_characters)
            logger.info(f"[Handwriting] Pass 2 - Detected: '{char_2}', Valid: {valid_2}, Conf: {conf_2}")
            
            if valid_2:
                detected_char = char_2
                confidence = conf_2
            else:
                detected_char = None
                confidence = conf_2 if char_2 else conf_1
        except Exception as e:
            logger.error(f"[Handwriting] Pass 2 failed: {e}")
            detected_char = None
            confidence = conf_1

    # ---------------------------------------------------------
    # FINAL EVALUATION
    # ---------------------------------------------------------
    if not detected_char:
        result = _create_result(
            "unreadable", expected_char, None, False, None, confidence,
            "I couldn't recognize the letter clearly. Try taking a clearer photo."
        )
    elif detected_char == expected_char:
        result = _create_result(
            "correct", expected_char, detected_char, True, 100, confidence,
            f"Great job! You wrote {expected_char} correctly."
        )
    else:
        # Valid but wrong character
        result = _create_result(
            "incorrect", expected_char, detected_char, False, 0, confidence,
            f"You wrote {detected_char}. Expected {expected_char}. Try again."
        )

    # ---------------------------------------------------------
    # LOG ATTEMPT
    # ---------------------------------------------------------
    try:
        attempt = HandwritingAttempt(
            user_id=user_id,
            letter_id=letter_id,
            is_correct=result.get("is_correct", False),
            score=result.get("score"),
            detected_char=detected_char
        )
        db.add(attempt)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to log handwriting attempt: {e}")

    return result
