from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


class Citation(BaseModel):
    source_id: str
    title: str
    locator: str
    confidence: float = Field(ge=0, le=1)


class BirthInput(BaseModel):
    date: str
    time: str
    timezone: str
    location: str
    latitude: float
    longitude: float


class KundliReportRequest(BaseModel):
    profile_id: str
    birth: BirthInput
    question: str
    ayanamsha: str = "Lahiri"


class KundliReportResponse(BaseModel):
    mode: str
    deterministic_facts: dict[str, Any]
    narrative: str
    chart_elements_used: list[str]
    citations: list[Citation]
    disclaimers: list[str]


class RectificationEvent(BaseModel):
    title: str
    date: str
    description: str


class BirthRectificationRequest(BaseModel):
    profile_id: str
    birth_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time_window_start: str = Field(pattern=r"^\d{2}:\d{2}$")
    time_window_end: str = Field(pattern=r"^\d{2}:\d{2}$")
    timezone: str
    events: list[RectificationEvent]

    @model_validator(mode="after")
    def check_window_order(self) -> "BirthRectificationRequest":
        if self.time_window_start >= self.time_window_end:
            raise ValueError("time_window_start must be before time_window_end")
        return self


class BirthRectificationResponse(BaseModel):
    proposed_window: str
    confidence_band: str
    rationale: str
    disclaimers: list[str]


class VaastuInput(BaseModel):
    facing_direction: str
    rooms: dict[str, str]
    entrance: str
    notes: Optional[str] = None


class VaastuReportRequest(BaseModel):
    profile_id: str
    layout: VaastuInput
    include_video: bool = False


class VaastuReportResponse(BaseModel):
    report_markdown: str
    checklist: list[str]
    safety_notes: list[str]
    citations: list[Citation]


class VideoRequest(BaseModel):
    profile_id: str
    topic: str
    payload: dict[str, Any]


class VideoJobResponse(BaseModel):
    job_id: str
    status: str
    playback_url: Optional[str] = None


class BillingNotification(BaseModel):
    provider: str
    payload: dict[str, Any]


class EntitlementContext(BaseModel):
    user_id: str
    plan: str
    entitlements: list[str]


class ConsultSessionRequest(BaseModel):
    profile_id: str
    mode: str = Field(pattern="^(chat|voice|video)$")
    consent_recording: bool
    consent_transcription: bool
    consent_memory: bool


class ConsultSessionResponse(BaseModel):
    session_id: str
    rtc_url: str
    token_hint: str
    retention_policy: str


class TarotRequest(BaseModel):
    profile_id: str
    spread: str = "three-card"
    intention: str


class TarotCard(BaseModel):
    position: str
    card: str
    meaning: str


class TarotResponse(BaseModel):
    spread: str
    cards: list[TarotCard]
    reflection: str
    disclaimer: str


class NumerologyRequest(BaseModel):
    profile_id: str
    full_name: str = Field(min_length=2, max_length=120)
    birth_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class NumerologyResponse(BaseModel):
    life_path_number: int
    expression_number: int
    interpretation: str
    disclaimer: str


class MantraPlanRequest(BaseModel):
    profile_id: str
    focus_area: str
    minutes_per_day: int = Field(ge=5, le=120, default=15)
    days_per_week: int = Field(ge=1, le=7, default=5)


class MantraPlanResponse(BaseModel):
    suggested_mantra: str
    schedule: str
    practice_steps: list[str]
    disclaimer: str


class RashifalRequest(BaseModel):
    profile_id: str
    sign: str
    horizon: str = Field(pattern="^(daily|weekly|monthly)$", default="daily")


class RashifalResponse(BaseModel):
    sign: str
    horizon: str
    insight: str
    influence_panel: list[str]
    disclaimer: str


class GemGuidanceRequest(BaseModel):
    profile_id: str
    primary_planet: str
    budget_band: str
    intention: str


class GemGuidanceResponse(BaseModel):
    recommendation: str
    due_diligence_checklist: list[str]
    disclaimers: list[str]


class TalkToKundliRequest(BaseModel):
    profile_id: str
    birth: BirthInput
    query: str


class TalkToKundliResponse(BaseModel):
    mode: str
    answer: str
    chart_elements_used: list[str]
    citations: list[Citation]
    disclaimer: str


class PersonProfile(BaseModel):
    profile_id: str
    name: str
    birth: BirthInput


class MatchmakingRequest(BaseModel):
    seeker: PersonProfile
    partner: PersonProfile
    rubric: str = "guna-milan-core"


class MatchmakingResponse(BaseModel):
    compatibility_score: int = Field(ge=0, le=100)
    strengths: list[str]
    watchouts: list[str]
    compatibility_paths: list[str]
    disclaimer: str


class PanchangRequest(BaseModel):
    profile_id: str
    date: str
    timezone: str
    location: str


class PanchangResponse(BaseModel):
    date: str
    timezone: str
    location: str
    tithi: str
    nakshatra: str
    yoga: str
    karana: str
    vara: str
    notes: list[str]
    disclaimer: str


class MuhurtaRequest(BaseModel):
    profile_id: str
    intent: str
    date_from: str
    date_to: str
    timezone: str
    constraints: list[str] = Field(default_factory=list)


class MuhurtaWindow(BaseModel):
    start: str
    end: str
    score: int = Field(ge=0, le=100)
    why: list[str]
    why_not: list[str]


class MuhurtaResponse(BaseModel):
    intent: str
    windows: list[MuhurtaWindow]
    disclaimer: str


class ConsultSummaryRequest(BaseModel):
    session_id: str
    profile_id: str
    transcript_excerpt: str
    requested_focus: str


class ConsultSummaryResponse(BaseModel):
    summary: str
    action_plan: list[str]
    disclaimer: str


class PrivacyDeletionRequest(BaseModel):
    user_id: str
    scope: str = Field(pattern="^(profile|consults|media|all)$")
    reason: Optional[str] = None


class PrivacyDeletionResponse(BaseModel):
    request_id: str
    status: str
    note: str


class BusinessCatalogItem(BaseModel):
    id: str
    name: str
    kind: str = Field(pattern="^(plan|addon|bundle|offer)$")
    price_usd: float = Field(ge=0)
    description: str
    entitlement_keys: list[str] = Field(default_factory=list)


class BusinessCatalogResponse(BaseModel):
    plans: list[BusinessCatalogItem]
    addons: list[BusinessCatalogItem]
    bundles: list[BusinessCatalogItem]
    offers: list[BusinessCatalogItem]


class SubscriptionChangeRequest(BaseModel):
    user_id: str
    plan: str = Field(pattern="^(free|plus|pro|elite)$")
    source: str = Field(default="web", pattern="^(web|stripe|apple|google|admin)$")
    external_ref: Optional[str] = None


class SubscriptionRevokeRequest(BaseModel):
    user_id: str
    source: str = Field(default="admin", pattern="^(web|stripe|apple|google|admin)$")
    reason: Optional[str] = None


class SubscriptionStatusResponse(BaseModel):
    user_id: str
    plan: str
    status: str
    source: str
    entitlements: list[str]
    addons: list[str]
    updated_at: str


class AddonPurchaseRequest(BaseModel):
    user_id: str
    addon_id: str
    source: str = Field(default="web", pattern="^(web|stripe|apple|google|admin)$")


class AddonRevokeRequest(BaseModel):
    user_id: str
    addon_id: str
    source: str = Field(default="admin", pattern="^(web|stripe|apple|google|admin)$")
    reason: Optional[str] = None


class AddonPurchaseResponse(BaseModel):
    user_id: str
    addon_id: str
    status: str
    entitlements: list[str]
    updated_at: str


class WalletTopupRequest(BaseModel):
    user_id: str
    credits: int = Field(ge=1, le=100000)
    amount_usd: float = Field(ge=0.0)
    source: str = Field(default="web", pattern="^(web|stripe|apple|google|admin)$")
    reference_id: Optional[str] = None


class WalletDebitRequest(BaseModel):
    user_id: str
    credits: int = Field(ge=1, le=100000)
    reason: str
    reference_id: Optional[str] = None


class WalletLedgerEntry(BaseModel):
    id: int
    delta_credits: int
    reason: str
    reference_id: Optional[str]
    created_at: str


class WalletResponse(BaseModel):
    user_id: str
    balance_credits: int
    ledger: list[WalletLedgerEntry]


class BundlePurchaseRequest(BaseModel):
    user_id: str
    bundle_id: str
    source: str = Field(default="web", pattern="^(web|stripe|apple|google|admin)$")


class BundlePurchaseResponse(BaseModel):
    purchase_id: str
    user_id: str
    bundle_id: str
    credits_added: int
    perks: list[str]
    wallet_balance: int
    note: str


class OfferClaimRequest(BaseModel):
    user_id: str
    offer_id: str


class OfferClaimResponse(BaseModel):
    claim_id: str
    user_id: str
    offer_id: str
    status: str
    credits_added: int
    wallet_balance: int
    note: str


class ReviewCreateRequest(BaseModel):
    user_id: str
    module: str = Field(pattern="^(kundli|matchmaking|rashifal|panchang|vaastu|gem|consult|tarot|numerology|mantra)$")
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=3, max_length=120)
    body: str = Field(min_length=10, max_length=1200)
    verified_purchase_id: Optional[str] = None


class ReviewModerationRequest(BaseModel):
    moderator_id: str
    action: str = Field(pattern="^(approved|rejected|flagged)$")
    reason: Optional[str] = None


class ReviewResponse(BaseModel):
    review_id: str
    user_id: str
    module: str
    rating: int
    title: str
    body: str
    verified_purchase: bool
    moderation_status: str
    moderation_reason: Optional[str] = None
    created_at: str
    updated_at: str


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]


class DisputeCreateRequest(BaseModel):
    user_id: str
    category: str = Field(pattern="^(billing|service|content|refund|consult)$")
    reference_id: str
    description: str = Field(min_length=10, max_length=1500)


class DisputeResolveRequest(BaseModel):
    agent_id: str
    status: str = Field(pattern="^(resolved|rejected|needs-info)$")
    resolution_note: str = Field(min_length=3, max_length=1200)


class DisputeResponse(BaseModel):
    dispute_id: str
    user_id: str
    category: str
    reference_id: str
    description: str
    status: str
    resolution_note: Optional[str] = None
    created_at: str
    updated_at: str


class DisputeListResponse(BaseModel):
    disputes: list[DisputeResponse]


class RefundCreateRequest(BaseModel):
    user_id: str
    reference_id: str
    reason: str = Field(min_length=5, max_length=1200)
    amount_usd: Optional[float] = Field(default=None, ge=0.0)
    source: str = Field(default="web", pattern="^(web|stripe|apple|google|admin)$")


class RefundResolveRequest(BaseModel):
    agent_id: str
    status: str = Field(pattern="^(approved|rejected|processed)$")
    resolution_note: str = Field(min_length=3, max_length=1200)


class RefundResponse(BaseModel):
    refund_id: str
    user_id: str
    reference_id: str
    amount_usd: Optional[float] = None
    reason: str
    status: str
    resolution_note: Optional[str] = None
    source: str
    created_at: str
    updated_at: str


class RefundListResponse(BaseModel):
    refunds: list[RefundResponse]


class BillingEventResponse(BaseModel):
    id: int
    provider: str
    event_type: Optional[str] = None
    app_user_id: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    external_ref: Optional[str] = None
    created_at: str


class BillingEventListResponse(BaseModel):
    events: list[BillingEventResponse]


class AnalyticsEventRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    page: str = Field(min_length=1, max_length=300)
    session_id: Optional[str] = Field(default=None, max_length=120)
    source: str = Field(default="web", pattern="^(web|mobile|system)$")
    severity: str = Field(default="info", pattern="^(info|warning|error)$")
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyticsEventResponse(BaseModel):
    event_id: str
    status: str
    created_at: str


class SubscriptionEventResponse(BaseModel):
    event_id: str
    user_id: str
    provider: str
    event_type: Optional[str] = None
    old_plan: Optional[str] = None
    new_plan: Optional[str] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    external_ref: Optional[str] = None
    created_at: str


class SubscriptionEventListResponse(BaseModel):
    events: list[SubscriptionEventResponse]
