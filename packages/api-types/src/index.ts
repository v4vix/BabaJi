/**
 * @cortex/api-types
 *
 * Shared Zod schemas and TypeScript types mirroring the Python Pydantic models
 * in services/api/app/schemas.py. Field names are snake_case to match the API
 * wire format exactly — do NOT camelCase them.
 *
 * Import in consumers:
 *   import { KundliReportRequestSchema, type KundliReportResponse } from "@cortex/api-types"
 */

import { z } from "zod";

// ── Shared primitives ─────────────────────────────────────────────────────────

export const CitationSchema = z.object({
  source_id: z.string(),
  title: z.string(),
  locator: z.string(),
  confidence: z.number().min(0).max(1),
});
export type Citation = z.infer<typeof CitationSchema>;

export const BirthInputSchema = z.object({
  date: z.string(),
  time: z.string(),
  timezone: z.string(),
  location: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});
export type BirthInput = z.infer<typeof BirthInputSchema>;

// ── Kundli ────────────────────────────────────────────────────────────────────

export const KundliReportRequestSchema = z.object({
  profile_id: z.string(),
  birth: BirthInputSchema,
  question: z.string(),
  ayanamsha: z.string().default("Lahiri"),
});
export type KundliReportRequest = z.infer<typeof KundliReportRequestSchema>;

export const KundliReportResponseSchema = z.object({
  mode: z.string(),
  deterministic_facts: z.record(z.unknown()),
  narrative: z.string(),
  chart_elements_used: z.array(z.string()),
  citations: z.array(CitationSchema),
  disclaimers: z.array(z.string()),
});
export type KundliReportResponse = z.infer<typeof KundliReportResponseSchema>;

// ── Birth Rectification ───────────────────────────────────────────────────────

export const RectificationEventSchema = z.object({
  title: z.string(),
  date: z.string(),
  description: z.string(),
});
export type RectificationEvent = z.infer<typeof RectificationEventSchema>;

export const BirthRectificationRequestSchema = z.object({
  profile_id: z.string(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_window_start: z.string().regex(/^\d{2}:\d{2}$/),
  time_window_end: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
  events: z.array(RectificationEventSchema),
});
export type BirthRectificationRequest = z.infer<typeof BirthRectificationRequestSchema>;

export const BirthRectificationResponseSchema = z.object({
  proposed_window: z.string(),
  confidence_band: z.string(),
  rationale: z.string(),
  disclaimers: z.array(z.string()),
});
export type BirthRectificationResponse = z.infer<typeof BirthRectificationResponseSchema>;

// ── Vaastu ────────────────────────────────────────────────────────────────────

export const VaastuInputSchema = z.object({
  facing_direction: z.string(),
  rooms: z.record(z.string()),
  entrance: z.string(),
  notes: z.string().optional(),
});
export type VaastuInput = z.infer<typeof VaastuInputSchema>;

export const VaastuReportRequestSchema = z.object({
  profile_id: z.string(),
  layout: VaastuInputSchema,
  include_video: z.boolean().default(false),
});
export type VaastuReportRequest = z.infer<typeof VaastuReportRequestSchema>;

export const VaastuReportResponseSchema = z.object({
  report_markdown: z.string(),
  checklist: z.array(z.string()),
  safety_notes: z.array(z.string()),
  citations: z.array(CitationSchema),
});
export type VaastuReportResponse = z.infer<typeof VaastuReportResponseSchema>;

// ── Video ─────────────────────────────────────────────────────────────────────

export const VideoRequestSchema = z.object({
  profile_id: z.string(),
  topic: z.string(),
  payload: z.record(z.unknown()),
});
export type VideoRequest = z.infer<typeof VideoRequestSchema>;

export const VideoJobResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  playback_url: z.string().optional(),
});
export type VideoJobResponse = z.infer<typeof VideoJobResponseSchema>;

// ── Billing / Entitlements ────────────────────────────────────────────────────

export const BillingNotificationSchema = z.object({
  provider: z.string(),
  payload: z.record(z.unknown()),
});
export type BillingNotification = z.infer<typeof BillingNotificationSchema>;

export const EntitlementContextSchema = z.object({
  user_id: z.string(),
  plan: z.string(),
  entitlements: z.array(z.string()),
});
export type EntitlementContext = z.infer<typeof EntitlementContextSchema>;

// ── Consult ───────────────────────────────────────────────────────────────────

export const ConsultSessionRequestSchema = z.object({
  profile_id: z.string(),
  mode: z.enum(["chat", "voice", "video"]),
  consent_recording: z.boolean(),
  consent_transcription: z.boolean(),
  consent_memory: z.boolean(),
});
export type ConsultSessionRequest = z.infer<typeof ConsultSessionRequestSchema>;

export const ConsultSessionResponseSchema = z.object({
  session_id: z.string(),
  rtc_url: z.string(),
  token_hint: z.string(),
  retention_policy: z.string(),
});
export type ConsultSessionResponse = z.infer<typeof ConsultSessionResponseSchema>;

export const ConsultSummaryRequestSchema = z.object({
  session_id: z.string(),
  profile_id: z.string(),
  transcript_excerpt: z.string(),
  requested_focus: z.string(),
});
export type ConsultSummaryRequest = z.infer<typeof ConsultSummaryRequestSchema>;

export const ConsultSummaryResponseSchema = z.object({
  summary: z.string(),
  action_plan: z.array(z.string()),
  disclaimer: z.string(),
});
export type ConsultSummaryResponse = z.infer<typeof ConsultSummaryResponseSchema>;

// ── Tarot ─────────────────────────────────────────────────────────────────────

export const TarotRequestSchema = z.object({
  profile_id: z.string(),
  spread: z.string().default("three-card"),
  intention: z.string(),
});
export type TarotRequest = z.infer<typeof TarotRequestSchema>;

export const TarotCardSchema = z.object({
  position: z.string(),
  card: z.string(),
  meaning: z.string(),
});
export type TarotCard = z.infer<typeof TarotCardSchema>;

export const TarotResponseSchema = z.object({
  spread: z.string(),
  cards: z.array(TarotCardSchema),
  reflection: z.string(),
  disclaimer: z.string(),
});
export type TarotResponse = z.infer<typeof TarotResponseSchema>;

// ── Numerology ────────────────────────────────────────────────────────────────

export const NumerologyRequestSchema = z.object({
  profile_id: z.string(),
  full_name: z.string().min(2).max(120),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type NumerologyRequest = z.infer<typeof NumerologyRequestSchema>;

export const NumerologyResponseSchema = z.object({
  life_path_number: z.number().int(),
  expression_number: z.number().int(),
  interpretation: z.string(),
  disclaimer: z.string(),
});
export type NumerologyResponse = z.infer<typeof NumerologyResponseSchema>;

// ── Mantra ────────────────────────────────────────────────────────────────────

export const MantraPlanRequestSchema = z.object({
  profile_id: z.string(),
  focus_area: z.string(),
  minutes_per_day: z.number().int().min(5).max(120).default(15),
  days_per_week: z.number().int().min(1).max(7).default(5),
});
export type MantraPlanRequest = z.infer<typeof MantraPlanRequestSchema>;

export const MantraPlanResponseSchema = z.object({
  suggested_mantra: z.string(),
  schedule: z.string(),
  practice_steps: z.array(z.string()),
  disclaimer: z.string(),
});
export type MantraPlanResponse = z.infer<typeof MantraPlanResponseSchema>;

// ── Rashifal ──────────────────────────────────────────────────────────────────

export const RashifalRequestSchema = z.object({
  profile_id: z.string(),
  sign: z.string(),
  horizon: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});
export type RashifalRequest = z.infer<typeof RashifalRequestSchema>;

export const RashifalResponseSchema = z.object({
  sign: z.string(),
  horizon: z.string(),
  insight: z.string(),
  influence_panel: z.array(z.string()),
  disclaimer: z.string(),
});
export type RashifalResponse = z.infer<typeof RashifalResponseSchema>;

// ── Gem Guidance ──────────────────────────────────────────────────────────────

export const GemGuidanceRequestSchema = z.object({
  profile_id: z.string(),
  primary_planet: z.string(),
  budget_band: z.string(),
  intention: z.string(),
});
export type GemGuidanceRequest = z.infer<typeof GemGuidanceRequestSchema>;

export const GemGuidanceResponseSchema = z.object({
  recommendation: z.string(),
  due_diligence_checklist: z.array(z.string()),
  disclaimers: z.array(z.string()),
});
export type GemGuidanceResponse = z.infer<typeof GemGuidanceResponseSchema>;

// ── Talk to Kundli ────────────────────────────────────────────────────────────

export const TalkToKundliRequestSchema = z.object({
  profile_id: z.string(),
  birth: BirthInputSchema,
  query: z.string(),
});
export type TalkToKundliRequest = z.infer<typeof TalkToKundliRequestSchema>;

export const TalkToKundliResponseSchema = z.object({
  mode: z.string(),
  answer: z.string(),
  chart_elements_used: z.array(z.string()),
  citations: z.array(CitationSchema),
  disclaimer: z.string(),
});
export type TalkToKundliResponse = z.infer<typeof TalkToKundliResponseSchema>;

// ── Matchmaking ───────────────────────────────────────────────────────────────

export const PersonProfileSchema = z.object({
  profile_id: z.string(),
  name: z.string(),
  birth: BirthInputSchema,
});
export type PersonProfile = z.infer<typeof PersonProfileSchema>;

export const MatchmakingRequestSchema = z.object({
  seeker: PersonProfileSchema,
  partner: PersonProfileSchema,
  rubric: z.string().default("guna-milan-core"),
});
export type MatchmakingRequest = z.infer<typeof MatchmakingRequestSchema>;

export const MatchmakingResponseSchema = z.object({
  compatibility_score: z.number().int().min(0).max(100),
  strengths: z.array(z.string()),
  watchouts: z.array(z.string()),
  compatibility_paths: z.array(z.string()),
  disclaimer: z.string(),
});
export type MatchmakingResponse = z.infer<typeof MatchmakingResponseSchema>;

// ── Panchang ──────────────────────────────────────────────────────────────────

export const PanchangRequestSchema = z.object({
  profile_id: z.string(),
  date: z.string(),
  timezone: z.string(),
  location: z.string(),
});
export type PanchangRequest = z.infer<typeof PanchangRequestSchema>;

export const PanchangResponseSchema = z.object({
  date: z.string(),
  timezone: z.string(),
  location: z.string(),
  tithi: z.string(),
  nakshatra: z.string(),
  yoga: z.string(),
  karana: z.string(),
  vara: z.string(),
  notes: z.array(z.string()),
  disclaimer: z.string(),
});
export type PanchangResponse = z.infer<typeof PanchangResponseSchema>;

// ── Muhurta ───────────────────────────────────────────────────────────────────

export const MuhurtaRequestSchema = z.object({
  profile_id: z.string(),
  intent: z.string(),
  date_from: z.string(),
  date_to: z.string(),
  timezone: z.string(),
  constraints: z.array(z.string()).default([]),
});
export type MuhurtaRequest = z.infer<typeof MuhurtaRequestSchema>;

export const MuhurtaWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
  score: z.number().int().min(0).max(100),
  why: z.array(z.string()),
  why_not: z.array(z.string()),
});
export type MuhurtaWindow = z.infer<typeof MuhurtaWindowSchema>;

export const MuhurtaResponseSchema = z.object({
  intent: z.string(),
  windows: z.array(MuhurtaWindowSchema),
  disclaimer: z.string(),
});
export type MuhurtaResponse = z.infer<typeof MuhurtaResponseSchema>;

// ── Privacy ───────────────────────────────────────────────────────────────────

export const PrivacyDeletionRequestSchema = z.object({
  user_id: z.string(),
  scope: z.enum(["profile", "consults", "media", "all"]),
  reason: z.string().optional(),
});
export type PrivacyDeletionRequest = z.infer<typeof PrivacyDeletionRequestSchema>;

export const PrivacyDeletionResponseSchema = z.object({
  request_id: z.string(),
  status: z.string(),
  note: z.string(),
});
export type PrivacyDeletionResponse = z.infer<typeof PrivacyDeletionResponseSchema>;

// ── Business / Catalog ────────────────────────────────────────────────────────

export const BusinessCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["plan", "addon", "bundle", "offer"]),
  price_usd: z.number().min(0),
  description: z.string(),
  entitlement_keys: z.array(z.string()).default([]),
});
export type BusinessCatalogItem = z.infer<typeof BusinessCatalogItemSchema>;

export const BusinessCatalogResponseSchema = z.object({
  plans: z.array(BusinessCatalogItemSchema),
  addons: z.array(BusinessCatalogItemSchema),
  bundles: z.array(BusinessCatalogItemSchema),
  offers: z.array(BusinessCatalogItemSchema),
});
export type BusinessCatalogResponse = z.infer<typeof BusinessCatalogResponseSchema>;

// ── Subscription ──────────────────────────────────────────────────────────────

export const SubscriptionChangeRequestSchema = z.object({
  user_id: z.string(),
  plan: z.enum(["free", "plus", "pro", "elite"]),
  source: z.enum(["web", "stripe", "apple", "google", "admin"]).default("web"),
  external_ref: z.string().optional(),
});
export type SubscriptionChangeRequest = z.infer<typeof SubscriptionChangeRequestSchema>;

export const SubscriptionRevokeRequestSchema = z.object({
  user_id: z.string(),
  source: z.enum(["web", "stripe", "apple", "google", "admin"]).default("admin"),
  reason: z.string().optional(),
});
export type SubscriptionRevokeRequest = z.infer<typeof SubscriptionRevokeRequestSchema>;

export const SubscriptionStatusResponseSchema = z.object({
  user_id: z.string(),
  plan: z.string(),
  status: z.string(),
  source: z.string(),
  entitlements: z.array(z.string()),
  addons: z.array(z.string()),
  updated_at: z.string(),
});
export type SubscriptionStatusResponse = z.infer<typeof SubscriptionStatusResponseSchema>;

// ── Addon ─────────────────────────────────────────────────────────────────────

export const AddonPurchaseRequestSchema = z.object({
  user_id: z.string(),
  addon_id: z.string(),
  source: z.enum(["web", "stripe", "apple", "google", "admin"]).default("web"),
});
export type AddonPurchaseRequest = z.infer<typeof AddonPurchaseRequestSchema>;

export const AddonRevokeRequestSchema = z.object({
  user_id: z.string(),
  addon_id: z.string(),
  source: z.enum(["web", "stripe", "apple", "google", "admin"]).default("admin"),
  reason: z.string().optional(),
});
export type AddonRevokeRequest = z.infer<typeof AddonRevokeRequestSchema>;

export const AddonPurchaseResponseSchema = z.object({
  user_id: z.string(),
  addon_id: z.string(),
  status: z.string(),
  entitlements: z.array(z.string()),
  updated_at: z.string(),
});
export type AddonPurchaseResponse = z.infer<typeof AddonPurchaseResponseSchema>;

// ── Wallet ────────────────────────────────────────────────────────────────────

export const WalletTopupRequestSchema = z.object({
  user_id: z.string(),
  credits: z.number().int().min(1).max(100000),
  amount_usd: z.number().min(0),
  source: z.enum(["web", "stripe", "apple", "google", "admin"]).default("web"),
  reference_id: z.string().optional(),
});
export type WalletTopupRequest = z.infer<typeof WalletTopupRequestSchema>;

export const WalletDebitRequestSchema = z.object({
  user_id: z.string(),
  credits: z.number().int().min(1).max(100000),
  reason: z.string(),
  reference_id: z.string().optional(),
});
export type WalletDebitRequest = z.infer<typeof WalletDebitRequestSchema>;

export const WalletLedgerEntrySchema = z.object({
  id: z.number().int(),
  delta_credits: z.number().int(),
  reason: z.string(),
  reference_id: z.string().nullable(),
  created_at: z.string(),
});
export type WalletLedgerEntry = z.infer<typeof WalletLedgerEntrySchema>;

export const WalletResponseSchema = z.object({
  user_id: z.string(),
  balance_credits: z.number().int(),
  ledger: z.array(WalletLedgerEntrySchema),
});
export type WalletResponse = z.infer<typeof WalletResponseSchema>;

// ── Bundle ────────────────────────────────────────────────────────────────────

export const BundlePurchaseRequestSchema = z.object({
  user_id: z.string(),
  bundle_id: z.string(),
  source: z.enum(["web", "stripe", "apple", "google", "admin"]).default("web"),
});
export type BundlePurchaseRequest = z.infer<typeof BundlePurchaseRequestSchema>;

export const BundlePurchaseResponseSchema = z.object({
  purchase_id: z.string(),
  user_id: z.string(),
  bundle_id: z.string(),
  credits_added: z.number().int(),
  perks: z.array(z.string()),
  wallet_balance: z.number().int(),
  note: z.string(),
});
export type BundlePurchaseResponse = z.infer<typeof BundlePurchaseResponseSchema>;

// ── Offer ─────────────────────────────────────────────────────────────────────

export const OfferClaimRequestSchema = z.object({
  user_id: z.string(),
  offer_id: z.string(),
});
export type OfferClaimRequest = z.infer<typeof OfferClaimRequestSchema>;

export const OfferClaimResponseSchema = z.object({
  claim_id: z.string(),
  user_id: z.string(),
  offer_id: z.string(),
  status: z.string(),
  credits_added: z.number().int(),
  wallet_balance: z.number().int(),
  note: z.string(),
});
export type OfferClaimResponse = z.infer<typeof OfferClaimResponseSchema>;

// ── Reviews ───────────────────────────────────────────────────────────────────

export const ReviewCreateRequestSchema = z.object({
  user_id: z.string(),
  module: z.enum(["kundli", "matchmaking", "rashifal", "panchang", "vaastu", "gem", "consult", "tarot", "numerology", "mantra"]),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(120),
  body: z.string().min(10).max(1200),
  verified_purchase_id: z.string().optional(),
});
export type ReviewCreateRequest = z.infer<typeof ReviewCreateRequestSchema>;

export const ReviewModerationRequestSchema = z.object({
  moderator_id: z.string(),
  action: z.enum(["approved", "rejected", "flagged"]),
  reason: z.string().optional(),
});
export type ReviewModerationRequest = z.infer<typeof ReviewModerationRequestSchema>;

export const ReviewResponseSchema = z.object({
  review_id: z.string(),
  user_id: z.string(),
  module: z.string(),
  rating: z.number().int(),
  title: z.string(),
  body: z.string(),
  verified_purchase: z.boolean(),
  moderation_status: z.string(),
  moderation_reason: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export const ReviewListResponseSchema = z.object({
  reviews: z.array(ReviewResponseSchema),
});
export type ReviewListResponse = z.infer<typeof ReviewListResponseSchema>;

// ── Disputes ──────────────────────────────────────────────────────────────────

export const DisputeCreateRequestSchema = z.object({
  user_id: z.string(),
  category: z.enum(["billing", "service", "content", "refund", "consult"]),
  reference_id: z.string(),
  description: z.string().min(10).max(1500),
});
export type DisputeCreateRequest = z.infer<typeof DisputeCreateRequestSchema>;

export const DisputeResolveRequestSchema = z.object({
  agent_id: z.string(),
  status: z.enum(["resolved", "rejected", "needs-info"]),
  resolution_note: z.string().min(3).max(1200),
});
export type DisputeResolveRequest = z.infer<typeof DisputeResolveRequestSchema>;

export const DisputeResponseSchema = z.object({
  dispute_id: z.string(),
  user_id: z.string(),
  category: z.string(),
  reference_id: z.string(),
  description: z.string(),
  status: z.string(),
  resolution_note: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DisputeResponse = z.infer<typeof DisputeResponseSchema>;

export const DisputeListResponseSchema = z.object({
  disputes: z.array(DisputeResponseSchema),
});
export type DisputeListResponse = z.infer<typeof DisputeListResponseSchema>;

// ── Refunds ───────────────────────────────────────────────────────────────────

export const RefundCreateRequestSchema = z.object({
  user_id: z.string(),
  reference_id: z.string(),
  reason: z.string().min(5).max(1200),
  amount_usd: z.number().min(0).optional(),
  source: z.enum(["web", "stripe", "apple", "google", "admin"]).default("web"),
});
export type RefundCreateRequest = z.infer<typeof RefundCreateRequestSchema>;

export const RefundResolveRequestSchema = z.object({
  agent_id: z.string(),
  status: z.enum(["approved", "rejected", "processed"]),
  resolution_note: z.string().min(3).max(1200),
});
export type RefundResolveRequest = z.infer<typeof RefundResolveRequestSchema>;

export const RefundResponseSchema = z.object({
  refund_id: z.string(),
  user_id: z.string(),
  reference_id: z.string(),
  amount_usd: z.number().nullable().optional(),
  reason: z.string(),
  status: z.string(),
  resolution_note: z.string().nullable().optional(),
  source: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const RefundListResponseSchema = z.object({
  refunds: z.array(RefundResponseSchema),
});
export type RefundListResponse = z.infer<typeof RefundListResponseSchema>;

// ── Billing Events ────────────────────────────────────────────────────────────

export const BillingEventResponseSchema = z.object({
  id: z.number().int(),
  provider: z.string(),
  event_type: z.string().nullable().optional(),
  app_user_id: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  external_ref: z.string().nullable().optional(),
  created_at: z.string(),
});
export type BillingEventResponse = z.infer<typeof BillingEventResponseSchema>;

export const BillingEventListResponseSchema = z.object({
  events: z.array(BillingEventResponseSchema),
});
export type BillingEventListResponse = z.infer<typeof BillingEventListResponseSchema>;

// ── Analytics ─────────────────────────────────────────────────────────────────

export const AnalyticsEventRequestSchema = z.object({
  name: z.string().min(2).max(120),
  page: z.string().min(1).max(300),
  session_id: z.string().max(120).optional(),
  source: z.enum(["web", "mobile", "system"]).default("web"),
  severity: z.enum(["info", "warning", "error"]).default("info"),
  metadata: z.record(z.unknown()).default({}),
});
export type AnalyticsEventRequest = z.infer<typeof AnalyticsEventRequestSchema>;

export const AnalyticsEventResponseSchema = z.object({
  event_id: z.string(),
  status: z.string(),
  created_at: z.string(),
});
export type AnalyticsEventResponse = z.infer<typeof AnalyticsEventResponseSchema>;

// ── Subscription Events ───────────────────────────────────────────────────────

export const SubscriptionEventResponseSchema = z.object({
  event_id: z.string(),
  user_id: z.string(),
  provider: z.string(),
  event_type: z.string().nullable().optional(),
  old_plan: z.string().nullable().optional(),
  new_plan: z.string().nullable().optional(),
  old_status: z.string().nullable().optional(),
  new_status: z.string().nullable().optional(),
  external_ref: z.string().nullable().optional(),
  created_at: z.string(),
});
export type SubscriptionEventResponse = z.infer<typeof SubscriptionEventResponseSchema>;

export const SubscriptionEventListResponseSchema = z.object({
  events: z.array(SubscriptionEventResponseSchema),
});
export type SubscriptionEventListResponse = z.infer<typeof SubscriptionEventListResponseSchema>;

// ── Sade Sati ─────────────────────────────────────────────────────────────────

export const SadeSatiRequestSchema = z.object({
  birth: BirthInputSchema,
  query_time_iso: z.string().optional(),
});
export type SadeSatiRequest = z.infer<typeof SadeSatiRequestSchema>;

export const SadeSatiResponseSchema = z.object({
  natal_moon_sign: z.string(),
  current_saturn_sign: z.string(),
  sade_sati_active: z.boolean(),
  phase: z.number().int().nullable().optional(),
  phase_description: z.string().nullable().optional(),
  days_remaining_in_phase: z.number().int().nullable().optional(),
  years_remaining_in_phase: z.number().nullable().optional(),
  days_to_next_sade_sati: z.number().int().nullable().optional(),
  years_to_next_sade_sati: z.number().nullable().optional(),
  summary: z.string(),
  remedies: z.array(z.string()),
});
export type SadeSatiResponse = z.infer<typeof SadeSatiResponseSchema>;

// ── Ashtakavarga ──────────────────────────────────────────────────────────────

export const AshtakavargaRequestSchema = z.object({
  birth: BirthInputSchema,
});
export type AshtakavargaRequest = z.infer<typeof AshtakavargaRequestSchema>;

export const AshtakavargaResponseSchema = z.object({
  sarva_ashtakavarga: z.array(z.record(z.unknown())),
  total_benefic_points: z.number().int(),
  best_transit_signs: z.array(z.string()),
  weakest_signs: z.array(z.string()),
  lagna_ashtakavarga_score: z.number().int(),
  summary: z.string(),
});
export type AshtakavargaResponse = z.infer<typeof AshtakavargaResponseSchema>;

// ── Prashna ───────────────────────────────────────────────────────────────────

export const PrashnaRequestSchema = z.object({
  question: z.string().min(5).max(500),
  latitude: z.number().default(28.6139),
  longitude: z.number().default(77.209),
  timezone: z.string().default("Asia/Kolkata"),
  query_time_iso: z.string().optional(),
});
export type PrashnaRequest = z.infer<typeof PrashnaRequestSchema>;

export const PrashnaResponseSchema = z.object({
  question: z.string(),
  prashna_lagna: z.string(),
  prashna_lagna_lord: z.string(),
  moon_sign: z.string(),
  moon_nakshatra: z.string(),
  moon_waxing: z.boolean(),
  primary_house: z.number().int(),
  primary_house_signification: z.string(),
  primary_house_lord: z.string(),
  lord_well_placed: z.boolean(),
  verdict: z.string(),
  summary: z.string(),
  interpretation_context: z.string(),
  disclaimers: z.array(z.string()),
});
export type PrashnaResponse = z.infer<typeof PrashnaResponseSchema>;

// ── Device Auth (mobile) ──────────────────────────────────────────────────────
// Not in schemas.py but used by the mobile app's auth flow.

export const DeviceRegisterRequestSchema = z.object({
  user_id: z.string(),
});
export type DeviceRegisterRequest = z.infer<typeof DeviceRegisterRequestSchema>;

export const DeviceRegisterResponseSchema = z.object({
  device_key: z.string(),
});
export type DeviceRegisterResponse = z.infer<typeof DeviceRegisterResponseSchema>;

export const DeviceTokenRequestSchema = z.object({
  user_id: z.string(),
  device_key: z.string(),
});
export type DeviceTokenRequest = z.infer<typeof DeviceTokenRequestSchema>;

export const DeviceTokenResponseSchema = z.object({
  token: z.string(),
  expires_in: z.number(),
});
export type DeviceTokenResponse = z.infer<typeof DeviceTokenResponseSchema>;
