from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

try:
    import swisseph as swe  # type: ignore
except Exception:  # pragma: no cover
    swe = None


PLANET_IDS = {
    "Sun": 0,
    "Moon": 1,
    "Mercury": 2,
    "Venus": 3,
    "Mars": 4,
    "Jupiter": 5,
    "Saturn": 6,
    "Rahu": 11,
    "Ketu": 12,
}

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

SIGN_NATURE = {
    "Aries": "fiery, cardinal, assertive", "Taurus": "earthy, fixed, grounded",
    "Gemini": "airy, mutable, communicative", "Cancer": "watery, cardinal, nurturing",
    "Leo": "fiery, fixed, expressive", "Virgo": "earthy, mutable, analytical",
    "Libra": "airy, cardinal, harmonising", "Scorpio": "watery, fixed, penetrating",
    "Sagittarius": "fiery, mutable, expansive", "Capricorn": "earthy, cardinal, disciplined",
    "Aquarius": "airy, fixed, unconventional", "Pisces": "watery, mutable, spiritual",
}

LAGNA_DESCRIPTIONS = {
    "Aries": "Mesha Lagna bestows a bold, pioneering temperament. The native is driven, physically energetic, and naturally inclined toward leadership. Mars ruling the ascendant gives courage but also a tendency toward impatience.",
    "Taurus": "Vrishabha Lagna gives a steady, sensual, and materially oriented disposition. Venus ruling the ascendant grants aesthetic appreciation, love of comfort, and a persistent, patient character.",
    "Gemini": "Mithuna Lagna confers intellectual agility, curiosity, and communicative flair. Mercury's rulership amplifies versatility and wit, though it can scatter energy across too many interests simultaneously.",
    "Cancer": "Karkata Lagna brings deep emotional sensitivity, strong family bonds, and intuitive perception. The Moon ruling the ascendant makes the native responsive, nurturing, and cyclically variable in mood.",
    "Leo": "Simha Lagna radiates dignity, charisma, and a natural sense of authority. The Sun's rulership instils pride, creativity, and a desire to shine — the native is drawn toward roles of recognition and leadership.",
    "Virgo": "Kanya Lagna gives a precise, analytical, and service-oriented character. Mercury here favours attention to detail, critical thinking, and a drive to refine and improve systems, health, and craft.",
    "Libra": "Tula Lagna imparts grace, diplomacy, and a refined sense of justice. Venus ruling the ascendant draws the native toward harmonious relationships, beauty, and balanced decision-making.",
    "Scorpio": "Vrischika Lagna bestows penetrating insight, emotional depth, and transformative intensity. Mars (and Ketu) governing this sign give the native resilience, investigative ability, and a powerful hidden will.",
    "Sagittarius": "Dhanu Lagna expresses expansive optimism, philosophical curiosity, and a love of freedom. Jupiter's rulership makes the native idealistic, generous, and drawn toward higher learning and spiritual quests.",
    "Capricorn": "Makara Lagna brings disciplined ambition, patience, and an instinct for long-term strategy. Saturn's rulership confers persistence, responsibility, and a tendency to mature into greater strength over time.",
    "Aquarius": "Kumbha Lagna gives humanitarian idealism, intellectual independence, and a reforming spirit. Saturn's rulership here manifests as principled detachment, innovation, and an ability to work for collective goals.",
    "Pisces": "Meena Lagna confers compassion, spiritual sensitivity, and a receptive, imaginative inner world. Jupiter's rulership blesses the native with empathy, faith, and an ability to dissolve boundaries between self and the sacred.",
}

MOON_SIGN_DESCRIPTIONS = {
    "Aries": "Moon in Aries reflects an emotionally direct, impulsive, and enthusiastic inner world. Needs quick emotional resolution and dislikes prolonged uncertainty.",
    "Taurus": "Moon in Taurus gives emotional steadiness, a love of comfort, and deep loyalty. Needs physical security and predictable rhythms to feel centred.",
    "Gemini": "Moon in Gemini brings intellectual restlessness to emotional life. Needs variety, conversation, and mental stimulation to feel alive and engaged.",
    "Cancer": "Moon in Cancer (its own sign) is deeply intuitive, nurturing, and memory-oriented. Emotional bonds are paramount; home and family form the core of identity.",
    "Leo": "Moon in Leo needs recognition and warmth. Emotionally generous and dramatic, this placement craves appreciation and responds well to heartfelt acknowledgment.",
    "Virgo": "Moon in Virgo processes emotions through analysis and service. Emotional wellbeing is tied to order, usefulness, and refinement in daily routines.",
    "Libra": "Moon in Libra seeks emotional harmony and balance. Relationships are emotionally central; disharmony feels deeply unsettling and must be actively resolved.",
    "Scorpio": "Moon in Scorpio brings emotional intensity, depth, and transformative power. Feelings run deep and often remain hidden; trust, once broken, is slow to rebuild.",
    "Sagittarius": "Moon in Sagittarius needs emotional freedom and philosophical meaning. Restless in constriction, this placement thrives on exploration, inspiration, and idealism.",
    "Capricorn": "Moon in Capricorn controls emotional expression through discipline and restraint. Security is found in achievement and structure rather than emotional effusion.",
    "Aquarius": "Moon in Aquarius processes feelings at an intellectual distance. Needs independence, causes greater than self, and the freedom to be unconventional.",
    "Pisces": "Moon in Pisces is empathic, dreamy, and spiritually attuned. Boundaries between self and others are porous; needs solitude and creative outlets to recharge.",
}

DASHA_LORD_MEANINGS = {
    "Sun": "Sun Dasha illuminates themes of identity, authority, and vitality. This is a period for stepping into leadership, strengthening the father relationship or paternal qualities within yourself, and asserting your authentic purpose with confidence.",
    "Moon": "Moon Dasha activates emotional depth, intuition, and domestic life. This period emphasises relationships with the mother, mental fluctuations, and the cultivation of inner security. Travel, public dealings, and matters of water or the psyche come to the fore.",
    "Mars": "Mars Dasha drives ambition, courage, and decisive action. Energy for competition, physical activity, and bold initiatives is high. Property matters, siblings, and confronting fears directly are defining themes of this phase.",
    "Rahu": "Rahu Dasha brings obsessive focus, unconventional desires, and material ambition. Foreign connections, technology, and breaking established patterns feature prominently. Clarity of intent is crucial — Rahu amplifies whatever it touches, including illusions.",
    "Jupiter": "Guru Dasha expands wisdom, dharma, and opportunity. This is often the most auspicious major period — teachers, children, legal matters, higher education, and spiritual growth all flourish. Guard against overconfidence or excess.",
    "Saturn": "Shani Dasha demands discipline, endurance, and long-term thinking. Hard work is rewarded, but shortcuts fail. Service, karmic debts, and confronting limitations are central themes. This period builds the character that later periods express.",
    "Mercury": "Budha Dasha sharpens communication, commerce, and analytical skill. Writing, speaking, business transactions, and learning accelerate. Relationships with siblings and neighbours become significant. Intellectual adaptability is the key asset.",
    "Ketu": "Ketu Dasha turns attention inward toward spirituality, past-life patterns, and detachment. Worldly ambition loses its grip; instead, intuition, moksha-seeking, and healing come forward. Mysterious or sudden events may trigger deep reorientation.",
    "Venus": "Shukra Dasha brings beauty, pleasure, creative abundance, and romantic vitality. Relationships, the arts, luxury, and the feminine principle are highlighted. Material gains come through partnerships and aesthetic endeavours.",
}

NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
    "Shatabhisha", "Purva Bhadra", "Uttara Bhadra", "Revati",
]

TITHI_NAMES = [
    "Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dvadashi", "Trayodashi", "Chaturdashi", "Purnima",
    "Pratipada (K)", "Dvitiya (K)", "Tritiya (K)", "Chaturthi (K)", "Panchami (K)",
    "Shashthi (K)", "Saptami (K)", "Ashtami (K)", "Navami (K)", "Dashami (K)",
    "Ekadashi (K)", "Dvadashi (K)", "Trayodashi (K)", "Chaturdashi (K)", "Amavasya",
]

YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarman", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
    "Indra", "Vaidhriti",
]

KARANA_NAMES = [
    "Bava", "Balava", "Kaulava", "Taitila", "Garija",
    "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna",
]

VARA_NAMES = {
    0: "Somavara (Monday) — Moon's day, favours domestic matters, emotional healing, travel, and connections with women.",
    1: "Mangalavara (Tuesday) — Mars's day, favours bold action, courage, physical endeavours, and resolving conflicts.",
    2: "Budhavara (Wednesday) — Mercury's day, favours commerce, communication, writing, learning, and short journeys.",
    3: "Guruvara (Thursday) — Jupiter's day, favours spiritual practice, education, legal matters, and honouring teachers.",
    4: "Shukravara (Friday) — Venus's day, favours relationships, arts, luxury, beauty, music, and pleasurable pursuits.",
    5: "Shanivara (Saturday) — Saturn's day, favours disciplined work, service, solitude, and long-term planning.",
    6: "Ravivara (Sunday) — Sun's day, favours government dealings, health, authority, soul-work, and visibility.",
}

# Auspicious tithis for muhurta
SHUBHA_TITHIS = {2, 3, 5, 7, 10, 11, 13}

# Nakshatras classified for muhurta
NAKSHATRA_QUALITY: dict[int, str] = {
    # Fixed (Sthira) — favours permanent works
    3: "sthira", 13: "sthira", 26: "sthira", 27: "sthira", 4: "sthira",
    # Soft (Mridu) — favours gentle, auspicious events
    2: "mridu", 5: "mridu", 14: "mridu", 8: "mridu", 11: "mridu",
    # Sharp (Tikshna) — less favoured for auspicious events
    6: "tikshna", 9: "tikshna", 18: "tikshna", 17: "tikshna",
    # Mixed (Mishra)
    0: "laghu", 7: "laghu", 10: "laghu", 15: "laghu", 20: "laghu",
}

VIMSHOTTARI_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
VIMSHOTTARI_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17,
}

# ── Guna Milan tables ─────────────────────────────────────────────────────────

_NAKSHATRA_NADI = [
    "adi", "madhya", "antya", "antya", "madhya", "adi",
    "adi", "madhya", "antya", "antya", "madhya", "adi",
    "adi", "madhya", "antya", "antya", "madhya", "adi",
    "adi", "madhya", "antya", "antya", "madhya", "adi",
    "adi", "madhya", "antya",
]

_NAKSHATRA_GANA = [
    "deva", "manav", "rakshasa", "deva", "deva", "rakshasa",
    "deva", "deva", "rakshasa", "rakshasa", "manav", "manav",
    "deva", "rakshasa", "deva", "rakshasa", "deva", "rakshasa",
    "rakshasa", "manav", "manav", "deva", "rakshasa", "rakshasa",
    "manav", "manav", "deva",
]

_NAKSHATRA_YONI = [
    "horse", "elephant", "sheep", "serpent", "serpent", "dog",
    "cat", "sheep", "cat", "rat", "rat", "cow",
    "buffalo", "tiger", "buffalo", "tiger", "rabbit", "rabbit",
    "dog", "monkey", "mongoose", "monkey", "lion", "horse",
    "lion", "cow", "elephant",
]

YONI_POINTS = {
    frozenset({"horse"}): 4, frozenset({"elephant"}): 4,
    frozenset({"sheep"}): 4, frozenset({"serpent"}): 4,
    frozenset({"dog"}): 4, frozenset({"cat"}): 4,
    frozenset({"rat"}): 4, frozenset({"cow"}): 4,
    frozenset({"buffalo"}): 4, frozenset({"tiger"}): 4,
    frozenset({"rabbit"}): 4, frozenset({"monkey"}): 4,
    frozenset({"lion"}): 4, frozenset({"mongoose"}): 4,
    # Natural enemies give 0
    frozenset({"dog", "rabbit"}): 0, frozenset({"cat", "rat"}): 0,
    frozenset({"lion", "elephant"}): 0, frozenset({"serpent", "mongoose"}): 0,
    frozenset({"monkey", "sheep"}): 0, frozenset({"horse", "buffalo"}): 0,
    frozenset({"tiger", "cow"}): 0,
}

_SIGN_VARNA = {
    "Cancer": 0, "Scorpio": 0, "Pisces": 0,       # Brahmin
    "Aries": 1, "Leo": 1, "Sagittarius": 1,        # Kshatriya
    "Taurus": 2, "Virgo": 2, "Capricorn": 2,       # Vaishya
    "Gemini": 3, "Libra": 3, "Aquarius": 3,        # Shudra
}

# Bhakut compatibility matrix (relative moon-sign distance gives points)
# 1-1 same sign: 7, 1-7 opposition: 7, 6-8: 0, 5-9: 0, 2-12: 0, 3-11: 7
def _bhakut_points(s_idx: int, p_idx: int) -> int:
    diff = abs(s_idx - p_idx) % 12
    if diff == 0:
        return 7
    if diff in (6,):
        return 7  # 1-7 (opposition) also 7 in some systems
    if diff in (5, 7):  # 6-8 count
        return 0
    if diff in (4, 8):  # 5-9 count
        return 0
    if diff in (1, 11):  # 2-12 count
        return 0
    return 7


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class BirthContext:
    local_dt: datetime
    utc_dt: datetime
    latitude: float
    longitude: float


# ── Ephemeris helpers ─────────────────────────────────────────────────────────

def parse_birth_context(birth: dict[str, Any]) -> BirthContext:
    local_dt = datetime.fromisoformat(f"{birth['date']}T{birth['time']}:00").replace(tzinfo=ZoneInfo(birth["timezone"]))
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    return BirthContext(local_dt=local_dt, utc_dt=utc_dt, latitude=float(birth["latitude"]), longitude=float(birth["longitude"]))


def _zodiac_sign_from_degree(deg: float) -> str:
    return SIGNS[int(deg // 30) % 12]


def _house_from_lagna(lagna_deg: float, planet_deg: float) -> int:
    relative = (planet_deg - lagna_deg) % 360
    return int(relative // 30) + 1


def _fallback_degree(seed_base: int, multiplier: int) -> float:
    return float((seed_base * multiplier) % 36000) / 100


def _j2000_days(utc_dt: datetime) -> float:
    """Julian days from J2000.0 epoch (2000-Jan-1 12:00 UTC)."""
    epoch = datetime(2000, 1, 1, 12, 0, tzinfo=ZoneInfo("UTC"))
    return (utc_dt - epoch).total_seconds() / 86400.0


def _lahiri_ayanamsha(jd: float) -> float:
    """Approximate Lahiri ayanamsha in degrees for J2000 day offset."""
    return (23.85 + jd * (50.3 / 3600 / 365.25)) % 360


def _approx_solar_longitude(utc_dt: datetime) -> float:
    """Approximate sidereal solar longitude (Lahiri) — accurate to ~1°."""
    jd = _j2000_days(utc_dt)
    M = math.radians((357.5291 + 0.98560028 * jd) % 360)
    L = (280.4665 + 0.98564736 * jd) % 360
    C = 1.9148 * math.sin(M) + 0.02 * math.sin(2 * M) + 0.0003 * math.sin(3 * M)
    tropical = (L + C) % 360
    return (tropical - _lahiri_ayanamsha(jd)) % 360


def _approx_lunar_longitude(utc_dt: datetime) -> float:
    """Approximate sidereal lunar longitude (Lahiri) — accurate to ~2°."""
    jd = _j2000_days(utc_dt)
    L0 = (218.316 + 13.176396 * jd) % 360
    M_moon = math.radians((134.963 + 13.064993 * jd) % 360)
    M_sun = math.radians((357.5291 + 0.98560028 * jd) % 360)
    D = math.radians((297.850 + 12.190749 * jd) % 360)
    lon = (
        L0
        + 6.289 * math.sin(M_moon)
        - 1.274 * math.sin(2 * D - M_moon)
        + 0.658 * math.sin(2 * D)
        - 0.186 * math.sin(M_sun)
        - 0.059 * math.sin(2 * D - 2 * M_moon)
        - 0.057 * math.sin(2 * D - M_sun - M_moon)
        + 0.053 * math.sin(2 * D + M_moon)
        + 0.046 * math.sin(2 * D - M_sun)
    ) % 360
    return (lon - _lahiri_ayanamsha(jd)) % 360


def _compute_planetary_longitudes(ctx: BirthContext, ayanamsha: str) -> tuple[dict[str, float], float, str]:
    if swe is None:
        seed_base = int(ctx.utc_dt.strftime("%Y%m%d%H%M")) + int((ctx.latitude + 90) * 100) + int((ctx.longitude + 180) * 100)
        planets = {
            "Sun": _fallback_degree(seed_base, 7),
            "Moon": _fallback_degree(seed_base, 13),
            "Mercury": _fallback_degree(seed_base, 17),
            "Venus": _fallback_degree(seed_base, 19),
            "Mars": _fallback_degree(seed_base, 23),
            "Jupiter": _fallback_degree(seed_base, 29),
            "Saturn": _fallback_degree(seed_base, 31),
            "Rahu": _fallback_degree(seed_base, 37),
        }
        planets["Ketu"] = (planets["Rahu"] + 180) % 360
        lagna = _fallback_degree(seed_base, 41)
        return planets, lagna, "fallback"

    hour_decimal = ctx.utc_dt.hour + (ctx.utc_dt.minute / 60) + (ctx.utc_dt.second / 3600)
    jd = swe.julday(ctx.utc_dt.year, ctx.utc_dt.month, ctx.utc_dt.day, hour_decimal)

    if ayanamsha.lower() == "lahiri":
        swe.set_sid_mode(swe.SIDM_LAHIRI)

    houses, ascmc = swe.houses_ex(jd, ctx.latitude, ctx.longitude, b"P", swe.FLG_SIDEREAL)
    lagna = ascmc[0] % 360

    planets: dict[str, float] = {}
    for name, planet_id in PLANET_IDS.items():
        result = swe.calc_ut(jd, planet_id, swe.FLG_SIDEREAL)
        planets[name] = result[0][0] % 360

    return planets, lagna, "swisseph"


def _compute_panchang(local_dt: datetime, sun_deg: float, moon_deg: float) -> dict[str, Any]:
    tithi_num = int(((moon_deg - sun_deg) % 360) // 12)
    nak_num = int((moon_deg % 360) // (360 / 27))
    yoga_num = int(((sun_deg + moon_deg) % 360) // (360 / 27))
    karana_num = int((((moon_deg - sun_deg) % 360) // 6) % 11)
    vara_idx = local_dt.weekday()  # Monday=0, Sunday=6 → remap to Sun=0
    vara_idx_vedic = (vara_idx + 1) % 7  # Sun=0 in Vedic weekday

    tithi_name = TITHI_NAMES[tithi_num % 30]
    nak_name = NAKSHATRA_NAMES[nak_num % 27]
    yoga_name = YOGA_NAMES[yoga_num % 27]
    karana_name = KARANA_NAMES[karana_num % 11]
    vara_name = VARA_NAMES[local_dt.weekday()]

    return {
        "tithi": tithi_name,
        "tithi_num": tithi_num + 1,
        "nakshatra": nak_name,
        "nakshatra_num": nak_num + 1,
        "yoga": yoga_name,
        "yoga_num": yoga_num + 1,
        "karana": karana_name,
        "vara": vara_name.split(" —")[0],  # Short form for API field
        "vara_description": vara_name,
    }


def _varga_house(house: int, division: int) -> int:
    return ((house * division - 1) % 12) + 1


def _compute_vimshottari(local_dt: datetime, moon_deg: float) -> list[dict[str, Any]]:
    nak_index = int((moon_deg % 360) // (360 / 27))
    lord_index = nak_index % len(VIMSHOTTARI_SEQUENCE)
    nak_fraction = (moon_deg % (360 / 27)) / (360 / 27)

    timeline: list[dict[str, Any]] = []
    cursor = local_dt

    current_lord = VIMSHOTTARI_SEQUENCE[lord_index]
    current_years = VIMSHOTTARI_YEARS[current_lord] * (1 - nak_fraction)
    current_end = cursor + timedelta(days=current_years * 365.25)
    timeline.append({
        "lord": current_lord,
        "start": cursor.date().isoformat(),
        "end": current_end.date().isoformat(),
        "years": round(current_years, 2),
    })
    cursor = current_end

    for i in range(1, 6):
        lord = VIMSHOTTARI_SEQUENCE[(lord_index + i) % len(VIMSHOTTARI_SEQUENCE)]
        years = VIMSHOTTARI_YEARS[lord]
        end = cursor + timedelta(days=years * 365.25)
        timeline.append({"lord": lord, "start": cursor.date().isoformat(), "end": end.date().isoformat(), "years": years})
        cursor = end

    return timeline


def _derive_highlights(facts: dict[str, Any]) -> list[str]:
    """Generate chart-specific highlights from actual computed positions."""
    highlights: list[str] = []
    lagna_sign = facts["lagna"]["sign"]
    moon = facts["planet_positions"]["Moon"]
    sun = facts["planet_positions"]["Sun"]
    jupiter = facts["planet_positions"]["Jupiter"]
    saturn = facts["planet_positions"]["Saturn"]
    dasha = facts["vimshottari_timeline"][0]["lord"]

    highlights.append(
        f"{lagna_sign} Lagna: {LAGNA_DESCRIPTIONS.get(lagna_sign, 'A distinctive ascending sign shaping the outer personality and physical constitution.')}"
    )
    highlights.append(
        f"Moon in {moon['sign']} (House {moon['house']}): {MOON_SIGN_DESCRIPTIONS.get(moon['sign'], 'Moon placement shapes emotional responses and habitual patterns.')}"
    )
    highlights.append(f"Current Mahadasha — {dasha}: {DASHA_LORD_MEANINGS.get(dasha, 'This dasha activates the themes of its ruling planet across all life areas.')}")

    # Jupiter placement insight
    jup_house = jupiter["house"]
    highlights.append(
        f"Jupiter in {jupiter['sign']} (House {jup_house}): Jupiter expands the {_house_theme(jup_house)} — wisdom, opportunity, and dharmic growth flow through these areas."
    )
    # Saturn placement insight
    sat_house = saturn["house"]
    highlights.append(
        f"Saturn in {saturn['sign']} (House {sat_house}): Saturn structures and disciplines the {_house_theme(sat_house)} — endurance here yields lasting foundations."
    )

    return highlights


def _house_theme(house: int) -> str:
    themes = {
        1: "self, body, and personality",
        2: "wealth, family, and speech",
        3: "courage, siblings, and short journeys",
        4: "home, mother, and inner happiness",
        5: "intelligence, children, and creativity",
        6: "enemies, health, and service",
        7: "partnerships, marriage, and commerce",
        8: "transformation, longevity, and occult knowledge",
        9: "dharma, fortune, and the father",
        10: "career, status, and public life",
        11: "gains, aspirations, and elder siblings",
        12: "loss, liberation, and spiritual retreat",
    }
    return themes.get(house, "life area")


def compute_kundli_facts(birth: dict[str, Any], *, ayanamsha: str = "Lahiri") -> dict[str, Any]:
    ctx = parse_birth_context(birth)
    planets_deg, lagna_deg, engine_mode = _compute_planetary_longitudes(ctx, ayanamsha)

    planet_positions = {}
    for name, deg in planets_deg.items():
        house = _house_from_lagna(lagna_deg, deg)
        planet_positions[name] = {
            "degree": round(deg, 4),
            "sign": _zodiac_sign_from_degree(deg),
            "house": house,
            "vargas": {
                "D1": house,
                "D9": _varga_house(house, 9),
                "D10": _varga_house(house, 10),
                "D7": _varga_house(house, 7),
                "D12": _varga_house(house, 12),
                "D16": _varga_house(house, 16),
                "D60": _varga_house(house, 60),
            },
        }

    panchang = _compute_panchang(ctx.local_dt, planets_deg["Sun"], planets_deg["Moon"])
    dasha = _compute_vimshottari(ctx.local_dt, planets_deg["Moon"])

    facts: dict[str, Any] = {
        "engine_mode": engine_mode,
        "ayanamsha": ayanamsha,
        "lagna": {
            "degree": round(lagna_deg, 4),
            "sign": _zodiac_sign_from_degree(lagna_deg),
        },
        "planet_positions": planet_positions,
        "varga_used": ["D1", "D9", "D10", "D7", "D12", "D16", "D60"],
        "panchang": panchang,
        "vimshottari_timeline": dasha,
    }
    facts["highlights"] = _derive_highlights(facts)
    return facts


def panchang_for_date(*, profile_id: str, date: str, timezone_name: str, location: str) -> dict[str, Any]:
    """Compute Panchang for a given date using astronomical solar/lunar approximation."""
    dt = datetime.fromisoformat(f"{date}T12:00:00").replace(tzinfo=ZoneInfo(timezone_name))
    utc_dt = dt.astimezone(ZoneInfo("UTC"))
    sun_deg = _approx_solar_longitude(utc_dt)
    moon_deg = _approx_lunar_longitude(utc_dt)
    result = _compute_panchang(dt, sun_deg, moon_deg)
    result["notes"] = [
        f"Solar longitude (sidereal): {sun_deg:.2f}°",
        f"Lunar longitude (sidereal): {moon_deg:.2f}°",
        f"Location context: {location}",
    ]
    return result


def _muhurta_score(tithi_num: int, nak_num: int, yoga_num: int) -> int:
    """Score a time window using classic muhurta quality criteria."""
    score = 50
    if tithi_num in SHUBHA_TITHIS:
        score += 15
    nak_quality = NAKSHATRA_QUALITY.get(nak_num, "mishra")
    if nak_quality in ("sthira", "mridu", "laghu"):
        score += 10
    elif nak_quality == "tikshna":
        score -= 10
    # Vishti karana (8th karana = Bhadra) — inauspicious
    if yoga_num in (6, 9, 16, 22, 27):  # Atiganda, Ganda, Vyatipata, Vyaghata, Vaidhriti
        score -= 8
    return max(40, min(97, score))


def pick_muhurta_windows(
    *,
    profile_id: str,
    intent: str,
    date_from: str,
    date_to: str = "",
    timezone_name: str,
) -> list[dict[str, Any]]:
    """Scan the full date range and return the 3 highest-scoring muhurta windows.

    Evaluates two candidate slots per day (morning 08:00, afternoon 14:00).
    The range is capped at 90 days to prevent runaway computation.
    """
    tz = ZoneInfo(timezone_name)
    start = datetime.fromisoformat(f"{date_from}T08:00:00").replace(tzinfo=tz)

    if date_to:
        end_date = datetime.fromisoformat(f"{date_to}T23:59:00").replace(tzinfo=tz)
    else:
        end_date = start + timedelta(days=30)

    # Cap range at 90 days
    if (end_date - start).days > 90:
        end_date = start + timedelta(days=90)

    # Candidate slot hours within each day
    slot_hours = [8, 14]

    candidates: list[dict[str, Any]] = []
    current = start
    while current <= end_date:
        for hour in slot_hours:
            slot_dt = current.replace(hour=hour, minute=0, second=0)
            if slot_dt < start or slot_dt > end_date:
                continue
            utc_slot = slot_dt.astimezone(ZoneInfo("UTC"))
            sun_deg = _approx_solar_longitude(utc_slot)
            moon_deg = _approx_lunar_longitude(utc_slot)
            panchang = _compute_panchang(slot_dt, sun_deg, moon_deg)
            tithi_n = panchang["tithi_num"]
            nak_n = panchang["nakshatra_num"]
            yoga_n = panchang["yoga_num"]
            score = _muhurta_score(tithi_n, nak_n, yoga_n)
            candidates.append({
                "dt": slot_dt,
                "panchang": panchang,
                "tithi_n": tithi_n,
                "nak_n": nak_n,
                "score": score,
            })
        current += timedelta(days=1)

    # Sort descending by score, pick top 3; ensure they are at least 12h apart
    candidates.sort(key=lambda c: c["score"], reverse=True)
    selected: list[dict[str, Any]] = []
    for cand in candidates:
        if len(selected) >= 3:
            break
        # Ensure each selected window is at least 12 hours from any already selected
        too_close = any(abs((cand["dt"] - s["dt"]).total_seconds()) < 43200 for s in selected)
        if not too_close:
            selected.append(cand)

    # Format output
    windows: list[dict[str, Any]] = []
    for cand in selected:
        window_dt = cand["dt"]
        panchang = cand["panchang"]
        tithi_n = cand["tithi_n"]
        nak_n = cand["nak_n"]
        score = cand["score"]
        end_dt = window_dt + timedelta(hours=1, minutes=30)

        why: list[str] = []
        why_not: list[str] = []

        if tithi_n in SHUBHA_TITHIS:
            why.append(f"{panchang['tithi']} is an auspicious tithi (lunar day) well-suited for {intent}.")
        else:
            why_not.append(f"{panchang['tithi']} tithi is not among the traditionally preferred lunar days for {intent}.")

        nak_quality = NAKSHATRA_QUALITY.get(nak_n - 1, "mishra")
        if nak_quality in ("sthira", "mridu"):
            why.append(f"{panchang['nakshatra']} nakshatra ({nak_quality}) is conducive to stable, auspicious beginnings.")
        elif nak_quality == "tikshna":
            why_not.append(f"{panchang['nakshatra']} (sharp/tikshna nakshatra) is traditionally avoided for auspicious events.")
        else:
            why.append(f"{panchang['nakshatra']} nakshatra offers balanced energy for {intent}.")

        why.append(f"{panchang['vara_description']}")
        why_not.append("Confirm with a qualified Jyotishi for events with long-term consequences.")

        windows.append({
            "start": window_dt.isoformat(),
            "end": end_dt.isoformat(),
            "score": score,
            "panchang_context": {
                "tithi": panchang["tithi"],
                "nakshatra": panchang["nakshatra"],
                "yoga": panchang["yoga"],
                "vara": panchang["vara"],
            },
            "why": why,
            "why_not": why_not,
        })

    return windows


# ─── Transit Impact ──────────────────────────────────────────────────────────

# Base intensity scores (0–10) for transiting planet over natal planet
_TRANSIT_BASE_INTENSITY: dict[tuple[str, str], tuple[int, str, str]] = {
    # (transiting, natal): (raw_score, title_template, description_template)
    ("Moon",    "Sun"):     (9, "Moon transits natal Sun",     "Daily vitality and identity are in flux — energy levels may rise and fall quickly. Stay grounded; emotional reactions can surface unexpectedly."),
    ("Moon",    "Moon"):    (9, "Moon transits natal Moon",    "Heightened emotional sensitivity today — intuition is sharp, moods are fluid. An auspicious time for introspection, family, and heartfelt conversations."),
    ("Moon",    "Lagna"):   (8, "Moon transits Ascendant",     "A surge of personal presence and emotional expressiveness. Good for meetings, first impressions, and nurturing self-care routines."),
    ("Saturn",  "Sun"):     (9, "Saturn crosses natal Sun",    "A period of discipline and identity testing — responsibility increases, shortcuts fail. Commit to long-term work; avoid ego-driven confrontations."),
    ("Saturn",  "Moon"):    (8, "Saturn crosses natal Moon",   "Emotional heaviness or restriction is likely — practical burdens weigh on the mind. Structure your day carefully and lean on trusted support."),
    ("Jupiter", "Moon"):    (9, "Jupiter transits natal Moon", "An auspicious expansion of emotional life — family harmony, optimism, and healing are supported. Favorable for starting new ventures or relationships."),
    ("Jupiter", "Sun"):     (8, "Jupiter transits natal Sun",  "Confidence and opportunity expand — leadership roles, recognition, and growth initiatives are all well-starred. Act on goals set in this window."),
    ("Jupiter", "Lagna"):   (8, "Jupiter transits Ascendant",  "A broadly auspicious transit — physical vitality, wisdom, and social grace increase. Good for making important decisions and expanding your public presence."),
    ("Mars",    "Sun"):     (7, "Mars activates natal Sun",    "Energy and ambition run high — excellent for physical effort and bold moves. Guard against impulsiveness; channel the drive purposefully."),
    ("Mars",    "Moon"):    (7, "Mars activates natal Moon",   "Emotional intensity and restless energy combine — productive if channelled into exercise or decisive action. Avoid needless arguments."),
    ("Mars",    "Saturn"):  (6, "Mars-Saturn tension",         "Frustration from blocked ambitions or slow progress is possible. Patience and systematic effort are your best strategy; avoid reckless shortcuts."),
    ("Venus",   "Moon"):    (6, "Venus transits natal Moon",   "Emotional warmth, aesthetic pleasure, and relationship harmony are highlighted. A good day for creative work, romance, and social gatherings."),
    ("Venus",   "Venus"):   (6, "Venus returns to natal Venus", "A personal Venus return period — relationships, beauty, and comfort come into focus. Celebrate connections and creative projects."),
    ("Mercury", "Mercury"): (5, "Mercury conjunct natal Mercury", "Mental agility peaks — communication, writing, learning, and negotiation are all flowing well. Use this clarity for planning or difficult conversations."),
    ("Mercury", "Sun"):     (5, "Mercury activates natal Sun",  "Intellectual confidence increases — good for presentations, signing agreements, and expressing ideas clearly. Trust your analytical instincts."),
    ("Rahu",    "Sun"):     (7, "Rahu crosses natal Sun",       "Ambitions intensify and unconventional paths open — worldly desires are amplified. Stay discerning; Rahu can obscure reality with allure."),
    ("Rahu",    "Moon"):    (7, "Rahu crosses natal Moon",      "Mental restlessness and craving for novelty may be unsettling. Avoid impulsive decisions; meditation and grounding practices help stabilise the mind."),
    ("Ketu",    "Moon"):    (6, "Ketu crosses natal Moon",      "Spiritual withdrawal and emotional detachment are possible — a reflective, inward period. Past patterns may surface for release; honour the introspective pull."),
    ("Ketu",    "Sun"):     (6, "Ketu crosses natal Sun",       "Ego loosens and spiritual insights deepen — worldly ambitions may feel less compelling. Use this phase for inner work and letting go of outdated identity structures."),
    ("Saturn",  "Jupiter"): (7, "Saturn squares natal Jupiter", "Expansion meets contraction — idealistic plans face reality checks. Slow, deliberate progress beats optimistic shortcuts in this period."),
    ("Jupiter", "Saturn"):  (7, "Jupiter expands natal Saturn", "Opportunities to grow within structure arise — career rewards, long-term projects, and institutional gains are well-supported. Trust steady effort."),
}

# Aspect multipliers: (angle, orb, multiplier, label)
_ASPECTS: list[tuple[float, float, float, str]] = [
    (0.0,   5.0, 1.5, "conjunction"),
    (180.0, 8.0, 1.2, "opposition"),
    (120.0, 8.0, 0.8, "trine"),
    (90.0,  8.0, 1.0, "square"),
    (60.0,  8.0, 0.6, "sextile"),
]

# House-transit impact descriptions (fallback when planet-pair not in table)
_HOUSE_TRANSIT_MSGS: dict[str, str] = {
    "Sun":     "Sun transiting {house_label} — focus, leadership, and identity themes activate in this life area.",
    "Moon":    "Moon transiting {house_label} — emotional currents and intuitive pulls heighten here.",
    "Mars":    "Mars entering {house_label} — action, drive, and potential friction animate this life area. Push boldly but with care.",
    "Mercury": "Mercury through {house_label} — communication, analysis, and quick decisions favour this domain.",
    "Jupiter": "Jupiter transiting {house_label} — expansion, optimism, and growth bless this area of life.",
    "Venus":   "Venus gracing {house_label} — beauty, relationships, and pleasurable gains are highlighted here.",
    "Saturn":  "Saturn crossing {house_label} — discipline and long-term lessons consolidate this life area. Patient effort is rewarded.",
    "Rahu":    "Rahu transiting {house_label} — obsessive focus and unconventional energy surge into this domain.",
    "Ketu":    "Ketu transiting {house_label} — detachment and spiritual insight deepen in this life area.",
}

_HOUSE_ORDINALS = {
    1: "1st house", 2: "2nd house", 3: "3rd house", 4: "4th house",
    5: "5th house", 6: "6th house", 7: "7th house", 8: "8th house",
    9: "9th house", 10: "10th house", 11: "11th house", 12: "12th house",
}


def _angular_diff(a: float, b: float) -> float:
    """Shortest angular distance between two ecliptic longitudes (0–180°)."""
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d


def _aspect_check(transit_deg: float, natal_deg: float) -> tuple[float, float, str] | None:
    """Return (orb_used, multiplier, aspect_label) if any aspect applies, else None."""
    for angle, max_orb, mult, label in _ASPECTS:
        diff = _angular_diff(transit_deg, (natal_deg + angle) % 360)
        if diff <= max_orb:
            return diff, mult, label
    return None


def _intensity_label(score: float) -> str:
    if score >= 7.5:
        return "high"
    if score >= 5.0:
        return "medium"
    return "low"


def get_current_transits(natal_positions: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Compute personalised transit impacts for today against a natal chart.

    natal_positions: output of compute_kundli_facts()["planet_positions"]
                     Each entry has keys: degree, sign, house.
    Returns a list of impact dicts sorted by intensity (descending), capped at 10.
    """
    from datetime import timezone as _tz

    now_utc = datetime.now(_tz.utc)

    # ── Get today's planet positions ──────────────────────────────────────────
    try:
        today_ctx = BirthContext(
            local_dt=now_utc,
            utc_dt=now_utc,
            latitude=0.0,   # latitude irrelevant for planet longitudes
            longitude=0.0,
        )
        transit_planets, _lagna, _engine = _compute_planetary_longitudes(today_ctx, "Lahiri")
    except Exception:
        # Pure-Python fallback using the approximate helpers
        transit_planets = {
            "Sun":  _approx_solar_longitude(now_utc),
            "Moon": _approx_lunar_longitude(now_utc),
        }
        # Fill remaining planets with seed-based fallback using today's date
        seed = int(now_utc.strftime("%Y%m%d%H"))
        for name, mult in [("Mercury", 17), ("Venus", 19), ("Mars", 23),
                            ("Jupiter", 29), ("Saturn", 31), ("Rahu", 37)]:
            transit_planets[name] = float((seed * mult) % 36000) / 100
        transit_planets["Ketu"] = (transit_planets["Rahu"] + 180) % 360

    # ── Build natal lookup: name → degree ─────────────────────────────────────
    natal_degrees: dict[str, float] = {}
    natal_houses: dict[str, int] = {}
    for planet_name, info in natal_positions.items():
        natal_degrees[planet_name] = float(info["degree"])
        natal_houses[planet_name] = int(info["house"])

    # ── Find natal lagna degree (reconstruct from first planet whose house == 1) ─
    # We store lagna as a synthetic entry if present
    natal_lagna_deg: float | None = natal_positions.get("Lagna", {}).get("degree")  # type: ignore[assignment]

    impacts: list[dict[str, Any]] = []

    for t_planet, t_deg in transit_planets.items():
        t_sign = _zodiac_sign_from_degree(t_deg)

        # Check against each natal planet
        for n_planet, n_deg in natal_degrees.items():
            pair = (t_planet, n_planet)
            asp = _aspect_check(t_deg, n_deg)
            if asp is None:
                continue
            orb, mult, aspect_label = asp

            base_info = _TRANSIT_BASE_INTENSITY.get(pair)
            if base_info:
                raw_score, title, description = base_info
            else:
                raw_score = 4
                house_lbl = _HOUSE_ORDINALS.get(natal_houses.get(n_planet, 1), "natal house")
                title = f"{t_planet} aspects natal {n_planet}"
                tmpl = _HOUSE_TRANSIT_MSGS.get(t_planet, "{planet} transiting {house_label}.")
                description = tmpl.format(planet=t_planet, house_label=house_lbl)

            final_score = raw_score * mult
            # Proximity bonus: closer orb → stronger impact
            orb_factor = max_orb = next(
                (o for a, o, _, l in _ASPECTS if l == aspect_label), 5.0
            )
            proximity = 1.0 - (orb / orb_factor) * 0.3  # up to 30% bonus for exact
            final_score *= proximity

            natal_house = natal_houses.get(n_planet, 0)
            impacts.append({
                "transiting_planet": t_planet,
                "natal_planet": n_planet,
                "transit_sign": t_sign,
                "transit_degree": round(t_deg, 2),
                "natal_house": natal_house,
                "aspect_type": aspect_label,
                "orb_degrees": round(orb, 2),
                "intensity": _intensity_label(final_score),
                "intensity_score": round(final_score, 2),
                "title": title,
                "description": description,
            })

        # Also check against natal Lagna if available
        if natal_lagna_deg is not None:
            asp = _aspect_check(t_deg, natal_lagna_deg)
            if asp:
                orb, mult, aspect_label = asp
                pair_lagna = (t_planet, "Lagna")
                base_info = _TRANSIT_BASE_INTENSITY.get(pair_lagna)
                if base_info:
                    raw_score, title, description = base_info
                else:
                    raw_score = 5
                    title = f"{t_planet} {aspect_label} Ascendant"
                    tmpl = _HOUSE_TRANSIT_MSGS.get(t_planet, "{planet} transiting {house_label}.")
                    description = tmpl.format(planet=t_planet, house_label="Ascendant / 1st house")
                orb_factor = next((o for a, o, _, l in _ASPECTS if l == aspect_label), 5.0)
                proximity = 1.0 - (orb / orb_factor) * 0.3
                final_score = raw_score * mult * proximity
                impacts.append({
                    "transiting_planet": t_planet,
                    "natal_planet": "Lagna",
                    "transit_sign": t_sign,
                    "transit_degree": round(t_deg, 2),
                    "natal_house": 1,
                    "aspect_type": aspect_label,
                    "orb_degrees": round(orb, 2),
                    "intensity": _intensity_label(final_score),
                    "intensity_score": round(final_score, 2),
                    "title": title,
                    "description": description,
                })

    # Sort by intensity_score descending, deduplicate by (t_planet, n_planet) keeping highest
    seen: set[tuple[str, str]] = set()
    unique: list[dict[str, Any]] = []
    for imp in sorted(impacts, key=lambda x: x["intensity_score"], reverse=True):
        key = (imp["transiting_planet"], imp["natal_planet"])
        if key not in seen:
            seen.add(key)
            unique.append(imp)

    return unique[:10]


def score_matchmaking(seeker_facts: dict[str, Any], partner_facts: dict[str, Any]) -> dict[str, Any]:
    """8-Koota Guna Milan compatibility scoring (max 36 points, normalised to 100)."""
    s_moon_sign = seeker_facts["planet_positions"]["Moon"]["sign"]
    p_moon_sign = partner_facts["planet_positions"]["Moon"]["sign"]
    s_moon_deg = seeker_facts["planet_positions"]["Moon"]["degree"]
    p_moon_deg = partner_facts["planet_positions"]["Moon"]["degree"]
    s_nak = int((s_moon_deg % 360) // (360 / 27))
    p_nak = int((p_moon_deg % 360) // (360 / 27))
    s_sign_idx = SIGNS.index(s_moon_sign)
    p_sign_idx = SIGNS.index(p_moon_sign)

    # 1. Varna (1 pt) — spiritual compatibility
    s_varna = _SIGN_VARNA.get(s_moon_sign, 2)
    p_varna = _SIGN_VARNA.get(p_moon_sign, 2)
    varna_pts = 1 if p_varna <= s_varna else 0

    # 2. Vashya (2 pts) — dominance compatibility
    vashya_compatible = {
        "Aries": ["Leo", "Scorpio"], "Taurus": ["Cancer", "Libra"],
        "Gemini": ["Virgo"], "Cancer": ["Scorpio", "Sagittarius"],
        "Leo": ["Libra"], "Virgo": ["Pisces", "Gemini"],
        "Libra": ["Capricorn", "Virgo"], "Scorpio": ["Cancer"],
        "Sagittarius": ["Pisces"], "Capricorn": ["Aries", "Aquarius"],
        "Aquarius": ["Aries"], "Pisces": ["Capricorn"],
    }
    vashya_pts = 0
    if p_moon_sign in vashya_compatible.get(s_moon_sign, []):
        vashya_pts = 2
    elif s_moon_sign in vashya_compatible.get(p_moon_sign, []):
        vashya_pts = 1

    # 3. Tara (3 pts) — birth star compatibility
    tara = ((p_nak - s_nak) % 27) % 9
    tara_pts = 3 if tara in (0, 1, 2, 4, 6) else 0

    # 4. Yoni (4 pts) — instinctive compatibility
    s_yoni = _NAKSHATRA_YONI[s_nak % 27]
    p_yoni = _NAKSHATRA_YONI[p_nak % 27]
    yoni_key = frozenset({s_yoni, p_yoni}) if s_yoni != p_yoni else frozenset({s_yoni})
    same_yoni_pts = 4 if s_yoni == p_yoni else YONI_POINTS.get(yoni_key, 2)

    # 5. Graha Maitri (5 pts) — planetary friendship of moon sign lords
    s_lord = SIGN_LORDS[s_moon_sign]
    p_lord = SIGN_LORDS[p_moon_sign]
    planet_friends: dict[str, set[str]] = {
        "Sun": {"Moon", "Mars", "Jupiter"}, "Moon": {"Sun", "Mercury"},
        "Mars": {"Sun", "Moon", "Jupiter"}, "Mercury": {"Sun", "Venus"},
        "Jupiter": {"Sun", "Moon", "Mars"}, "Venus": {"Mercury", "Saturn"},
        "Saturn": {"Mercury", "Venus"},
    }
    if s_lord == p_lord:
        graha_pts = 5
    elif p_lord in planet_friends.get(s_lord, set()) and s_lord in planet_friends.get(p_lord, set()):
        graha_pts = 5
    elif p_lord in planet_friends.get(s_lord, set()) or s_lord in planet_friends.get(p_lord, set()):
        graha_pts = 4
    else:
        graha_pts = 0

    # 6. Gana (6 pts) — temperament compatibility
    s_gana = _NAKSHATRA_GANA[s_nak % 27]
    p_gana = _NAKSHATRA_GANA[p_nak % 27]
    if s_gana == p_gana:
        gana_pts = 6
    elif (s_gana == "deva" and p_gana == "manav") or (s_gana == "manav" and p_gana == "deva"):
        gana_pts = 5
    elif (s_gana == "manav" and p_gana == "rakshasa") or (s_gana == "rakshasa" and p_gana == "manav"):
        gana_pts = 1
    else:
        gana_pts = 0  # deva-rakshasa

    # 7. Bhakut (7 pts) — moon-sign distance compatibility
    bhakut_pts = _bhakut_points(s_sign_idx, p_sign_idx)

    # 8. Nadi (8 pts) — physiological/genetic compatibility
    s_nadi = _NAKSHATRA_NADI[s_nak % 27]
    p_nadi = _NAKSHATRA_NADI[p_nak % 27]
    nadi_pts = 0 if s_nadi == p_nadi else 8  # Same nadi = 0 (nadi dosha)

    total_gunas = varna_pts + vashya_pts + tara_pts + same_yoni_pts + graha_pts + gana_pts + bhakut_pts + nadi_pts
    compatibility_score = int((total_gunas / 36) * 100)

    # Interpret score
    if total_gunas >= 28:
        verdict = "Excellent"
    elif total_gunas >= 21:
        verdict = "Good"
    elif total_gunas >= 18:
        verdict = "Acceptable"
    else:
        verdict = "Challenging"

    koota_breakdown = {
        "Varna": f"{varna_pts}/1 — Spiritual/social compatibility",
        "Vashya": f"{vashya_pts}/2 — Mutual attraction and control",
        "Tara": f"{tara_pts}/3 — Birth star harmony",
        "Yoni": f"{same_yoni_pts}/4 — Instinctive nature compatibility (Seeker: {s_yoni}, Partner: {p_yoni})",
        "Graha Maitri": f"{graha_pts}/5 — Moon lord friendship ({s_lord} & {p_lord})",
        "Gana": f"{gana_pts}/6 — Temperament match (Seeker: {s_gana}, Partner: {p_gana})",
        "Bhakut": f"{bhakut_pts}/7 — Moon sign position compatibility",
        "Nadi": f"{nadi_pts}/8 — Physiological/Pranic compatibility (Seeker: {s_nadi} nadi, Partner: {p_nadi} nadi)",
        "Total": f"{total_gunas}/36 — {verdict}",
    }

    strengths: list[str] = []
    watchouts: list[str] = []

    if nadi_pts == 8:
        strengths.append("Different Nadis — no Nadi Dosha. Physical and constitutional energies are complementary.")
    else:
        watchouts.append("Same Nadi (Nadi Dosha) — traditional guidance recommends remedial rituals (puja, donation) or medical consultation.")

    if gana_pts >= 5:
        strengths.append(f"Strong Gana compatibility ({s_gana}/{p_gana}) — similar temperament and approach to life creates natural ease.")
    elif gana_pts == 0:
        watchouts.append("Gana conflict (Deva/Rakshasa combination) — significant temperament differences require conscious effort and patience.")

    if graha_pts >= 4:
        strengths.append(f"Graha Maitri is favourable — {s_lord} and {p_lord} are friendly, supporting mutual respect and mental compatibility.")
    else:
        watchouts.append(f"Planetary lords {s_lord} and {p_lord} are not naturally friendly — mental wavelengths may differ; shared practices help bridge this.")

    if bhakut_pts == 7:
        strengths.append(f"Bhakut compatibility is positive — moon signs {s_moon_sign} and {p_moon_sign} create supportive life-area alignment.")
    elif bhakut_pts == 0:
        watchouts.append(f"Bhakut Dosha present — moon sign distance ({s_moon_sign}→{p_moon_sign}) traditionally indicates potential prosperity or health concerns to monitor.")

    paths = [
        f"Guna Milan Total: {total_gunas}/36 ({verdict})",
        f"Seeker Moon: {s_moon_sign} / {NAKSHATRA_NAMES[s_nak % 27]} nakshatra / {s_gana} gana / {s_nadi} nadi",
        f"Partner Moon: {p_moon_sign} / {NAKSHATRA_NAMES[p_nak % 27]} nakshatra / {p_gana} gana / {p_nadi} nadi",
        "Full compatibility assessment should include Mangal Dosha, Dasha sandhi, and Navamsha chart analysis.",
    ]

    return {
        "compatibility_score": compatibility_score,
        "guna_score": total_gunas,
        "verdict": verdict,
        "koota_breakdown": koota_breakdown,
        "strengths": strengths if strengths else ["Core compatibility is functional with conscious effort."],
        "watchouts": watchouts if watchouts else ["No major doshas detected in the 8-koota analysis."],
        "compatibility_paths": paths,
    }


# ─── Sade Sati Calculator ────────────────────────────────────────────────────

_SATURN_SIDEREAL_PERIOD_YEARS = 29.4571
_SATURN_REF_LONG_DEG = 330.0   # Saturn ~Aquarius 0° at J2000.0 (approx)
_J2000_UNIX = 946728000         # 2000-01-01 12:00 UTC unix timestamp

SADE_SATI_PHASES = {
    0: "Rising (12th from Moon) — outer preparations, latent pressure building",
    1: "Peak (Moon sign) — most intense; challenges to mind, health, and wealth",
    2: "Setting (2nd from Moon) — winding down; residual lessons in speech and finances",
}

SADE_SATI_REMEDIES = [
    "Chant Shani Stotram every Saturday morning",
    "Donate black sesame (til), mustard oil, or blue cloth on Saturdays",
    "Light a sesame oil lamp at a Shani temple on Saturdays",
    "Recite 'ॐ शं शनैश्चराय नमः' 108 times daily",
    "Wear a Blue Sapphire (Neelam) after consulting a qualified Jyotishi",
    "Feed crows or dark-coloured birds on Saturdays",
    "Practice Hanuman Chalisa recitation — Hanuman is traditionally protective during Shani periods",
    "Observe discipline: punctuality, service to elders, and ethical conduct reduce Shani's karmic load",
]


def _saturn_sidereal_longitude(unix_ts: float) -> float:
    """Return Saturn's approximate sidereal longitude (0–360°)."""
    if swe is not None:
        try:
            jd = swe.julday(
                datetime.utcfromtimestamp(unix_ts).year,
                datetime.utcfromtimestamp(unix_ts).month,
                datetime.utcfromtimestamp(unix_ts).day,
                datetime.utcfromtimestamp(unix_ts).hour
                + datetime.utcfromtimestamp(unix_ts).minute / 60.0,
            )
            swe.set_sid_mode(swe.SIDM_LAHIRI)
            result, _ = swe.calc_ut(jd, swe.SATURN, swe.FLG_SIDEREAL)
            return float(result[0]) % 360
        except Exception:
            pass
    # Fallback: simple linear approximation from reference
    years_since_j2000 = (unix_ts - _J2000_UNIX) / (365.25 * 86400)
    degrees_per_year = 360.0 / _SATURN_SIDEREAL_PERIOD_YEARS
    return (_SATURN_REF_LONG_DEG + years_since_j2000 * degrees_per_year) % 360


def compute_sade_sati(birth_data: dict[str, Any], query_ts: float | None = None) -> dict[str, Any]:
    """
    Compute Sade Sati status for a natal chart.

    birth_data must contain natal Moon longitude (degrees, sidereal) or
    a 'moon_sign_index' (0=Aries … 11=Pisces).
    Returns current phase, duration remaining, and remedies.
    """
    import time as _time

    now_ts = query_ts or _time.time()
    facts = compute_kundli_facts(birth_data) if "moon_sign_index" not in birth_data else birth_data
    planets = facts.get("planets", {})
    moon_info = planets.get("Moon", {})

    # Moon sign index (0=Aries…11=Pisces)
    moon_sign_name = moon_info.get("sign", facts.get("moon_sign", "Unknown"))
    if moon_sign_name in SIGNS:
        moon_sign_idx = SIGNS.index(moon_sign_name)
    else:
        moon_sign_idx = birth_data.get("moon_sign_index", 0)

    saturn_long = _saturn_sidereal_longitude(now_ts)
    saturn_sign_idx = int(saturn_long // 30) % 12

    # Sade Sati: Saturn in 12th, Moon, or 2nd from natal Moon
    sade_sati_signs = [
        (moon_sign_idx - 1) % 12,
        moon_sign_idx,
        (moon_sign_idx + 1) % 12,
    ]
    is_active = saturn_sign_idx in sade_sati_signs
    phase_idx = sade_sati_signs.index(saturn_sign_idx) if is_active else None

    # Saturn stays ~2.5 years per sign; compute degrees remaining in current sign
    saturn_deg_in_sign = saturn_long % 30
    degrees_remaining = 30 - saturn_deg_in_sign
    # Saturn moves ~0.0339 degrees/day
    days_remaining_in_sign = degrees_remaining / 0.0339

    # Find next Sade Sati start: next time Saturn enters (Moon-1) sign
    next_phase0_sign = (moon_sign_idx - 1) % 12
    signs_to_next = (next_phase0_sign - saturn_sign_idx) % 12
    days_to_next_sade_sati = (signs_to_next * 30 + degrees_remaining) / 0.0339

    result: dict[str, Any] = {
        "natal_moon_sign": moon_sign_name,
        "natal_moon_sign_index": moon_sign_idx,
        "current_saturn_sign": SIGNS[saturn_sign_idx],
        "current_saturn_long_deg": round(saturn_long, 2),
        "sade_sati_active": is_active,
    }

    if is_active:
        result["phase"] = phase_idx
        result["phase_description"] = SADE_SATI_PHASES[phase_idx]
        result["days_remaining_in_phase"] = round(days_remaining_in_sign)
        result["years_remaining_in_phase"] = round(days_remaining_in_sign / 365.25, 2)
        result["summary"] = (
            f"Sade Sati is ACTIVE — Saturn is transiting {SIGNS[saturn_sign_idx]}, "
            f"which is the {['12th from', 'natal', '2nd from'][phase_idx]} your Moon sign "
            f"({moon_sign_name}). Phase ends in approximately "
            f"{round(days_remaining_in_sign / 365.25, 1)} years."
        )
    else:
        result["days_to_next_sade_sati"] = round(days_to_next_sade_sati)
        result["years_to_next_sade_sati"] = round(days_to_next_sade_sati / 365.25, 2)
        result["summary"] = (
            f"Sade Sati is NOT active. Saturn is in {SIGNS[saturn_sign_idx]}. "
            f"Next Sade Sati begins in approximately "
            f"{round(days_to_next_sade_sati / 365.25, 1)} years."
        )

    result["remedies"] = SADE_SATI_REMEDIES
    return result


# ─── Ashtakavarga Scoring ────────────────────────────────────────────────────

# Benefic sign positions (1-based offset from the planet's own position)
# Source: BPHS (Brihat Parashara Hora Shastra) standard tables
_ASHTAK_BENEFIC_OFFSETS: dict[str, list[int]] = {
    "Sun":     [1, 2, 4, 7, 8, 9, 10, 11],
    "Moon":    [3, 6, 7, 8, 10, 11],
    "Mars":    [1, 2, 4, 7, 8, 10, 11],
    "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
    "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
    "Venus":   [1, 2, 3, 4, 5, 8, 9, 11, 12],
    "Saturn":  [3, 5, 6, 11],
    "Lagna":   [1, 3, 4, 6, 10, 11],
}

# Moon additionally contributes from Sun's position
_MOON_FROM_SUN_OFFSETS = [3, 6, 10, 11]


def compute_ashtakavarga(facts: dict[str, Any]) -> dict[str, Any]:
    """
    Compute Sarva Ashtakavarga (combined benefic point tally per sign).

    facts: output of compute_kundli_facts(). Uses planet sign positions.
    Returns per-sign scores (0–56), total, and interpretation.
    """
    planets = facts.get("planets", {})
    lagna_sign = facts.get("lagna_sign", "Aries")
    lagna_idx = SIGNS.index(lagna_sign) if lagna_sign in SIGNS else 0

    def sign_idx(planet_name: str) -> int:
        p = planets.get(planet_name, {})
        s = p.get("sign", "Aries")
        return SIGNS.index(s) if s in SIGNS else 0

    # Build planet sign indices
    planet_positions = {
        "Sun": sign_idx("Sun"),
        "Moon": sign_idx("Moon"),
        "Mars": sign_idx("Mars"),
        "Mercury": sign_idx("Mercury"),
        "Jupiter": sign_idx("Jupiter"),
        "Venus": sign_idx("Venus"),
        "Saturn": sign_idx("Saturn"),
        "Lagna": lagna_idx,
    }

    # Tally benefic points per sign for each contributor
    sign_scores = [0] * 12
    contributor_tables: dict[str, list[int]] = {}

    for contributor, offsets in _ASHTAK_BENEFIC_OFFSETS.items():
        base_idx = planet_positions.get(contributor, 0)
        row = [0] * 12
        for off in offsets:
            target = (base_idx + off - 1) % 12
            row[target] += 1
            sign_scores[target] += 1
        contributor_tables[contributor] = row

    # Moon's additional contribution from Sun
    sun_idx = planet_positions["Sun"]
    for off in _MOON_FROM_SUN_OFFSETS:
        target = (sun_idx + off - 1) % 12
        sign_scores[target] += 1

    total = sum(sign_scores)

    # Per-sign interpretation
    def _strength_label(score: int) -> str:
        if score >= 30:
            return "Excellent (highly auspicious)"
        if score >= 25:
            return "Good (favourable)"
        if score >= 20:
            return "Moderate (average results)"
        if score >= 15:
            return "Weak (challenges likely)"
        return "Very weak (difficult period)"

    per_sign = [
        {
            "sign": SIGNS[i],
            "sign_index": i,
            "score": sign_scores[i],
            "strength_label": _strength_label(sign_scores[i]),
        }
        for i in range(12)
    ]

    # Top 3 strongest signs for transit planning
    sorted_signs = sorted(per_sign, key=lambda x: x["score"], reverse=True)
    best_transit_signs = [s["sign"] for s in sorted_signs[:3]]
    weakest_signs = [s["sign"] for s in sorted_signs[-3:]]

    # Lagna sign score context
    lagna_score = sign_scores[lagna_idx]

    return {
        "sarva_ashtakavarga": per_sign,
        "total_benefic_points": total,
        "best_transit_signs": best_transit_signs,
        "weakest_signs": weakest_signs,
        "lagna_ashtakavarga_score": lagna_score,
        "contributor_tables": contributor_tables,
        "summary": (
            f"Total Sarva Ashtakavarga: {total}/337. "
            f"Strongest signs for positive results: {', '.join(best_transit_signs)}. "
            f"Weakest signs requiring caution: {', '.join(weakest_signs)}. "
            f"Your Lagna ({lagna_sign}) scores {lagna_score}/56 — "
            f"{_strength_label(lagna_score).lower()}."
        ),
    }


# ─── Prashna Kundli (Horary Astrology) ──────────────────────────────────────

_PRASHNA_HOUSE_SIGNIFICATIONS = {
    1: "Self, health, overall life outlook, appearance",
    2: "Wealth, speech, family, accumulated resources",
    3: "Courage, short journeys, siblings, communication",
    4: "Home, mother, property, emotional security",
    5: "Children, creativity, education, speculation, romance",
    6: "Enemies, debts, disease, service, legal disputes",
    7: "Partnerships, marriage, contracts, business deals",
    8: "Longevity, hidden matters, inheritance, transformation",
    9: "Dharma, higher learning, father, fortune, spirituality",
    10: "Career, status, authority, public reputation",
    11: "Gains, income, social networks, fulfilment of desires",
    12: "Losses, foreign lands, liberation, isolation, expenses",
}

_PRASHNA_HOUSE_BY_TOPIC = {
    "marriage": 7,
    "relationship": 7,
    "partner": 7,
    "love": 5,
    "romance": 5,
    "career": 10,
    "job": 10,
    "work": 10,
    "business": 7,
    "money": 2,
    "wealth": 2,
    "finance": 2,
    "health": 1,
    "illness": 6,
    "disease": 6,
    "children": 5,
    "child": 5,
    "property": 4,
    "home": 4,
    "house": 4,
    "education": 5,
    "travel": 9,
    "foreign": 12,
    "spiritual": 9,
    "enemy": 6,
    "court": 6,
    "legal": 6,
}


def _detect_question_house(question: str) -> int:
    """Detect the primary house relevant to the prashna question."""
    q_lower = question.lower()
    for keyword, house in _PRASHNA_HOUSE_BY_TOPIC.items():
        if keyword in q_lower:
            return house
    return 1  # Default: house 1 (self/general outlook)


def compute_prashna_kundli(
    question: str,
    query_time_iso: str | None = None,
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    timezone_name: str = "Asia/Kolkata",
) -> dict[str, Any]:
    """
    Compute a Prashna (Horary) Kundli for the moment the question is asked.

    question: the user's question text
    query_time_iso: ISO datetime string; defaults to now
    latitude/longitude: location where question is asked
    Returns prashna chart + AI-ready interpretation context.
    """
    from datetime import timezone as _tz

    if query_time_iso:
        try:
            query_dt = datetime.fromisoformat(query_time_iso)
        except ValueError:
            query_dt = datetime.now(_tz.utc)
    else:
        query_dt = datetime.now(_tz.utc)

    # Build synthetic birth_data for the moment of query
    birth_data = {
        "date": query_dt.strftime("%Y-%m-%d"),
        "time": query_dt.strftime("%H:%M"),
        "timezone": timezone_name,
        "location": f"Query location ({latitude:.2f}N, {longitude:.2f}E)",
        "latitude": latitude,
        "longitude": longitude,
    }

    # Compute chart for this moment
    prashna_facts = compute_kundli_facts(birth_data)

    primary_house = _detect_question_house(question)
    house_signification = _PRASHNA_HOUSE_SIGNIFICATIONS.get(primary_house, "")

    # Lagna & Moon as key prashna indicators
    lagna = prashna_facts.get("lagna_sign", "Unknown")
    lagna_lord = SIGN_LORDS.get(lagna, "Unknown")
    moon_sign = prashna_facts.get("planets", {}).get("Moon", {}).get("sign", "Unknown")
    moon_nakshatra = prashna_facts.get("planets", {}).get("Moon", {}).get("nakshatra", "Unknown")

    # House lord of the primary house
    primary_sign_idx = (SIGNS.index(lagna) + primary_house - 1) % 12 if lagna in SIGNS else 0
    primary_sign = SIGNS[primary_sign_idx]
    primary_lord = SIGN_LORDS.get(primary_sign, "Unknown")

    # Is primary lord well-placed? (Simple check: in own sign, exaltation, or strong house)
    primary_lord_info = prashna_facts.get("planets", {}).get(primary_lord, {})
    primary_lord_house = primary_lord_info.get("house", 0)
    lord_in_good_house = primary_lord_house in (1, 4, 5, 7, 9, 10, 11)

    # Moon's applying aspect (simplified: waxing → positive, waning → challenging)
    moon_long = prashna_facts.get("planets", {}).get("Moon", {}).get("longitude_sidereal", 0)
    sun_long = prashna_facts.get("planets", {}).get("Sun", {}).get("longitude_sidereal", 0)
    moon_phase_deg = (moon_long - sun_long) % 360
    moon_waxing = moon_phase_deg < 180

    verdict_positive = lord_in_good_house and moon_waxing

    return {
        "question": question,
        "prashna_time": query_dt.isoformat(),
        "prashna_lagna": lagna,
        "prashna_lagna_lord": lagna_lord,
        "moon_sign": moon_sign,
        "moon_nakshatra": moon_nakshatra,
        "moon_waxing": moon_waxing,
        "primary_house": primary_house,
        "primary_house_signification": house_signification,
        "primary_house_sign": primary_sign,
        "primary_house_lord": primary_lord,
        "primary_house_lord_placement": primary_lord_house,
        "lord_well_placed": lord_in_good_house,
        "prashna_chart": prashna_facts,
        "verdict": "Favourable" if verdict_positive else "Challenging",
        "summary": (
            f"Prashna Lagna: {lagna} (ruled by {lagna_lord}). "
            f"Moon in {moon_sign} / {moon_nakshatra} — {'waxing (positive energy)' if moon_waxing else 'waning (obstacles indicated)'}. "
            f"The {primary_house}th house ({house_signification}) governs your question. "
            f"Its lord {primary_lord} is in house {primary_lord_house} — "
            f"{'well-placed, supporting a positive outcome' if lord_in_good_house else 'not optimally placed; careful navigation needed'}. "
            f"Overall verdict: {('Favourable' if verdict_positive else 'Challenging')}."
        ),
        "interpretation_context": (
            f"This is a Prashna (horary) chart for the question: '{question}'. "
            f"The Lagna ({lagna}) and Moon sign ({moon_sign}) are the primary indicators. "
            f"The {primary_house}th house lord ({primary_lord}) is in house {primary_lord_house}. "
            f"Use classical Prashna rules from Prashna Marga and Prashna Tantra to interpret "
            f"the full chart, paying attention to the Lagna lord's strength and the Moon's applying aspects."
        ),
    }


# ─── Marriage Timing Analysis ─────────────────────────────────────────────────

_MARRIAGE_DASHA_WEIGHTS: dict[str, int] = {
    "Venus": 10, "Jupiter": 8, "Moon": 6, "Rahu": 6,
    "Mercury": 4, "Sun": 3, "Mars": 3, "Saturn": 2, "Ketu": 2,
}

_PLANET_EMOJIS: dict[str, str] = {
    "Sun": "☉", "Moon": "☽", "Mars": "♂", "Mercury": "☿",
    "Jupiter": "♃", "Saturn": "♄", "Venus": "♀", "Rahu": "☊", "Ketu": "☋",
}


def _age_at_date(birth_date_str: str, target_date_str: str) -> float:
    from datetime import date as _date
    b = _date.fromisoformat(birth_date_str[:10])
    t = _date.fromisoformat(target_date_str[:10])
    return (t - b).days / 365.25


def compute_marriage_timing(
    birth: dict[str, Any],
    *,
    ayanamsha: str = "Lahiri",
    gender: str = "unknown",
) -> dict[str, Any]:
    """
    Analyse the natal chart for marriage timing indicators.

    Returns:
        - 7th house details (sign, lord, planets in 7th)
        - Venus and Jupiter positions
        - Top dasha windows ranked by marriage probability
        - A narrative summary
    """
    facts = compute_kundli_facts(birth, ayanamsha=ayanamsha)
    planets = facts["planet_positions"]
    lagna_sign: str = facts["lagna"]["sign"]
    lagna_deg: float = facts["lagna"]["degree"]

    # 7th house sign
    lagna_idx = SIGNS.index(lagna_sign)
    seventh_sign = SIGNS[(lagna_idx + 6) % 12]
    seventh_lord = SIGN_LORDS[seventh_sign]

    # Planets in 7th house
    planets_in_7th = [
        name for name, p in planets.items() if p["house"] == 7
    ]

    # Venus and Jupiter positions
    venus_pos = planets.get("Venus", {})
    jupiter_pos = planets.get("Jupiter", {})
    moon_pos = planets.get("Moon", {})

    # 7th lord position
    seventh_lord_pos = planets.get(seventh_lord, {})

    # --- Dasha windows ---
    dasha_timeline: list[dict[str, Any]] = facts.get("vimshottari_timeline", [])
    birth_date_str = birth.get("date", "1990-01-01")

    windows: list[dict[str, Any]] = []
    for period in dasha_timeline:
        maha_planet = period.get("lord", "")
        maha_start = period.get("start", "")
        maha_end = period.get("end", "")

        # Score this mahadasha
        score = _MARRIAGE_DASHA_WEIGHTS.get(maha_planet, 2)

        # Boost if maha planet is 7th lord
        if maha_planet == seventh_lord:
            score += 5
        # Boost if maha planet is in 7th house
        if planets.get(maha_planet, {}).get("house") == 7:
            score += 3
        # Boost if maha planet is Venus or Jupiter (natural karakas)
        if maha_planet in ("Venus", "Jupiter"):
            score += 2

        age_start = _age_at_date(birth_date_str, maha_start)
        age_end = _age_at_date(birth_date_str, maha_end)

        # Only include periods covering age 18-55
        if age_end < 18 or age_start > 55:
            continue

        windows.append({
            "mahadasha_lord": maha_planet,
            "emoji": _PLANET_EMOJIS.get(maha_planet, ""),
            "start_date": maha_start,
            "end_date": maha_end,
            "age_range": f"{max(18, round(age_start, 1))}–{min(55, round(age_end, 1))}",
            "score": min(score, 10),
            "is_7th_lord": maha_planet == seventh_lord,
            "is_karaka": maha_planet in ("Venus", "Jupiter"),
            "reason": _marriage_window_reason(maha_planet, seventh_lord, planets_in_7th),
        })

    windows.sort(key=lambda x: -x["score"])

    # Key indicators narrative
    karaka = "Jupiter" if gender.lower() in ("female", "f", "woman") else "Venus"
    karaka_pos = planets.get(karaka, {})
    karaka_house = karaka_pos.get("house", "?")
    karaka_sign = karaka_pos.get("sign", "?")

    indicators = [
        {
            "label": "7th House (Primary)",
            "value": f"{seventh_sign} — ruled by {seventh_lord} ({_PLANET_EMOJIS.get(seventh_lord, '')})",
            "detail": f"{seventh_lord} sits in house {seventh_lord_pos.get('house', '?')} ({seventh_lord_pos.get('sign', '?')})"
                      + (f" — in its own/exaltation sign" if seventh_lord_pos.get("sign") in (seventh_sign,) else ""),
        },
        {
            "label": f"{karaka} — Marriage Karaka",
            "value": f"{karaka} in {karaka_sign} (House {karaka_house})",
            "detail": (
                f"{karaka} in house {karaka_house} {'strongly' if karaka_house in (1, 2, 5, 7, 9, 10, 11) else 'weakly'} "
                f"supports marriage prospects"
            ),
        },
        {
            "label": "Planets in 7th House",
            "value": ", ".join(planets_in_7th) if planets_in_7th else "None — clean 7th house",
            "detail": (
                "Benefics (Venus, Jupiter, Mercury, Moon) in 7th strengthen partnerships; "
                "malefics (Mars, Saturn, Rahu, Ketu) need careful analysis."
            ) if planets_in_7th else "An empty 7th house directs the analysis to its lord.",
        },
        {
            "label": "Moon Sign",
            "value": f"{moon_pos.get('sign', '?')} (House {moon_pos.get('house', '?')})",
            "detail": "The Moon's sign reveals emotional needs in partnership and the dasha seed for timing.",
        },
    ]

    # Summary narrative
    top_windows = windows[:3]
    if top_windows:
        best = top_windows[0]
        summary = (
            f"Your 7th house is {seventh_sign}, ruled by {seventh_lord}. "
            f"The primary marriage window indicated is during the "
            f"{best['mahadasha_lord']} Mahadasha (ages {best['age_range']}), "
            f"which scores {best['score']}/10 for marriage activation. "
        )
        if len(top_windows) > 1:
            summary += (
                f"Secondary windows: {top_windows[1]['mahadasha_lord']} Mahadasha "
                f"(ages {top_windows[1]['age_range']}). "
            )
        summary += (
            "For precise timing within these dashas, check Venus/Jupiter transits "
            "over the 7th house and its lord. "
            "This is an indicative classical analysis — consult a qualified Jyotishi for confirmation."
        )
    else:
        summary = (
            "Could not compute marriage windows for the specified birth data. "
            "Please verify the birth date, time, and location."
        )

    return {
        "seventh_house_sign": seventh_sign,
        "seventh_lord": seventh_lord,
        "planets_in_7th": planets_in_7th,
        "indicators": indicators,
        "dasha_windows": windows[:8],
        "top_window": top_windows[0] if top_windows else None,
        "summary": summary,
        "disclaimer": (
            "Marriage timing is a highly specialised area of Jyotish that requires analysis "
            "of multiple charts (D1, D9), transits, and consultation with a qualified Jyotishi. "
            "This reading is indicative only and does not constitute personal, legal, or relationship advice."
        ),
    }


def _marriage_window_reason(planet: str, seventh_lord: str, planets_in_7th: list[str]) -> str:
    reasons: list[str] = []
    if planet == seventh_lord:
        reasons.append(f"{planet} is the 7th lord — its dasha directly activates the house of marriage")
    if planet == "Venus":
        reasons.append("Venus is the natural karaka of love and partnerships")
    if planet == "Jupiter":
        reasons.append("Jupiter dasha often brings auspicious events including marriage")
    if planet == "Rahu":
        reasons.append("Rahu dasha can trigger sudden or unconventional unions")
    if planet in planets_in_7th:
        reasons.append(f"{planet} is placed in the 7th house — its dasha activates it directly")
    if not reasons:
        reasons.append(f"{planet} dasha — moderate marriage potential based on classical rules")
    return "; ".join(reasons)
