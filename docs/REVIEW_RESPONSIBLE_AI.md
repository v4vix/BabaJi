# Responsible AI Review

## Findings
- Require strict safety gating for ritual and ayurveda categories.
- Grounded claims should include citations; fallback mode should be explicit.
- High-stakes content must route to professionals.

## Applied fixes
- Added ritual and ayurveda blocklist validation in API.
- Added citation mode labeling (`cortex-grounded` vs `general-guidance`).
- Added licensed-professional escalation messaging for vaastu structural recommendations.
