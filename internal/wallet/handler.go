package wallet

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	wallets, err := h.service.List(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil dompet"})
	}

	total, _ := h.service.GetTotalBalance(c.Context(), userID)

	return c.JSON(fiber.Map{
		"wallets":       wallets,
		"total_balance": total,
	})
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

	w, err := h.service.Create(c.Context(), userID, req)
	if err != nil {
		switch err {
		case ErrNameRequired:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		case ErrWalletExists:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal buat dompet"})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(w)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	walletID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
	}

	w, err := h.service.Update(c.Context(), userID, walletID, req)
	if err != nil {
		switch err {
		case ErrNameRequired:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		case ErrWalletExists:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal update dompet"})
		}
	}

	return c.JSON(w)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	walletID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	if err := h.service.Delete(c.Context(), userID, walletID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal hapus dompet"})
	}

	return c.JSON(fiber.Map{"message": "dompet berhasil dihapus"})
}
