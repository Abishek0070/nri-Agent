import os
import requests
import base64
from typing import Optional, Tuple

class BodhanOCRService:
    def __init__(self):
        self.api_key = os.getenv("BODHAN_API_KEY")
        self.endpoint = os.getenv("BODHAN_OCR_ENDPOINT")
        
    def recognize_character(self, image_bytes: bytes, language: str) -> Tuple[Optional[str], float]:
        """
        Sends image to Bodhan IndicOCR API.
        Returns: (detected_character, confidence)
        """
        if not self.api_key or not self.endpoint:
            raise ValueError("Bodhan API credentials not configured in environment (BODHAN_API_KEY, BODHAN_OCR_ENDPOINT).")
        
        try:
            # Convert image to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            data_uri = f"data:image/png;base64,{base64_image}"
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "indic-ocr",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": data_uri
                                }
                            }
                        ]
                    }
                ]
            }
            
            response = requests.post(self.endpoint, headers=headers, json=payload, timeout=15)
            response.raise_for_status()
            
            json_resp = response.json()
            
            detected_char = json_resp["choices"][0]["message"]["content"]
            
            if not detected_char:
                return None, 0.0
                
            return detected_char.strip(), 1.0
            
        except requests.exceptions.Timeout:
            raise ValueError("OCR service timed out. Please try again.")
        except requests.exceptions.RequestException as e:
            print(f"Bodhan API Error: {e}")
            raise ValueError("Failed to reach OCR service.")
        except (KeyError, IndexError, ValueError, TypeError) as e:
            print(f"Bodhan API Malformed Response: {e}")
            raise ValueError("Received malformed response from OCR service.")
