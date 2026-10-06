import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ammachi.gemini")


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.8-flash"
)

GEMINI_API_KEY = (
    os.getenv("GEMINI_API_KEY")
    or os.getenv("GOOGLE_API_KEY")
)


GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_llm_client():
    """
    Returns configured Chat model with robust multi-provider fallback.
    """
    # 1. If Groq is configured, use active Groq model
    if GROQ_API_KEY and not GROQ_API_KEY.startswith("your_"):
        for m_name in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama3-70b-8192"]:
            try:
                from langchain_groq import ChatGroq
                return ChatGroq(
                    model_name=m_name,
                    api_key=GROQ_API_KEY,
                    temperature=0.5
                )
            except Exception:
                continue

    # 2. Try Gemini if configured with valid non-sample key
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_") and not GEMINI_API_KEY.startswith("AQ."):
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                google_api_key=GEMINI_API_KEY,
                temperature=0.4
            )
        except Exception as e:
            logger.warning("Google Gemini init error: %s", e)

    return None

def invoke_direct_llm(system_prompt: str, messages_history: list = None, user_message: str = "") -> Optional[str]:
    """
    Direct REST API fallback for Groq and Gemini that works 100% with zero LangChain dependencies
    (requires only standard requests library).
    """
    import requests
    
    # 1. Try Groq via direct HTTP POST with active models
    if GROQ_API_KEY and not GROQ_API_KEY.startswith("your_"):
        chat_msgs = [{"role": "system", "content": system_prompt}]
        if messages_history:
            for m in messages_history:
                chat_msgs.append({"role": m.get("role", "user"), "content": m.get("content", "")})
        chat_msgs.append({"role": "user", "content": user_message})

        for m_name in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound", "llama-3.3-70b-versatile"]:
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": m_name,
                    "messages": chat_msgs,
                    "temperature": 0.5,
                    "max_tokens": 800
                }
                res = requests.post(url, headers=headers, json=payload, timeout=12)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and len(content.strip()) > 10:
                        return content
            except Exception as e:
                logger.warning("Direct Groq REST call (%s) failed: %s", m_name, e)

    # 2. Try Gemini via direct HTTP REST
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_") and not GEMINI_API_KEY.startswith("AQ."):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
            prompt_text = f"System: {system_prompt}\n\nUser: {user_message}"
            payload = {
                "contents": [{"parts": [{"text": prompt_text}]}]
            }
            res = requests.post(url, json=payload, timeout=12)
            if res.status_code == 200:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.warning("Direct Gemini REST call failed: %s", e)
            
    return None

# ============================================================
# HANDWRITING FEEDBACK
# ============================================================

def evaluate_handwriting_with_gemini(
    image_path: str,
    target_text: Optional[str] = None,
    ocr_hint: str = "",
    ocr_confidence: float = 0.0,
    recognition_status: str = "UNCERTAIN",
    language: str = "Tamil",
    mode: str = "general"
) -> Dict[str, Any]:

    target = (target_text or "").strip()
    detected = (ocr_hint or "").strip()

    try:

        # ====================================================
        # CASE 1: UNCERTAIN
        #
        # DO NOT CALL GEMINI.
        #
        # If OCR cannot confidently recognize the character,
        # Gemini should not guess what the child wrote.
        # ====================================================

        if recognition_status == "UNCERTAIN":

            return {
                "detected_text": (
                    detected
                    if detected
                    else "Unclear Writing"
                ),

                "is_correct": False,

                "score": 0,

                "mistake_explanation": (
                    "The handwriting could not be "
                    "recognized confidently."
                ),

                "feedback": (
                    f"Kanna, I couldn't clearly recognize "
                    f"the {language} letter '{target}'. "
                    f"Please make sure the notebook is flat, "
                    f"use good lighting, and take another "
                    f"clear photo."
                )
            }


        # ====================================================
        # CASE 2: NO GEMINI API KEY
        #
        # Provide safe local feedback.
        # ====================================================

        if not GEMINI_API_KEY:

            if recognition_status == "CORRECT":

                return {
                    "detected_text": detected,

                    "is_correct": True,

                    "score": 92,

                    "mistake_explanation": (
                        f"The detected character matches "
                        f"the target '{target}'."
                    ),

                    "feedback": (
                        f"Sabash Kanna! You wrote "
                        f"'{target}' correctly. "
                        f"Wonderful practice!"
                    )
                }

            return {
                "detected_text": detected,

                "is_correct": False,

                "score": 30,

                "mistake_explanation": (
                    f"The detected character '{detected}' "
                    f"does not match the target "
                    f"'{target}'."
                ),

                "feedback": (
                    f"Good try, Kanna! "
                    f"We are practicing '{target}'. "
                    f"Let's try it once more."
                )
            }


        # ====================================================
        # GEMINI PROMPT
        #
        # Gemini DOES NOT decide correctness.
        # The backend has already decided it.
        # ====================================================

        prompt = f"""
You are "Ammachi", a warm and encouraging grandmother
language tutor for children aged 5-15.

The application's recognition system has already evaluated
the handwriting.

You MUST NOT change the recognition decision.

----------------------------------------
LANGUAGE
----------------------------------------

{language}

----------------------------------------
TARGET CHARACTER
----------------------------------------

{target}

----------------------------------------
OCR RESULT
----------------------------------------

{detected}

----------------------------------------
OCR CONFIDENCE
----------------------------------------

{ocr_confidence:.3f}

----------------------------------------
APPLICATION DECISION
----------------------------------------

{recognition_status}

----------------------------------------
YOUR RESPONSIBILITY
----------------------------------------

Your ONLY responsibility is to generate:

1. A short child-friendly feedback message.
2. A short mistake explanation.

You MUST follow these rules:

- Do NOT change CORRECT to INCORRECT.
- Do NOT change INCORRECT to CORRECT.
- Do NOT change the detected character.
- Do NOT invent a character that is not present
  in the OCR result.
- Do NOT claim that the child wrote an English
  character unless the OCR result explicitly
  contains an English character.
- Do NOT invent stroke-level problems.
- Do NOT claim that a particular curve, loop,
  dot, or stroke is wrong unless it can be
  reliably established.
- Keep the language simple and encouraging.
- Never shame the child.
- Keep the response to 1-2 short sentences.

If the decision is CORRECT:

Praise the child and encourage continued practice.

If the decision is INCORRECT:

Gently explain that the detected character does
not match the target character.

If the decision is UNCERTAIN:

Ask the child to retake the image.

----------------------------------------
OUTPUT
----------------------------------------

Return ONLY valid JSON.

{{
    "feedback": "short child-friendly feedback",
    "mistake_explanation": "short explanation"
}}
"""


        # ====================================================
        # CALL GEMINI
        # ====================================================

        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=GEMINI_API_KEY
        )


        # Read image
        with open(image_path, "rb") as f:
            image_bytes = f.read()


        response = client.models.generate_content(

            model=GEMINI_MODEL,

            contents=[

                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/png"
                ),

                prompt
            ],

            config=types.GenerateContentConfig(

                response_mime_type="application/json"

            )
        )


        # ====================================================
        # PARSE GEMINI RESPONSE
        # ====================================================

        raw_text = (
            response.text or ""
        ).strip()


        if not raw_text:

            raise ValueError(
                "Gemini returned an empty response."
            )


        parsed = json.loads(raw_text)


        feedback = (
            parsed.get("feedback")
            or "Good practice, Kanna! Keep going!"
        )


        mistake_explanation = (
            parsed.get("mistake_explanation")
            or ""
        )


        # ====================================================
        # IMPORTANT:
        #
        # is_correct and score are controlled by BACKEND.
        # Gemini does NOT control them.
        # ====================================================

        is_correct = (
            recognition_status == "CORRECT"
        )


        score = (
            92
            if is_correct
            else 30
        )


        return {

            "detected_text": detected,

            "is_correct": is_correct,

            "score": score,

            "mistake_explanation":
                mistake_explanation,

            "feedback":
                feedback
        }


    # ========================================================
    # GEMINI ERROR
    # ========================================================

    except Exception as e:

        logger.exception(
            "Gemini handwriting feedback failed: %s",
            e
        )


        # -----------------------------------------------
        # Safe fallback
        # -----------------------------------------------

        if recognition_status == "CORRECT":

            return {

                "detected_text": detected,

                "is_correct": True,

                "score": 92,

                "mistake_explanation": (
                    f"The detected character matches "
                    f"the target '{target}'."
                ),

                "feedback": (
                    f"Sabash Kanna! "
                    f"You wrote '{target}' correctly. "
                    f"Wonderful job!"
                )
            }


        if recognition_status == "INCORRECT":

            return {

                "detected_text": detected,

                "is_correct": False,

                "score": 30,

                "mistake_explanation": (
                    f"The detected character '{detected}' "
                    f"does not match the target "
                    f"'{target}'."
                ),

                "feedback": (
                    f"Good try, Kanna! "
                    f"We are practicing '{target}'. "
                    f"Let's try it once more."
                )
            }


        return {

            "detected_text":
                detected or "Unclear Writing",

            "is_correct": False,

            "score": 0,

            "mistake_explanation": (
                "The handwriting could not be "
                "recognized clearly."
            ),

            "feedback": (
                "Kanna, I couldn't clearly see "
                "the writing. Please take a clearer "
                "photo and try again."
            )
        }