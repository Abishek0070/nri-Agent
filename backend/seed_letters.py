import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db, SessionLocal
from database.handwriting_models import Letter

def seed():
    init_db()
    db = SessionLocal()
    
    # Delete existing to allow re-seeding
    db.query(Letter).delete()
    db.commit()
    print("Cleared existing letters.")
        
    letters = []
    
    # Tamil Vowels & Consonants
    tamil_vowels = ["அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ"]
    tamil_consonants = ["க", "ங", "ச", "ஞ", "ட", "ண", "த", "ந", "ப", "ம", "ய", "ர", "ல", "வ", "ழ", "ள", "ற", "ன"]
    for c in tamil_vowels:
        letters.append({"language": "Tamil", "character": c, "letter_type": "vowel", "difficulty": "beginner"})
    for c in tamil_consonants:
        letters.append({"language": "Tamil", "character": c, "letter_type": "consonant", "difficulty": "intermediate"})
        
    # Hindi Vowels & Consonants
    hindi_vowels = ["अ", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ए", "ऐ", "ओ", "औ", "अं", "अः"]
    hindi_consonants = ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श", "ष", "स", "ह"]
    for c in hindi_vowels:
        letters.append({"language": "Hindi", "character": c, "letter_type": "vowel", "difficulty": "beginner"})
    for c in hindi_consonants:
        letters.append({"language": "Hindi", "character": c, "letter_type": "consonant", "difficulty": "intermediate"})

    # Telugu Vowels & Consonants
    telugu_vowels = ["అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఋ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ", "అం", "అః"]
    telugu_consonants = ["క", "ఖ", "గ", "ఘ", "ఙ", "చ", "ఛ", "జ", "ఝ", "ఞ", "ట", "ఠ", "డ", "ఢ", "ణ", "త", "థ", "ద", "ధ", "న", "ప", "ఫ", "బ", "భ", "మ", "య", "ర", "ల", "వ", "శ", "ష", "స", "హ", "ళ", "క్ష", "ఱ"]
    for c in telugu_vowels:
        letters.append({"language": "Telugu", "character": c, "letter_type": "vowel", "difficulty": "beginner"})
    for c in telugu_consonants:
        letters.append({"language": "Telugu", "character": c, "letter_type": "consonant", "difficulty": "intermediate"})

    # Malayalam Vowels & Consonants
    malayalam_vowels = ["അ", "ആ", "ഇ", "ഈ", "ഉ", "ഊ", "ഋ", "എ", "ഏ", "ഐ", "ഒ", "ഓ", "ഔ", "അം", "അഃ"]
    malayalam_consonants = ["ക", "ഖ", "ഗ", "ഘ", "ങ", "ച", "ഛ", "ജ", "ഝ", "ഞ", "ട", "ഠ", "ഡ", "ഢ", "ണ", "ത", "ഥ", "ദ", "ധ", "ന", "പ", "ഫ", "ബ", "ഭ", "മ", "യ", "ര", "ല", "വ", "ശ", "ഷ", "സ", "ഹ", "ള", "ഴ", "റ"]
    for c in malayalam_vowels:
        letters.append({"language": "Malayalam", "character": c, "letter_type": "vowel", "difficulty": "beginner"})
    for c in malayalam_consonants:
        letters.append({"language": "Malayalam", "character": c, "letter_type": "consonant", "difficulty": "intermediate"})

    for l in letters:
        l["unicode_hex"] = " ".join(f"U+{ord(c):04X}" for c in l["character"])
        db.add(Letter(**l))
        
    db.commit()
    db.close()
    print(f"Successfully seeded {len(letters)} letters.")
    
if __name__ == "__main__":
    seed()
