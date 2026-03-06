package analytics

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GET /api/analytics/summary?year=2026&month=3
func (h *Handler) Summary(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(pgtype.UUID)
	year, month := parseYearMonth(c)

	resp, err := h.service.GetMonthlySummary(c.Context(), userID, year, month)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil summary"})
	}

	return c.JSON(resp)
}

// GET /api/analytics/daily?year=2026&month=3
func (h *Handler) Daily(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(pgtype.UUID)
	year, month := parseYearMonth(c)

	resp, err := h.service.GetDailyBreakdown(c.Context(), userID, year, month)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil daily breakdown"})
	}

	return c.JSON(resp)
}

// GET /api/analytics/trend?months=6
func (h *Handler) Trend(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(pgtype.UUID)

	months := 6
	if m, err := strconv.Atoi(c.Query("months", "6")); err == nil && m > 0 {
		months = m
	}

	resp, err := h.service.GetTrend(c.Context(), userID, months)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil trend"})
	}

	return c.JSON(resp)
}

// GET /api/analytics/top-expenses?year=2026&month=3&limit=10
func (h *Handler) TopExpenses(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(pgtype.UUID)
	year, month := parseYearMonth(c)

	limit := int32(10)
	if l, err := strconv.Atoi(c.Query("limit", "10")); err == nil && l > 0 {
		limit = int32(l)
	}

	resp, err := h.service.GetTopExpenses(c.Context(), userID, year, month, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil top expenses"})
	}

	return c.JSON(resp)
}

// GET /api/analytics/categories?year=2026&month=3
func (h *Handler) Categories(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(pgtype.UUID)
	year, month := parseYearMonth(c)

	resp, err := h.service.GetCategoryBreakdown(c.Context(), userID, year, month)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil category breakdown"})
	}

	return c.JSON(resp)
}

func parseYearMonth(c *fiber.Ctx) (int, time.Month) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)

	year := now.Year()
	if y, err := strconv.Atoi(c.Query("year")); err == nil && y > 0 {
		year = y
	}

	month := now.Month()
	if m, err := strconv.Atoi(c.Query("month")); err == nil && m >= 1 && m <= 12 {
		month = time.Month(m)
	}

	return year, month
}
