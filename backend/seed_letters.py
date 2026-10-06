import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db, SessionLocal
from database.handwriting_models import Letter

def seed():
    init_db()
    db = SessionLocal()
    
    # Check if empty
    if db.query(Letter).first():
        print("Letters already seeded.")
        return
        
    letters = [
        {"language": "Tamil", "character": "அ", "unicode_hex": "U+0B85", "letter_type": "vowel", "difficulty": "beginner"},
        {"language": "Tamil", "character": "ஆ", "unicode_hex": "U+0B86", "letter_type": "vowel", "difficulty": "beginner"},
        {"language": "Tamil", "character": "இ", "unicode_hex": "U+0B87", "letter_type": "vowel", "difficulty": "beginner"},
        {"language": "Hindi", "character": "अ", "unicode_hex": "U+0905", "letter_type": "vowel", "difficulty": "beginner"},
        {"language": "Hindi", "character": "आ", "unicode_hex": "U+0906", "letter_type": "vowel", "difficulty": "beginner"},
        {"language": "Telugu", "character": "అ", "unicode_hex": "U+0C05", "letter_type": "vowel", "difficulty": "beginner"},
        {"language": "Malayalam", "character": "അ", "unicode_hex": "U+0D05", "letter_type": "vowel", "difficulty": "beginner"}
    ]
    
    for l in letters:
        db.add(Letter(**l))
        
    db.commit()
    db.close()
    print("Letters seeded.")
    
if __name__ == "__main__":
    seed()
