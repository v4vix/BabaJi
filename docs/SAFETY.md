# Safety and Responsible AI

## Domain policies
- Astrology/tarot/numerology: interpretive guidance only, no guarantees.
- Ayurveda: educational only, no diagnosis/treatment/dosing.
- Rituals/tantra: safe non-harmful legal informational guidance only.
- Gemstone: no guaranteed outcomes or coercive upsell.
- Vaastu: informational only; licensed professional required for structural changes.

## Enforcement points
- `services/api/app/safety.py` blocklists for prohibited content classes.
- Citation gate with `cortex-grounded` vs `general-guidance` mode.
- Mandatory disclaimer injection by module.

## Human escalation
- High-stakes medical/legal/structural requests are redirected to licensed professionals.
