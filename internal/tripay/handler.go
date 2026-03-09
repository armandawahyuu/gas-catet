package tripay

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	ProPrice    = 35000
	ProItemName = "GasCatet Pro - 1 Bulan"
)

// PlanUpdater updates user plan (implemented by user queries adapter)
type PlanUpdater interface {
	UpgradePlanByEmail(ctx context.Context, email string) error
}

type Handler struct {
	client  *Client
	queries *Queries
	pool    *pgxpool.Pool
	plan    PlanUpdater
	baseURL string // e.g. https://gascatet.my.id
}

func NewHandler(client *Client, pool *pgxpool.Pool, plan PlanUpdater, baseURL string) *Handler {
	return &Handler{
		client:  client,
		queries: New(pool),
		pool:    pool,
		plan:    plan,
		baseURL: baseURL,
	}
}

// --- API Endpoints (auth required) ---

type createOrderRequest struct {
	Method string `json:"method"` // e.g. QRIS, BRIVA, etc.
}

// CreateOrder creates a new Tripay payment order for Pro upgrade
func (h *Handler) CreateOrder(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	email, _ := c.Locals("user_email").(string)

	var req createOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "method wajib diisi"})
	}
	if req.Method == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "method wajib diisi"})
	}

	// Check if user already has a pending order
	existing, err := h.queries.GetLatestPendingOrder(c.Context(), userID)
	if err == nil && existing.ID.Valid {
		return c.JSON(fiber.Map{
			"checkout_url": existing.CheckoutUrl.String,
			"reference":    existing.TripayReference.String,
			"merchant_ref": existing.MerchantRef,
			"status":       existing.Status,
			"expired_at":   existing.ExpiredAt.Time,
		})
	}

	// Generate unique merchant ref
	merchantRef := fmt.Sprintf("GC-%s-%d", userID.Bytes[:4], time.Now().Unix())

	userName := email
	if name, ok := c.Locals("user_name").(string); ok && name != "" {
		userName = name
	}

	// Create transaction in Tripay
	tripayResp, err := h.client.CreateClosedTransaction(CreateTransactionRequest{
		Method:        req.Method,
		MerchantRef:   merchantRef,
		Amount:        ProPrice,
		CustomerName:  userName,
		CustomerEmail: email,
		ItemName:      ProItemName,
		CallbackURL:   h.baseURL + "/api/webhooks/tripay",
		ReturnURL:     h.baseURL + "/dashboard/settings",
		ExpiredTime:   time.Now().Add(24 * time.Hour).Unix(),
	})
	if err != nil {
		log.Printf("[TRIPAY] Create transaction error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal buat pembayaran"})
	}

	// Save order to database
	expiredAt := time.Unix(tripayResp.ExpiredTime, 0)
	_, err = h.queries.CreatePaymentOrder(c.Context(), CreatePaymentOrderParams{
		UserID:          userID,
		TripayReference: pgtype.Text{String: tripayResp.Reference, Valid: true},
		MerchantRef:     merchantRef,
		Method:          req.Method,
		Amount:          int32(ProPrice),
		Status:          "UNPAID",
		CheckoutUrl:     pgtype.Text{String: tripayResp.CheckoutURL, Valid: true},
		PayCode:         pgtype.Text{String: tripayResp.PayCode, Valid: tripayResp.PayCode != ""},
		ExpiredAt:       pgtype.Timestamptz{Time: expiredAt, Valid: true},
	})
	if err != nil {
		log.Printf("[TRIPAY] Save order error: %v", err)
		// Still return checkout URL even if DB save fails
	}

	return c.JSON(fiber.Map{
		"checkout_url": tripayResp.CheckoutURL,
		"reference":    tripayResp.Reference,
		"merchant_ref": merchantRef,
		"pay_code":     tripayResp.PayCode,
		"status":       tripayResp.Status,
		"amount":       ProPrice,
	})
}

// GetPaymentChannels returns available Tripay payment channels
func (h *Handler) GetPaymentChannels(c *fiber.Ctx) error {
	channels, err := h.client.GetPaymentChannels()
	if err != nil {
		log.Printf("[TRIPAY] Get channels error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil metode pembayaran"})
	}

	// Filter only active channels
	var active []fiber.Map
	for _, ch := range channels {
		if ch.Active {
			active = append(active, fiber.Map{
				"code":     ch.Code,
				"name":     ch.Name,
				"group":    ch.Group,
				"icon_url": ch.IconURL,
				"fee":      ch.TotalFee.Flat,
			})
		}
	}

	return c.JSON(fiber.Map{
		"channels": active,
		"price":    ProPrice,
	})
}

// --- Webhook (public, verified by signature) ---

// Webhook handles Tripay payment callbacks
func (h *Handler) Webhook(c *fiber.Ctx) error {
	signature := c.Get("X-Callback-Signature")
	if signature == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing signature"})
	}

	body := c.Body()
	if !h.client.VerifyCallbackSignature(signature, body) {
		log.Printf("[TRIPAY WEBHOOK] Invalid signature")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
	}

	var payload CallbackPayload
	if err := c.BodyParser(&payload); err != nil {
		log.Printf("[TRIPAY WEBHOOK] Parse error: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	log.Printf("[TRIPAY WEBHOOK] Event ref=%s status=%s method=%s amount=%d",
		payload.MerchantRef, payload.Status, payload.PaymentMethodCode, payload.TotalAmount)

	// Update order status
	var paidAt pgtype.Timestamptz
	if payload.PaidAt != nil {
		paidAt = pgtype.Timestamptz{Time: time.Unix(*payload.PaidAt, 0), Valid: true}
	}

	err := h.queries.UpdatePaymentOrderStatus(c.Context(), UpdatePaymentOrderStatusParams{
		MerchantRef:     payload.MerchantRef,
		Status:          payload.Status,
		PaidAt:          paidAt,
		TripayReference: pgtype.Text{String: payload.Reference, Valid: true},
	})
	if err != nil {
		log.Printf("[TRIPAY WEBHOOK] Update order error: %v", err)
	}

	// If payment successful, upgrade user
	if payload.Status == "PAID" {
		order, err := h.queries.GetPaymentOrderByMerchantRef(c.Context(), payload.MerchantRef)
		if err != nil {
			log.Printf("[TRIPAY WEBHOOK] Get order error: %v", err)
			return c.JSON(fiber.Map{"status": "ok"})
		}

		// Get user email from user_id
		var email string
		err = h.pool.QueryRow(c.Context(), "SELECT email FROM users WHERE id = $1", order.UserID).Scan(&email)
		if err != nil {
			log.Printf("[TRIPAY WEBHOOK] Get user email error: %v", err)
			return c.JSON(fiber.Map{"status": "ok"})
		}

		if err := h.plan.UpgradePlanByEmail(c.Context(), email); err != nil {
			log.Printf("[TRIPAY WEBHOOK] Upgrade plan error for %s: %v", email, err)
		} else {
			log.Printf("[TRIPAY WEBHOOK] Upgraded %s to Pro!", email)
		}
	}

	return c.JSON(fiber.Map{"status": "ok"})
}
