"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getJson, postJson } from "../../lib/api";
import { Surface } from "@cortex/ui";
import { getStoredUser, syncStoredUser, type User } from "../../lib/auth";

type CatalogItem = {
  id: string;
  name: string;
  kind: "plan" | "addon" | "bundle" | "offer";
  price_usd: number;
  description: string;
  entitlement_keys: string[];
};

type CatalogResponse = {
  plans: CatalogItem[];
  addons: CatalogItem[];
  bundles: CatalogItem[];
  offers: CatalogItem[];
};

type SubscriptionStatus = {
  plan: string;
  status: string;
  source: string;
  addons: string[];
  entitlements: string[];
};

type AddonStatus = {
  addon_id: string;
  status: string;
  entitlements: string[];
};

type WalletEntry = {
  delta_credits: number;
  reason: string;
};

type WalletState = {
  balance_credits: number;
  ledger: WalletEntry[];
};

type BundlePurchase = {
  bundle_id: string;
  credits_added: number;
  wallet_balance: number;
};

type OfferClaim = {
  status: string;
  credits_added: number;
  wallet_balance: number;
};

type ReviewItem = {
  review_id: string;
  rating: number;
  title: string;
  moderation_status: string;
  verified_purchase: boolean;
};

type ReviewList = {
  reviews: ReviewItem[];
};

type DisputeItem = {
  dispute_id: string;
  status: string;
  category: string;
  resolution_note?: string;
};

type DisputeList = {
  disputes: DisputeItem[];
};

type RefundItem = {
  refund_id: string;
  status: string;
  reference_id: string;
  amount_usd?: number;
  resolution_note?: string;
};

type RefundList = {
  refunds: RefundItem[];
};

type BillingEvent = {
  provider: string;
  event_type?: string;
  status?: string;
  plan?: string;
};

type BillingEventList = {
  events: BillingEvent[];
};

type SubscriptionEvent = {
  event_type?: string;
  old_status?: string;
  new_status?: string;
};

type SubscriptionEventList = {
  events: SubscriptionEvent[];
};

export default function BusinessPage() {
  const [viewer, setViewer] = useState<User | null>(null);
  const [userId, setUserId] = useState("demo-user");
  const [planHeader, setPlanHeader] = useState("free");

  const [targetPlan, setTargetPlan] = useState("plus");
  const [addonId, setAddonId] = useState("vaastu_studio_addon");
  const [bundleId, setBundleId] = useState("consult_minutes_60");
  const [offerId, setOfferId] = useState("first_session_offer");
  const [topupCredits, setTopupCredits] = useState("300");
  const [topupAmount, setTopupAmount] = useState("10");
  const [debitCredits, setDebitCredits] = useState("100");
  const [debitReason, setDebitReason] = useState("consult booking");
  const [reviewModule, setReviewModule] = useState("vaastu");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewTitle, setReviewTitle] = useState("Clear guidance");
  const [reviewBody, setReviewBody] = useState("Useful report with safe cautions and actionable checklist.");
  const [reviewPurchaseId, setReviewPurchaseId] = useState("order-1001");
  const [reviewIdToModerate, setReviewIdToModerate] = useState("");
  const [reviewAction, setReviewAction] = useState("approved");
  const [reviewReason, setReviewReason] = useState("Verified purchase and compliant language.");
  const [disputeCategory, setDisputeCategory] = useState("billing");
  const [disputeReference, setDisputeReference] = useState("order-1001");
  const [disputeDescription, setDisputeDescription] = useState("Final charge does not match pre-checkout quote.");
  const [disputeIdToResolve, setDisputeIdToResolve] = useState("");
  const [disputeStatus, setDisputeStatus] = useState("resolved");
  const [disputeResolution, setDisputeResolution] = useState("Issue reviewed and wallet credit was issued.");
  const [refundReference, setRefundReference] = useState("order-1001");
  const [refundReason, setRefundReason] = useState("Duplicate charge due to checkout retry.");
  const [refundAmount, setRefundAmount] = useState("9.99");
  const [refundIdToResolve, setRefundIdToResolve] = useState("");
  const [refundStatus, setRefundStatus] = useState("approved");
  const [refundResolution, setRefundResolution] = useState("Approved after payment verification and compliance review.");

  const [stripeLoading, setStripeLoading] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState("");

  const [catalogOut, setCatalogOut] = useState("");
  const [entitlementOut, setEntitlementOut] = useState("");
  const [walletOut, setWalletOut] = useState("");
  const [reviewsOut, setReviewsOut] = useState("");
  const [disputesOut, setDisputesOut] = useState("");
  const [refundsOut, setRefundsOut] = useState("");
  const [auditOut, setAuditOut] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredUser();
    setViewer(stored);
    if (stored?.id) {
      setUserId(stored.id);
      setPlanHeader(stored.plan);
    }
    void syncStoredUser().then((fresh) => {
      if (!fresh) return;
      setViewer(fresh);
      setUserId(fresh.id);
      setPlanHeader(fresh.plan);
    }).catch(() => {});
  }, []);

  const isSupportStaff = viewer?.role === "support" || viewer?.role === "admin";
  const isAdmin = viewer?.role === "admin";

  function authOptions() {
    return { userId, plan: planHeader };
  }

  async function run<T>(action: () => Promise<T>, format: (value: T) => string, setter: (v: string) => void) {
    setError("");
    try {
      const value = await action();
      setter(format(value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  async function handleStripeUpgrade(plan: string) {
    setStripeError("");
    setStripeLoading(plan);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const result = await postJson<{ url: string }>(
        "/v1/billing/stripe/checkout",
        {
          plan,
          success_url: `${origin}/billing/success?plan=${plan}`,
          cancel_url: `${origin}/business`,
        },
        authOptions(),
      );
      window.location.href = result.url;
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Stripe checkout failed");
    } finally {
      setStripeLoading(null);
    }
  }

  return (
    <main>
      <div className="grid two">
        <Surface title="Auth Context">
          {viewer ? (
            <div className="form">
              <p className="small-muted" style={{ margin: 0 }}>
                Signed in as <strong>{viewer.display_name || viewer.email}</strong>.
              </p>
              <Field label="User ID" input={<input className="input" data-testid="business-user-id" value={userId} readOnly />} />
              <Field label="Plan" input={<input className="input" value={viewer.plan} readOnly />} />
              <Field label="Role" input={<input className="input" value={viewer.role ?? "user"} readOnly />} />
            </div>
          ) : (
            <div className="form">
              <p className="small-muted" style={{ margin: 0 }}>
                Local demo headers only work when insecure demo auth is explicitly enabled. Staff actions stay hidden until an admin signs in.
              </p>
              <Field
                label="X-User-Id"
                input={<input className="input" data-testid="business-user-id" value={userId} onChange={(e) => setUserId(e.target.value)} />}
              />
              <Field
                label="X-Plan"
                input={
                  <select className="select" value={planHeader} onChange={(e) => setPlanHeader(e.target.value)}>
                    <option value="free">free</option>
                    <option value="plus">plus</option>
                    <option value="pro">pro</option>
                    <option value="elite">elite</option>
                  </select>
                }
              />
            </div>
          )}
        </Surface>

        <Surface title="Catalog + Entitlements">
          <div className="form">
            <div className="button-row">
              <button
                className="button"
                type="button"
                data-testid="business-load-catalog"
                onClick={() =>
                  run(
                    () => getJson<CatalogResponse>("/v1/business/catalog", authOptions()),
                    (data: CatalogResponse) =>
                      [
                        "Plans:",
                        ...data.plans.map((p) => `- ${p.id} ($${p.price_usd}): ${p.description}`),
                        "Add-ons:",
                        ...data.addons.map((a) => `- ${a.id} ($${a.price_usd}): ${a.description}`),
                        "Bundles:",
                        ...data.bundles.map((b) => `- ${b.id} ($${b.price_usd}): ${b.description}`),
                        "Offers:",
                        ...data.offers.map((o) => `- ${o.id}: ${o.description}`),
                      ].join("\n"),
                    setCatalogOut,
                  )
                }
              >
                Load Catalog
              </button>
              <button
                className="button secondary"
                type="button"
                data-testid="business-load-entitlements"
                onClick={() =>
                  run(
                    () => getJson<SubscriptionStatus>(`/v1/business/entitlements?user_id=${encodeURIComponent(userId)}`, authOptions()),
                    (data: SubscriptionStatus) =>
                      [
                        `Plan: ${data.plan} (${data.status})`,
                        `Source: ${data.source}`,
                        `Addons: ${data.addons.join(", ") || "none"}`,
                        "Entitlements:",
                        ...data.entitlements.map((e: string) => `- ${e}`),
                      ].join("\n"),
                    setEntitlementOut,
                  )
                }
              >
                Load Entitlements
              </button>
            </div>
          </div>
        </Surface>

        <Surface title="Upgrade Plan">
          <div className="form">
            <p className="small-muted" style={{ margin: "0 0 12px" }}>
              Choose a plan and pay securely via Stripe. Your subscription activates instantly after checkout.
            </p>
            {(["plus", "pro", "elite"] as const).map((plan) => {
              const labels: Record<string, { label: string; price: string; perks: string }> = {
                plus:  { label: "Plus",  price: "$9 / mo",  perks: "Kundli · Panchang · Tarot · Numerology · Mantra" },
                pro:   { label: "Pro",   price: "$19 / mo", perks: "Plus + Matchmaking · Kundli Video" },
                elite: { label: "Elite", price: "$39 / mo", perks: "Pro + Vaastu · Gem · Live Consult Video" },
              };
              const { label, price, perks } = labels[plan];
              const isCurrentPlan = viewer?.plan === plan;
              return (
                <div
                  key={plan}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    marginBottom: 8,
                    background: isCurrentPlan ? "#f0fdf4" : "#fff",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>{label}</strong>
                    <span style={{ marginLeft: 8, color: "#64748b", fontSize: "0.85rem" }}>{price}</span>
                    <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 2 }}>{perks}</div>
                  </div>
                  {isCurrentPlan ? (
                    <span className="badge ok" style={{ flexShrink: 0 }}>Current plan</span>
                  ) : (
                    <button
                      className="button"
                      style={{ flexShrink: 0, marginLeft: 12 }}
                      type="button"
                      data-testid={`stripe-upgrade-${plan}`}
                      disabled={stripeLoading === plan}
                      onClick={() => handleStripeUpgrade(plan)}
                    >
                      {stripeLoading === plan ? "Redirecting…" : `Upgrade to ${label}`}
                    </button>
                  )}
                </div>
              );
            })}
            {stripeError ? <p className="error" style={{ marginTop: 8 }}>{stripeError}</p> : null}
          </div>
        </Surface>

        {isAdmin ? (
        <Surface title="Subscription + Add-on">
          <div className="form">
            <Field
              label="Target Plan"
              input={
                <select className="select" value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)}>
                  <option value="free">free</option>
                  <option value="plus">plus</option>
                  <option value="pro">pro</option>
                  <option value="elite">elite</option>
                </select>
              }
            />
            <button
              className="button"
              type="button"
              data-testid="business-change-plan"
              onClick={() =>
                run(
                  () =>
                    postJson<SubscriptionStatus>(
                      "/v1/business/subscription/change",
                      { user_id: userId, plan: targetPlan, source: "web" },
                      authOptions(),
                    ),
                  (data: SubscriptionStatus) =>
                    [
                      `Subscription updated: ${data.plan}`,
                      `Status: ${data.status}`,
                      `Entitlements: ${data.entitlements.length}`,
                    ].join("\n"),
                  setEntitlementOut,
                )
              }
            >
              Change Plan
            </button>
            <button
              className="button secondary"
              type="button"
              data-testid="business-revoke-plan"
              onClick={() =>
                run(
                  () =>
                    postJson<SubscriptionStatus>(
                      "/v1/business/subscription/revoke",
                      { user_id: userId, source: "admin", reason: "manual revoke" },
                      authOptions(),
                    ),
                  (data: SubscriptionStatus) =>
                    [
                      `Subscription updated: ${data.plan}`,
                      `Status: ${data.status}`,
                      `Entitlements: ${data.entitlements.length}`,
                    ].join("\n"),
                  setEntitlementOut,
                )
              }
            >
              Revoke Plan
            </button>

            <Field
              label="Add-on"
              input={
                <select className="select" value={addonId} onChange={(e) => setAddonId(e.target.value)}>
                  <option value="vaastu_studio_addon">vaastu_studio_addon</option>
                  <option value="gem_consultancy_addon">gem_consultancy_addon</option>
                  <option value="consult_video_addon">consult_video_addon</option>
                  <option value="matchmaking_addon">matchmaking_addon</option>
                  <option value="kundli_video_addon">kundli_video_addon</option>
                </select>
              }
            />
            <button
              className="button secondary"
              type="button"
              data-testid="business-activate-addon"
              onClick={() =>
                run(
                  () =>
                    postJson<AddonStatus>(
                      "/v1/business/addons/purchase",
                      { user_id: userId, addon_id: addonId, source: "web" },
                      authOptions(),
                    ),
                  (data: AddonStatus) => `Addon ${data.addon_id} -> ${data.status}\nEntitlements: ${data.entitlements.join(", ")}`,
                  setEntitlementOut,
                )
              }
            >
              Activate Add-on
            </button>
            <button
              className="button secondary"
              type="button"
              data-testid="business-revoke-addon"
              onClick={() =>
                run(
                  () =>
                    postJson<AddonStatus>(
                      "/v1/business/addons/revoke",
                      { user_id: userId, addon_id: addonId, source: "admin", reason: "manual revoke" },
                      authOptions(),
                    ),
                  (data: AddonStatus) => `Addon ${data.addon_id} -> ${data.status}`,
                  setEntitlementOut,
                )
              }
            >
              Revoke Add-on
            </button>
          </div>
        </Surface>
        ) : null}

        {isAdmin ? (
        <Surface title="Wallet + Bundles + Offers">
          <div className="form">
            <div className="form-grid">
              <Field
                label="Top-up Credits"
                input={<input className="input" type="number" value={topupCredits} onChange={(e) => setTopupCredits(e.target.value)} />}
              />
              <Field
                label="Top-up Amount USD"
                input={<input className="input" type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />}
              />
            </div>
            <div className="button-row">
              <button
                className="button"
                type="button"
                onClick={() =>
                  run(
                    () =>
                      postJson<WalletState>(
                        "/v1/business/wallet/topup",
                        {
                          user_id: userId,
                          credits: Number(topupCredits),
                          amount_usd: Number(topupAmount),
                          source: "web",
                        },
                        authOptions(),
                      ),
                    (data: WalletState) =>
                      [
                        `Wallet balance: ${data.balance_credits}`,
                        "Recent entries:",
                        ...data.ledger.slice(0, 5).map((l) => `- ${l.delta_credits}: ${l.reason}`),
                      ].join("\n"),
                    setWalletOut,
                  )
                }
                data-testid="business-wallet-topup"
              >
                Wallet Top-up
              </button>
              <button
                className="button secondary"
                type="button"
                data-testid="business-wallet-debit"
                onClick={() =>
                  run(
                    () =>
                      postJson<WalletState>(
                        "/v1/business/wallet/debit",
                        {
                          user_id: userId,
                          credits: Number(debitCredits),
                          reason: debitReason,
                        },
                        authOptions(),
                      ),
                    (data: WalletState) => `Wallet balance: ${data.balance_credits}`,
                    setWalletOut,
                  )
                }
              >
                Debit Wallet
              </button>
              <button
                className="button secondary"
                type="button"
                data-testid="business-wallet-refresh"
                onClick={() =>
                  run(
                    () => getJson<WalletState>(`/v1/business/wallet?user_id=${encodeURIComponent(userId)}`, authOptions()),
                    (data: WalletState) =>
                      [
                        `Wallet balance: ${data.balance_credits}`,
                        "Recent entries:",
                        ...data.ledger.slice(0, 8).map((l) => `- ${l.delta_credits}: ${l.reason}`),
                      ].join("\n"),
                    setWalletOut,
                  )
                }
              >
                Refresh Wallet
              </button>
            </div>

            <div className="form-grid">
              <Field
                label="Debit Credits"
                input={<input className="input" type="number" value={debitCredits} onChange={(e) => setDebitCredits(e.target.value)} />}
              />
              <Field label="Debit Reason" input={<input className="input" value={debitReason} onChange={(e) => setDebitReason(e.target.value)} />} />
            </div>

            <Field
              label="Bundle"
              input={
                <select className="select" value={bundleId} onChange={(e) => setBundleId(e.target.value)}>
                  <option value="consult_minutes_60">consult_minutes_60</option>
                  <option value="consult_minutes_180">consult_minutes_180</option>
                  <option value="reports_combo">reports_combo</option>
                </select>
              }
            />
            <button
              className="button secondary"
              type="button"
              data-testid="business-purchase-bundle"
              onClick={() =>
                run(
                  () => postJson<BundlePurchase>("/v1/business/bundles/purchase", { user_id: userId, bundle_id: bundleId, source: "web" }, authOptions()),
                  (data: BundlePurchase) => `Bundle ${data.bundle_id} added ${data.credits_added} credits.\nBalance: ${data.wallet_balance}`,
                  setWalletOut,
                )
              }
            >
              Purchase Bundle
            </button>

            <Field label="Offer" input={<input className="input" value={offerId} onChange={(e) => setOfferId(e.target.value)} />} />
            <button
              className="button secondary"
              type="button"
              data-testid="business-claim-offer"
              onClick={() =>
                run(
                  () => postJson<OfferClaim>("/v1/business/offers/claim", { user_id: userId, offer_id: offerId }, authOptions()),
                  (data: OfferClaim) => `Offer claim status: ${data.status}\nCredits Added: ${data.credits_added}\nBalance: ${data.wallet_balance}`,
                  setWalletOut,
                )
              }
            >
              Claim Offer
            </button>
          </div>
        </Surface>
        ) : null}

        <Surface title="Reviews + Moderation">
          <div className="form">
            <Field
              label="Module"
              input={
                <select className="select" value={reviewModule} onChange={(e) => setReviewModule(e.target.value)}>
                  <option value="kundli">kundli</option>
                  <option value="matchmaking">matchmaking</option>
                  <option value="rashifal">rashifal</option>
                  <option value="panchang">panchang</option>
                  <option value="vaastu">vaastu</option>
                  <option value="gem">gem</option>
                  <option value="consult">consult</option>
                  <option value="tarot">tarot</option>
                  <option value="numerology">numerology</option>
                  <option value="mantra">mantra</option>
                </select>
              }
            />
            <Field label="Rating" input={<input className="input" type="number" min={1} max={5} value={reviewRating} onChange={(e) => setReviewRating(e.target.value)} />} />
            <Field label="Title" input={<input className="input" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} />} />
            <Field label="Body" input={<textarea className="textarea" value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} />} />
            <Field
              label="Verified Purchase ID (optional)"
              input={<input className="input" value={reviewPurchaseId} onChange={(e) => setReviewPurchaseId(e.target.value)} />}
            />

            <div className="button-row">
              <button
                className="button"
                type="button"
                data-testid="business-submit-review"
                onClick={() =>
                  run(
                    () =>
                      postJson<ReviewItem>(
                        "/v1/business/reviews",
                        {
                          user_id: userId,
                          module: reviewModule,
                          rating: Number(reviewRating),
                          title: reviewTitle,
                          body: reviewBody,
                          verified_purchase_id: reviewPurchaseId || undefined,
                        },
                        authOptions(),
                      ),
                    (data: ReviewItem) => {
                      setReviewIdToModerate(data.review_id);
                      return `Created Review: ${data.review_id}\nStatus: ${data.moderation_status}\nVerified: ${String(data.verified_purchase)}`;
                    },
                    setReviewsOut,
                  )
                }
              >
                Submit Review
              </button>
              <button
                className="button secondary"
                type="button"
                data-testid="business-load-reviews"
                onClick={() =>
                  run(
                    () => getJson<ReviewList>(`/v1/business/reviews?module=${encodeURIComponent(reviewModule)}&approved_only=true`, authOptions()),
                    (data: ReviewList) =>
                      [
                        `Approved reviews for ${reviewModule}: ${data.reviews.length}`,
                        ...data.reviews.map((r) => `- ${r.review_id}: ${r.rating}/5 ${r.title}`),
                      ].join("\n"),
                    setReviewsOut,
                  )
                }
              >
                Load Approved Reviews
              </button>
            </div>

            {isSupportStaff ? (
              <>
                <div className="form-grid">
                  <Field label="Review ID" input={<input className="input" value={reviewIdToModerate} onChange={(e) => setReviewIdToModerate(e.target.value)} />} />
                  <Field
                    label="Action"
                    input={
                      <select className="select" value={reviewAction} onChange={(e) => setReviewAction(e.target.value)}>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                        <option value="flagged">flagged</option>
                      </select>
                    }
                  />
                </div>
                <Field label="Moderation Reason" input={<input className="input" value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} />} />
                <button
                  className="button secondary"
                  type="button"
                  data-testid="business-moderate-review"
                  onClick={() =>
                    run(
                      () =>
                        postJson<ReviewItem>(
                          `/v1/business/reviews/${encodeURIComponent(reviewIdToModerate)}/moderate`,
                          { moderator_id: "admin-demo", action: reviewAction, reason: reviewReason },
                          authOptions(),
                        ),
                      (data: ReviewItem) => `Review ${data.review_id} moderation -> ${data.moderation_status}`,
                      setReviewsOut,
                    )
                  }
                >
                  Moderate Review
                </button>
              </>
            ) : (
              <p className="small-muted" style={{ margin: 0 }}>
                Review moderation is available to support and admin operators after sign-in.
              </p>
            )}
          </div>
        </Surface>

        <Surface title="Dispute Workflow">
          <div className="form">
            <Field
              label="Category"
              input={
                <select className="select" value={disputeCategory} onChange={(e) => setDisputeCategory(e.target.value)}>
                  <option value="billing">billing</option>
                  <option value="service">service</option>
                  <option value="content">content</option>
                  <option value="refund">refund</option>
                  <option value="consult">consult</option>
                </select>
              }
            />
            <Field label="Reference ID" input={<input className="input" value={disputeReference} onChange={(e) => setDisputeReference(e.target.value)} />} />
            <Field label="Description" input={<textarea className="textarea" value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} />} />
            <div className="button-row">
              <button
                className="button"
                type="button"
                data-testid="business-open-dispute"
                onClick={() =>
                  run(
                    () =>
                      postJson<DisputeItem>(
                        "/v1/business/disputes",
                        {
                          user_id: userId,
                          category: disputeCategory,
                          reference_id: disputeReference,
                          description: disputeDescription,
                        },
                        authOptions(),
                      ),
                    (data: DisputeItem) => {
                      setDisputeIdToResolve(data.dispute_id);
                      return `Dispute created: ${data.dispute_id}\nStatus: ${data.status}`;
                    },
                    setDisputesOut,
                  )
                }
              >
                Open Dispute
              </button>
              <button
                className="button secondary"
                type="button"
                data-testid="business-load-disputes"
                onClick={() =>
                  run(
                    () => getJson<DisputeList>(`/v1/business/disputes?user_id=${encodeURIComponent(userId)}`, authOptions()),
                    (data: DisputeList) =>
                      [
                        `Disputes for ${userId}: ${data.disputes.length}`,
                        ...data.disputes.map((d) => `- ${d.dispute_id} (${d.category}): ${d.status}`),
                      ].join("\n"),
                    setDisputesOut,
                  )
                }
              >
                Load Disputes
              </button>
            </div>

            {isSupportStaff ? (
              <>
                <div className="form-grid">
                  <Field label="Dispute ID" input={<input className="input" value={disputeIdToResolve} onChange={(e) => setDisputeIdToResolve(e.target.value)} />} />
                  <Field
                    label="Resolution Status"
                    input={
                      <select className="select" value={disputeStatus} onChange={(e) => setDisputeStatus(e.target.value)}>
                        <option value="resolved">resolved</option>
                        <option value="needs-info">needs-info</option>
                        <option value="rejected">rejected</option>
                      </select>
                    }
                  />
                </div>
                <Field label="Resolution Note" input={<textarea className="textarea" value={disputeResolution} onChange={(e) => setDisputeResolution(e.target.value)} />} />
                <button
                  className="button secondary"
                  type="button"
                  data-testid="business-resolve-dispute"
                  onClick={() =>
                    run(
                      () =>
                        postJson<DisputeItem>(
                          `/v1/business/disputes/${encodeURIComponent(disputeIdToResolve)}/resolve`,
                          {
                            agent_id: "support-admin",
                            status: disputeStatus,
                            resolution_note: disputeResolution,
                          },
                          authOptions(),
                        ),
                      (data: DisputeItem) => `Dispute ${data.dispute_id} -> ${data.status}\nNote: ${data.resolution_note ?? "-"}`,
                      setDisputesOut,
                    )
                  }
                >
                  Resolve Dispute
                </button>
              </>
            ) : null}
          </div>
        </Surface>

        <Surface title="Refunds + Billing Audit">
          <div className="form">
            <div className="form-grid">
              <Field label="Reference ID" input={<input className="input" value={refundReference} onChange={(e) => setRefundReference(e.target.value)} />} />
              <Field label="Amount USD" input={<input className="input" type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />} />
            </div>
            <Field label="Refund Reason" input={<textarea className="textarea" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />} />

            <div className="button-row">
              <button
                className="button"
                type="button"
                data-testid="business-open-refund"
                onClick={() =>
                  run(
                    () =>
                      postJson<RefundItem>(
                        "/v1/business/refunds",
                        {
                          user_id: userId,
                          reference_id: refundReference,
                          reason: refundReason,
                          amount_usd: Number(refundAmount),
                          source: "web",
                        },
                        authOptions(),
                      ),
                    (data: RefundItem) => {
                      setRefundIdToResolve(data.refund_id);
                      return `Refund created: ${data.refund_id}\nStatus: ${data.status}\nAmount: ${data.amount_usd ?? "n/a"}`;
                    },
                    setRefundsOut,
                  )
                }
              >
                Open Refund
              </button>
              <button
                className="button secondary"
                type="button"
                data-testid="business-load-refunds"
                onClick={() =>
                  run(
                    () => getJson<RefundList>(`/v1/business/refunds?user_id=${encodeURIComponent(userId)}`, authOptions()),
                    (data: RefundList) =>
                      [
                        `Refunds for ${userId}: ${data.refunds.length}`,
                        ...data.refunds.map((r) => `- ${r.refund_id}: ${r.status} (${r.reference_id})`),
                      ].join("\n"),
                    setRefundsOut,
                  )
                }
              >
                Load Refunds
              </button>
            </div>

            {isSupportStaff ? (
              <>
                <div className="form-grid">
                  <Field label="Refund ID" input={<input className="input" value={refundIdToResolve} onChange={(e) => setRefundIdToResolve(e.target.value)} />} />
                  <Field
                    label="Resolution Status"
                    input={
                      <select className="select" value={refundStatus} onChange={(e) => setRefundStatus(e.target.value)}>
                        <option value="approved">approved</option>
                        <option value="processed">processed</option>
                        <option value="rejected">rejected</option>
                      </select>
                    }
                  />
                </div>
                <Field label="Resolution Note" input={<textarea className="textarea" value={refundResolution} onChange={(e) => setRefundResolution(e.target.value)} />} />
                <button
                  className="button secondary"
                  type="button"
                  data-testid="business-resolve-refund"
                  onClick={() =>
                    run(
                      () =>
                        postJson<RefundItem>(
                          `/v1/business/refunds/${encodeURIComponent(refundIdToResolve)}/resolve`,
                          {
                            agent_id: "support-admin",
                            status: refundStatus,
                            resolution_note: refundResolution,
                          },
                          authOptions(),
                        ),
                      (data: RefundItem) => `Refund ${data.refund_id} -> ${data.status}\nNote: ${data.resolution_note ?? "-"}`,
                      setRefundsOut,
                    )
                  }
                >
                  Resolve Refund
                </button>
              </>
            ) : null}

            <div className="button-row">
              <button
                className="button secondary"
                type="button"
                data-testid="business-load-billing-events"
                onClick={() =>
                  run(
                    () => getJson<BillingEventList>(`/v1/business/billing/events?user_id=${encodeURIComponent(userId)}`, authOptions()),
                    (data: BillingEventList) =>
                      [
                        `Billing events: ${data.events.length}`,
                        ...data.events.slice(0, 10).map((e) => `- ${e.provider}:${e.event_type} => ${e.status ?? "n/a"} (${e.plan ?? "n/a"})`),
                      ].join("\n"),
                    setAuditOut,
                  )
                }
              >
                Load Billing Events
              </button>
              <button
                className="button secondary"
                type="button"
                data-testid="business-load-subscription-events"
                onClick={() =>
                  run(
                    () => getJson<SubscriptionEventList>(`/v1/business/subscription/events?user_id=${encodeURIComponent(userId)}`, authOptions()),
                    (data: SubscriptionEventList) =>
                      [
                        `Subscription events: ${data.events.length}`,
                        ...data.events.slice(0, 10).map((e) => `- ${e.event_type}: ${e.old_status ?? "none"} -> ${e.new_status ?? "none"}`),
                      ].join("\n"),
                    setAuditOut,
                  )
                }
              >
                Load Subscription Events
              </button>
            </div>
          </div>
        </Surface>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {catalogOut ? <pre className="result" data-testid="business-catalog-result">{catalogOut}</pre> : null}
      {entitlementOut ? <pre className="result" data-testid="business-entitlements-result">{entitlementOut}</pre> : null}
      {walletOut ? <pre className="result" data-testid="business-wallet-result">{walletOut}</pre> : null}
      {reviewsOut ? <pre className="result" data-testid="business-reviews-result">{reviewsOut}</pre> : null}
      {disputesOut ? <pre className="result" data-testid="business-disputes-result">{disputesOut}</pre> : null}
      {refundsOut ? <pre className="result" data-testid="business-refunds-result">{refundsOut}</pre> : null}
      {auditOut ? <pre className="result" data-testid="business-audit-result">{auditOut}</pre> : null}
    </main>
  );
}

function Field(props: { label: string; input: ReactNode }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      {props.input}
    </div>
  );
}
