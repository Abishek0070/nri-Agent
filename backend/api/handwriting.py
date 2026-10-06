from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from schemas.handwriting import HandwritingEvaluationResponse
from services.handwriting_service import evaluate_handwriting
from api.auth import get_current_user

router = APIRouter()

@router.get("/letters")
def get_letters(language: str, db: Session = Depends(get_db)):
    """Fetch available letters for a language."""
    from database.handwriting_models import Letter
    letters = db.query(Letter).filter(Letter.language == language).all()
    return {"letters": letters}

@router.post("/evaluate", response_model=HandwritingEvaluationResponse)
async def evaluate_handwriting_endpoint(
    letter_id: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Evaluate a handwritten letter image using Bodhan IndicOCR.
    """
    # 1. Validate Image Type
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be an image.")
        
    try:
        contents = await image.read()
        
        # 2. Limit Image Size (e.g., 5MB)
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Maximum size is 5MB.")
            
        user_id = current_user.id if current_user else None
        
        # 3. Process the Evaluation
        result = evaluate_handwriting(db, letter_id, contents, user_id=user_id)
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error evaluating handwriting: {e}")
        raise HTTPException(
            status_code=500, 
            detail="OCR service temporarily unavailable."
        )
