package feedback

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	queries *Queries
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{queries: New(pool)}
}

func (h *Handler) Submit(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req struct {
		Message string `json:"message"`
		Rating  *int16 `json:"rating"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request tidak valid"})
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "pesan feedback wajib diisi"})
	}
	if len(req.Message) > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "feedback maksimal 1000 karakter"})
	}
	if req.Rating != nil && (*req.Rating < 1 || *req.Rating > 5) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "rating harus 1-5"})
	}

	// Check daily limit (1x/day)
	count, err := h.queries.CountUserFeedbackToday(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal cek limit"})
	}
	if count >= 1 {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "feedback hanya bisa dikirim 1x per hari"})
	}

	var rating pgtype.Int2
	if req.Rating != nil {
		rating = pgtype.Int2{Int16: *req.Rating, Valid: true}
	}

	fb, err := h.queries.CreateFeedback(c.Context(), CreateFeedbackParams{
		UserID:  userID,
		Message: req.Message,
		Rating:  rating,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal simpan feedback"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":      fb.ID,
		"message": fb.Message,
		"rating":  fb.Rating,
	})
}

// ListAll returns all feedbacks (admin only)
func (h *Handler) ListAll(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	if page < 1 {
		page = 1
	}
	limit := int32(20)
	offset := int32((page - 1)) * limit

	feedbacks, err := h.queries.ListFeedbacks(c.Context(), ListFeedbacksParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil feedback"})
	}

	total, _ := h.queries.CountFeedbacks(c.Context())

	return c.JSON(fiber.Map{
		"feedbacks": feedbacks,
		"total":     total,
		"page":      page,
	})
}
