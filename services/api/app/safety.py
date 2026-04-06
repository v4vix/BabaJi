from dataclasses import dataclass


AYURVEDA_BLOCKLIST = {
    "dose",
    "dosage",
    "prescription",
    "cure",
    "treat",
    "medicine",
    "medication",
}

RITUAL_BLOCKLIST = {
    "harm",
    "blood",
    "coerce",
    "force",
    "illegal",
    "sexual ritual",
    "violent",
}

MANDATORY_DISCLAIMERS = {
    "astrology": "Astrology guidance is interpretive and for reflection, not guaranteed outcomes.",
    "matchmaking": "Compatibility guidance is informational and cannot guarantee relationship outcomes.",
    "muhurta": "Muhurta windows are advisory and should be applied with practical constraints and judgment.",
    "panchang": "Panchang values are informational for traditional planning, not deterministic guarantees.",
    "tarot": "Tarot guidance is reflective and for personal insight, not deterministic prediction.",
    "numerology": "Numerology content is interpretive guidance and should not be treated as certainty.",
    "mantra": "Mantra suggestions are optional spiritual practices and should remain non-coercive.",
    "rashifal": "Rashifal guidance is informational and should not be used for guaranteed outcomes.",
    "ayurveda": "Ayurveda content here is educational only, not medical diagnosis or treatment.",
    "ritual": "Ritual guidance is limited to safe, legal, non-coercive practices.",
    "gem": "Gemstone suggestions are informational and require due diligence before purchase.",
    "vaastu": "Vaastu guidance is informational and not a substitute for licensed architectural or engineering advice.",
}


@dataclass
class SafetyDecision:
    allowed: bool
    reason: str


def validate_ayurveda_prompt(text: str) -> SafetyDecision:
    lowered = text.lower()
    if any(token in lowered for token in AYURVEDA_BLOCKLIST):
        return SafetyDecision(False, "Medical diagnosis/treatment and dosing guidance is blocked.")
    return SafetyDecision(True, "ok")


def validate_ritual_prompt(text: str) -> SafetyDecision:
    lowered = text.lower()
    if any(token in lowered for token in RITUAL_BLOCKLIST):
        return SafetyDecision(False, "Unsafe or prohibited ritual request detected.")
    return SafetyDecision(True, "ok")


def citation_mode(citations_count: int) -> str:
    return "cortex-grounded" if citations_count > 0 else "general-guidance"
