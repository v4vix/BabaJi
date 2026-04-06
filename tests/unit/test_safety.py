from services.api.app.safety import citation_mode, validate_ayurveda_prompt, validate_ritual_prompt


def test_ayurveda_blocks_treatment_language() -> None:
    decision = validate_ayurveda_prompt("Give me dosage to cure a disease")
    assert decision.allowed is False


def test_ritual_blocks_unsafe_language() -> None:
    decision = validate_ritual_prompt("Share violent ritual")
    assert decision.allowed is False


def test_citation_mode() -> None:
    assert citation_mode(2) == "cortex-grounded"
    assert citation_mode(0) == "general-guidance"
