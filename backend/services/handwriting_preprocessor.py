import io
import numpy as np
import cv2
from PIL import Image, ImageOps

class HandwritingPreprocessor:
    def __init__(self):
        pass
        
    def validate_image(self, image_bytes: bytes) -> Image.Image:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            image = Image.open(io.BytesIO(image_bytes))
            return image
        except Exception as e:
            raise ValueError("Invalid image file provided.")

    def correct_orientation(self, image: Image.Image) -> Image.Image:
        """Corrects orientation using EXIF data."""
        try:
            return ImageOps.exif_transpose(image)
        except Exception:
            return image

    def resize_for_ocr(self, image: Image.Image, max_dimension: int = 1024) -> Image.Image:
        """Resizes image to a reasonable size for OCR to avoid huge payload."""
        width, height = image.size
        if width > max_dimension or height > max_dimension:
            ratio = max_dimension / max(width, height)
            new_size = (int(width * ratio), int(height * ratio))
            return image.resize(new_size, Image.Resampling.LANCZOS)
        return image

    def _pil_to_cv2(self, pil_image: Image.Image) -> np.ndarray:
        open_cv_image = np.array(pil_image.convert('RGB'))
        return open_cv_image[:, :, ::-1].copy()

    def _cv2_to_pil(self, cv_image: np.ndarray) -> Image.Image:
        cv_image_rgb = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        return Image.fromarray(cv_image_rgb)

    def preprocess_light(self, image_bytes: bytes) -> bytes:
        """
        Light pass: Validate, correct EXIF orientation, resize.
        Does not destroy text features.
        """
        img = self.validate_image(image_bytes)
        img = self.correct_orientation(img)
        img = self.resize_for_ocr(img)
        
        output = io.BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()

    def preprocess_heavy(self, image_bytes: bytes) -> bytes:
        """
        Heavy pass: Adaptive thresholding to handle uneven lighting and shadows.
        Conservative approach to avoid destroying handwriting.
        """
        img = self.validate_image(image_bytes)
        img = self.correct_orientation(img)
        img = self.resize_for_ocr(img)
        
        cv_img = self._pil_to_cv2(img)
        
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        
        # Normalize contrast / illumination
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        contrast_enhanced = clahe.apply(gray)
        
        # Adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            contrast_enhanced, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            31, 15
        )
        
        processed_pil = Image.fromarray(thresh)
        output = io.BytesIO()
        processed_pil.save(output, format='PNG')
        return output.getvalue()
