import json
import logging
import random
from typing import List, Dict, Any, Optional
from services.gemini_service import invoke_direct_llm
from schemas.challenge import GeneratedQuestion

logger = logging.getLogger("ammachi.challenge_ai")

# ----------------------------------------------------
# LANGUAGE CONFIGURATION
# ----------------------------------------------------
LANGUAGES = {
    "ta": {"name": "Tamil", "native_name": "தமிழ்"},
    "hi": {"name": "Hindi", "native_name": "हिन्दी"},
    "te": {"name": "Telugu", "native_name": "తెలుగు"},
    "ml": {"name": "Malayalam", "native_name": "മലയാളം"}
}

def get_language_name(code: str) -> str:
    return LANGUAGES.get(code, LANGUAGES.get("ta"))["name"]

# ----------------------------------------------------
# QUESTION GENERATION
# ----------------------------------------------------
import os
import requests

def _call_groq_direct(system_prompt: str) -> Optional[str]:
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key: return None
    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": "openai/gpt-oss-120b",
            "messages": [{"role": "system", "content": system_prompt}],
            "temperature": 0.5,
            "max_tokens": 4000
        }
        res = requests.post(url, headers={"Authorization": f"Bearer {groq_key}"}, json=payload, timeout=10)
        if res.status_code == 200:
            return res.json()["choices"][0]["message"]["content"]
        else:
            logger.error(f"Groq API Error {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"Groq direct call exception: {e}")
    return None

def _call_gemini_direct(system_prompt: str) -> Optional[str]:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key: return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={gemini_key}"
        payload = {"contents": [{"parts": [{"text": system_prompt}]}]}
        res = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=10)
        if res.status_code == 200:
            return res.json()["candidates"][0]["content"]["parts"][0]["text"]
        else:
            logger.error(f"Gemini API Error {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"Gemini direct call exception: {e}")
    return None

def _robust_llm_call(prompt: str) -> Optional[str]:
    # Try Groq first as it's very fast, fallback to Gemini
    res = _call_groq_direct(prompt)
    if not res:
        res = _call_gemini_direct(prompt)
    return res

def generate_questions_batch(language_code: str, difficulty: str, count: int = 5) -> List[GeneratedQuestion]:
    lang_name = get_language_name(language_code)
    
    system_prompt = f"""You are an expert {lang_name} language and culture teacher. 
Generate exactly 10 multiple-choice questions for difficulty: {difficulty}.

CRITICAL RULES:
1. Generate exactly 5 Language/Vocabulary questions (e.g. translation, grammar).
2. Generate exactly 5 Cultural/General Knowledge questions about {lang_name} culture, history, or geography.
3. ALL questions MUST be asked in English.
4. For Language questions, options MUST be in the {lang_name} native script.
5. For Culture questions, options can be in English or {lang_name} as appropriate.
6. Output must be exactly a JSON array of 10 objects.
7. The objects must strictly follow this schema:
[
  {{
      "type": "multiple_choice",
      "category": "Language", 
      "question": "string - The question text in English",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": "The correct option exactly as written",
      "explanation": "Short explanation in English"
  }}
]
Return ONLY valid JSON. No markdown formatting, no comments.
"""
    
    for attempt in range(3):
        try:
            logger.info(f"Generating questions (attempt {attempt+1}) for {lang_name} - {difficulty}")
            response_text = _robust_llm_call(system_prompt)
            
            if not response_text:
                continue
                
            response_text = response_text.strip()
            if response_text.startswith("```json"): response_text = response_text[7:]
            if response_text.startswith("```"): response_text = response_text[3:]
            if response_text.endswith("```"): response_text = response_text[:-3]
                
            data = json.loads(response_text)
            
            if not isinstance(data, list):
                continue
                
            validated_questions = []
            for item in data:
                if "type" not in item or "question" not in item or "correct_answer" not in item:
                    continue
                if item["type"] == "multiple_choice" and (not item.get("options") or len(item["options"]) < 2):
                    continue
                if item["type"] == "multiple_choice" and item["correct_answer"] not in item["options"]:
                    item["options"][0] = item["correct_answer"]
                    random.shuffle(item["options"])
                    
                validated_questions.append(GeneratedQuestion(
                    type=item["type"],
                    question=item["question"],
                    options=item.get("options"),
                    correct_answer=item["correct_answer"],
                    explanation=item.get("explanation")
                ))
            
            if len(validated_questions) >= count - 2:
                return validated_questions[:count]
                
        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}")
            
    # Return empty list if LLM fails completely, forcing the game engine to wait/retry
    return []





# ----------------------------------------------------
# FREE-TEXT ANSWER EVALUATION
# ----------------------------------------------------
def evaluate_free_text_answer(language_code: str, question: str, expected: str, submitted: str) -> Dict[str, Any]:
    """
    Use LLM to semantically evaluate free-text answers.
    Returns {"is_correct": bool, "confidence": float, "reason": str}
    """
    lang_name = get_language_name(language_code)
    
    # Deterministic exact or alias match first
    if submitted.strip().lower() == expected.strip().lower():
        return {"is_correct": True, "confidence": 1.0, "reason": "Exact match."}
        
    system_prompt = f"""You are a language evaluator for {lang_name}.
Question: {question}
Expected Answer: {expected}
Student Answer: {submitted}

Evaluate if the student's answer is correct. Allow valid transliterations, minor typos, or synonymous terms if appropriate.
Return ONLY valid JSON:
{{
    "is_correct": true or false,
    "confidence": 0.0 to 1.0,
    "reason": "short explanation"
}}
"""
    
    try:
        response_text = invoke_direct_llm(system_prompt=system_prompt, user_message="Evaluate now.")
        if response_text:
            response_text = response_text.strip()
            if response_text.startswith("```json"): response_text = response_text[7:]
            if response_text.startswith("```"): response_text = response_text[3:]
            if response_text.endswith("```"): response_text = response_text[:-3]
            data = json.loads(response_text)
            return {
                "is_correct": bool(data.get("is_correct", False)),
                "confidence": float(data.get("confidence", 0.5)),
                "reason": str(data.get("reason", ""))
            }
    except Exception as e:
        logger.error(f"Free text evaluation failed: {e}")
        
    # Fallback to simple substring or exact
    return {
        "is_correct": False,
        "confidence": 0.0,
        "reason": "Evaluation failed or answer incorrect."
    }
