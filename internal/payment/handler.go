package payment

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

// UserPlanUpdater is implemented by user.Queries
type UserPlanUpdater interface {
	UpgradePlanByEmail(ctx context.Context, arg UpgradePlanByEmailParams) error
	DowngradePlanByEmail(ctx context.Context, email string) error
}

// Re-export param struct so we don't import user package directly
type UpgradePlanByEmailParams struct {
	Email                 string
	MayarCustomerID       pgtype.Text
	SubscriptionExpiresAt pgtype.Timestamptz
}

type Handler struct {
	webhookSecret string
	planUpdater   UserPlanUpdater
}

func NewHandler(webhookSecret string, planUpdater UserPlanUpdater) *Handler {
	return &Handler{
		webhookSecret: webhookSecret,
		planUpdater:   planUpdater,
	}
}

// Mayar webhook event structure
type webhookPayload struct {
	Event string      `json:"event"`
	Data  webhookData `json:"data"`
}

type webhookData struct {
	ID            string         `json:"id"`
	Status        string         `json:"status"`
	Amount        int64          `json:"amount"`
	CustomerName  string         `json:"customerName"`
	CustomerEmail string         `json:"customerEmail"`
	CustomerPhone string         `json:"customerPhone"`
	ProductName   string         `json:"productName"`
	ProductType   string         `json:"productType"`
	TransactionID string         `json:"transactionId"`
	CreatedAt     int64          `json:"createdAt"`
	ExpiredAt     *int64         `json:"expiredAt"`
	PaidAt        *int64         `json:"paidAt"`
	Membership    *membershipObj `json:"membership"`
}

type membershipObj struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	LicenseID string `json:"licenseId"`
}

// Webhook handles incoming Mayar webhook events
func (h *Handler) Webhook(c *fiber.Ctx) error {
	// Reject if webhook secret is not configured
	if h.webhookSecret == "" {
		log.Printf("[MAYAR WEBHOOK] Webhook secret not configured, rejecting request")
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "webhook not configured"})
	}

	// Verify HMAC signature — always required
	signature := c.Get("X-Callback-Signature")
	if signature == "" {
		signature = c.Get("x-callback-signature")
	}
	if signature == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing signature"})
	}

	body := c.Body()
	mac := hmac.New(sha256.New, []byte(h.webhookSecret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(signature), []byte(expected)) {
		log.Printf("[MAYAR WEBHOOK] Invalid signature: got %s, expected %s", signature, expected)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
	}

	var payload webhookPayload
	if err := c.BodyParser(&payload); err != nil {
		log.Printf("[MAYAR WEBHOOK] Failed to parse body: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	log.Printf("[MAYAR WEBHOOK] Event: %s, Email: %s, Product: %s, Status: %s",
		payload.Event, payload.Data.CustomerEmail, payload.Data.ProductName, payload.Data.Status)

	email := payload.Data.CustomerEmail
	if email == "" {
		log.Printf("[MAYAR WEBHOOK] No customer email in payload, skipping")
		return c.JSON(fiber.Map{"status": "ok", "message": "no email, skipped"})
	}

	switch payload.Event {
	case "payment.success", "payment.received":
		h.handlePaymentSuccess(c.Context(), payload)
	case "membership.new", "membership.activated":
		h.handleMembershipNew(c.Context(), payload)
	case "membership.expired":
		h.handleMembershipExpired(c.Context(), payload)
	case "membership.unsubscribed", "membership.cancelled":
		h.handleMembershipExpired(c.Context(), payload)
	default:
		log.Printf("[MAYAR WEBHOOK] Unhandled event: %s", payload.Event)
	}

	// Always return 200 so Mayar doesn't retry
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *Handler) handlePaymentSuccess(ctx context.Context, payload webhookPayload) {
	email := payload.Data.CustomerEmail
	customerID := payload.Data.ID

	log.Printf("[MAYAR] Payment success for %s (customer: %s)", email, customerID)

	err := h.planUpdater.UpgradePlanByEmail(ctx, UpgradePlanByEmailParams{
		Email:                 email,
		MayarCustomerID:       pgtype.Text{String: customerID, Valid: true},
		SubscriptionExpiresAt: pgtype.Timestamptz{},
	})
	if err != nil {
		log.Printf("[MAYAR] Failed to upgrade %s: %v", email, err)
	} else {
		log.Printf("[MAYAR] Upgraded %s to Pro", email)
	}
}

func (h *Handler) handleMembershipNew(ctx context.Context, payload webhookPayload) {
	email := payload.Data.CustomerEmail
	customerID := payload.Data.ID

	log.Printf("[MAYAR] New membership for %s", email)

	err := h.planUpdater.UpgradePlanByEmail(ctx, UpgradePlanByEmailParams{
		Email:                 email,
		MayarCustomerID:       pgtype.Text{String: customerID, Valid: true},
		SubscriptionExpiresAt: pgtype.Timestamptz{},
	})
	if err != nil {
		log.Printf("[MAYAR] Failed to upgrade %s: %v", email, err)
	} else {
		log.Printf("[MAYAR] Upgraded %s to Pro (new membership)", email)
	}
}

func (h *Handler) handleMembershipExpired(ctx context.Context, payload webhookPayload) {
	email := payload.Data.CustomerEmail

	log.Printf("[MAYAR] Membership expired/cancelled for %s", email)

	err := h.planUpdater.DowngradePlanByEmail(ctx, email)
	if err != nil {
		log.Printf("[MAYAR] Failed to downgrade %s: %v", email, err)
	} else {
		log.Printf("[MAYAR] Downgraded %s to Free", email)
	}
}
