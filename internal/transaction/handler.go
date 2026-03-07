package transaction

import (
	"context"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

// WalletBalanceUpdater abstracts wallet balance operations to avoid circular imports
type WalletBalanceUpdater interface {
	UpdateBalance(ctx context.Context, walletID pgtype.UUID, delta int64) error
}

type Handler struct {
	service    *Service
	walUpdater WalletBalanceUpdater
}

func NewHandler(service *Service, walUpdater WalletBalanceUpdater) *Handler {
	return &Handler{service: service, walUpdater: walUpdater}
}

func (h *Handler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
	}

	if req.TransactionDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "transaction_date wajib diisi (YYYY-MM-DD)"})
	}

	resp, err := h.service.Create(c.Context(), userID, req)
	if err != nil {
		switch err {
		case ErrInvalidAmount:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		case ErrInvalidType:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal buat transaksi"})
		}
	}

	// Update wallet balance
	if req.WalletID != "" && h.walUpdater != nil {
		walUUID, _ := stringToUUID(req.WalletID)
		if walUUID.Valid {
			delta := req.Amount
			if req.TransactionType == "EXPENSE" {
				delta = -delta
			}
			_ = h.walUpdater.UpdateBalance(c.Context(), walUUID, delta)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	resp, err := h.service.GetByID(c.Context(), userID, txID)
	if err != nil {
		if err == ErrTransactionNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil transaksi"})
	}

	return c.JSON(resp)
}

func (h *Handler) List(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txType := c.Query("type")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	resp, err := h.service.List(c.Context(), userID, txType, int32(limit), int32(offset))
	if err != nil {
		if err == ErrInvalidType {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal list transaksi"})
	}

	return c.JSON(resp)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
	}

	resp, err := h.service.Update(c.Context(), userID, txID, req)
	if err != nil {
		switch err {
		case ErrTransactionNotFound:
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		case ErrInvalidAmount, ErrInvalidType:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal update transaksi"})
		}
	}

	return c.JSON(resp)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	// Get transaction first to reverse wallet balance
	if h.walUpdater != nil {
		tx, getErr := h.service.GetByID(c.Context(), userID, txID)
		if getErr == nil && tx.WalletID != "" {
			walUUID, _ := stringToUUID(tx.WalletID)
			if walUUID.Valid {
				delta := -tx.Amount
				if tx.TransactionType == "EXPENSE" {
					delta = tx.Amount
				}
				_ = h.walUpdater.UpdateBalance(c.Context(), walUUID, delta)
			}
		}
	}

	if err := h.service.Delete(c.Context(), userID, txID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal hapus transaksi"})
	}

	return c.JSON(fiber.Map{"message": "transaksi berhasil dihapus"})
}

func (h *Handler) MonthlySummary(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)

	year, _ := strconv.Atoi(c.Query("year", strconv.Itoa(now.Year())))
	monthInt, _ := strconv.Atoi(c.Query("month", strconv.Itoa(int(now.Month()))))

	if monthInt < 1 || monthInt > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bulan harus 1-12"})
	}

	resp, err := h.service.GetMonthlySummary(c.Context(), userID, year, time.Month(monthInt))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil summary"})
	}

	return c.JSON(resp)
}
