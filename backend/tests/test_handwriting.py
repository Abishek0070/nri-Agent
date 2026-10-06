import unittest
import sys
import os
from unittest.mock import patch, MagicMock
from io import BytesIO
from PIL import Image

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.handwriting_service import evaluate_handwriting, normalize_ocr_character, is_valid_character
from services.handwriting_preprocessor import HandwritingPreprocessor

class TestHandwritingModule(unittest.TestCase):
    
    def setUp(self):
        img = Image.new('RGB', (100, 100), color='white')
        buf = BytesIO()
        img.save(buf, format='PNG')
        self.valid_image_bytes = buf.getvalue()
        
        self.mock_db = MagicMock()
        
        self.mock_letter = MagicMock()
        self.mock_letter.id = 1
        self.mock_letter.language = "Tamil"
        self.mock_letter.character = "அ"
        
        self.mock_query = MagicMock()
        self.mock_filter = MagicMock()
        self.mock_db.query.return_value = self.mock_query
        self.mock_query.filter.return_value = self.mock_filter
        
        def db_filter_side_effect(*args, **kwargs):
            m = MagicMock()
            m.first.return_value = self.mock_letter
            m.all.return_value = [('அ',), ('ஆ',), ('இ',)]
            return m
            
        self.mock_query.filter.side_effect = db_filter_side_effect

    def test_normalize_unicode(self):
        # Test 7. Unicode normalization
        self.assertEqual(normalize_ocr_character(" அ "), "அ")
        
    def test_is_valid_character(self):
        valid_set = {"அ", "ஆ"}
        self.assertTrue(is_valid_character("அ", valid_set))
        self.assertFalse(is_valid_character("8", valid_set))
        self.assertFalse(is_valid_character("", valid_set))

    @patch('services.handwriting_service.BodhanOCRService')
    def test_correct_tamil_character(self, MockOCR):
        # Test 1. Correct Tamil character
        mock_ocr = MockOCR.return_value
        mock_ocr.recognize_character.return_value = ("அ", 0.95)
        
        result = evaluate_handwriting(self.mock_db, 1, self.valid_image_bytes)
        
        self.assertEqual(result["status"], "correct")
        self.assertEqual(result["detected"], "அ")
        self.assertTrue(result["is_correct"])

    @patch('services.handwriting_service.BodhanOCRService')
    def test_wrong_valid_tamil_character(self, MockOCR):
        # Test 2. Wrong valid Tamil character
        mock_ocr = MockOCR.return_value
        mock_ocr.recognize_character.return_value = ("ஆ", 0.90) 
        
        result = evaluate_handwriting(self.mock_db, 1, self.valid_image_bytes)
        
        self.assertEqual(result["status"], "incorrect")
        self.assertEqual(result["detected"], "ஆ")
        self.assertFalse(result["is_correct"])

    @patch('services.handwriting_service.BodhanOCRService')
    def test_unsupported_ocr_returns_unreadable(self, MockOCR):
        # Test 3 & 5. OCR returns "8" for Tamil target (not in valid list)
        mock_ocr = MockOCR.return_value
        mock_ocr.recognize_character.return_value = ("8", 0.50)
        
        result = evaluate_handwriting(self.mock_db, 1, self.valid_image_bytes)
        
        self.assertEqual(result["status"], "unreadable")
        self.assertIsNone(result["detected"])

    @patch('services.handwriting_service.BodhanOCRService')
    def test_ocr_returns_empty(self, MockOCR):
        # Test 4. OCR returns empty string
        mock_ocr = MockOCR.return_value
        mock_ocr.recognize_character.return_value = ("", 0.0)
        
        result = evaluate_handwriting(self.mock_db, 1, self.valid_image_bytes)
        self.assertEqual(result["status"], "unreadable")
        self.assertIsNone(result["detected"])

    @patch('services.handwriting_service.BodhanOCRService')
    def test_ocr_api_failure(self, MockOCR):
        # Test 6. OCR API failure
        mock_ocr = MockOCR.return_value
        mock_ocr.recognize_character.side_effect = Exception("API Timeout")
        
        result = evaluate_handwriting(self.mock_db, 1, self.valid_image_bytes)
        self.assertEqual(result["status"], "ocr_unavailable")
        self.assertIsNone(result["detected"])

    def test_preprocessor_invalid_image(self):
        preprocessor = HandwritingPreprocessor()
        with self.assertRaises(ValueError):
            preprocessor.validate_image(b"not an image")

if __name__ == '__main__':
    unittest.main()
