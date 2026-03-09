package analytics

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"gas-catet/internal/plangating"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RoastGenerator is an interface for AI text generation (implemented by telegram.OCRService)
type RoastGenerator interface {
	GenerateRoast(prompt string) (string, error)
}

type Handler struct {
	service  *Service
	roastGen RoastGenerator
	pool     *pgxpool.Pool
}

func NewHandler(service *Service, pool *pgxpool.Pool) *Handler {
	return &Handler{service: service, pool: pool}
}

func (h *Handler) SetRoastGenerator(rg RoastGenerator) {
	h.roastGen = rg
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

// GET /api/analytics/roast?year=2026&month=3
func (h *Handler) Roast(c *fiber.Ctx) error {
	if h.roastGen == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "fitur roast belum aktif"})
	}

	userID := c.Locals("user_id").(pgtype.UUID)

	// Rate limit: free users max 3x/day
	plan := plangating.CheckPlan(c.Context(), h.pool, userID)
	if plan == plangating.PlanFree {
		count, err := h.service.queries.CountFeatureUsageToday(c.Context(), CountFeatureUsageTodayParams{
			UserID:  userID,
			Feature: "roast",
		})
		if err == nil && count >= int64(plangating.MaxFreeRoastPerDay) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":            fmt.Sprintf("AI Roast gratis %dx/hari. Upgrade Pro untuk unlimited!", plangating.MaxFreeRoastPerDay),
				"upgrade_required": true,
				"upgrade_url":      "https://dna-indonesia.myr.id/m/gascatet-pro",
			})
		}
	}

	name := "Bos"
	year, month := parseYearMonth(c)

	// Gather financial data
	var dataLines []string

	summary, err := h.service.GetMonthlySummary(c.Context(), userID, year, month)
	if err == nil {
		monthNames := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
		dataLines = append(dataLines, fmt.Sprintf("Bulan ini (%s %d):", monthNames[int(month)], year))
		dataLines = append(dataLines, fmt.Sprintf("- Total pemasukan: Rp%d", summary.TotalIncome))
		dataLines = append(dataLines, fmt.Sprintf("- Total pengeluaran: Rp%d", summary.TotalExpense))
		dataLines = append(dataLines, fmt.Sprintf("- Sisa saldo: Rp%d", summary.Balance))
	}

	catBreakdown, err := h.service.GetCategoryBreakdown(c.Context(), userID, year, month)
	if err == nil && len(catBreakdown.Items) > 0 {
		dataLines = append(dataLines, "\nPengeluaran per kategori:")
		for _, item := range catBreakdown.Items {
			if item.Type == "EXPENSE" {
				dataLines = append(dataLines, fmt.Sprintf("- %s: Rp%d (%d transaksi)", item.Category, item.Total, item.Count))
			}
		}
	}

	topExpenses, err := h.service.GetTopExpenses(c.Context(), userID, year, month, 5)
	if err == nil && len(topExpenses.Items) > 0 {
		dataLines = append(dataLines, "\nTop 5 pengeluaran terbanyak:")
		for i, item := range topExpenses.Items {
			dataLines = append(dataLines, fmt.Sprintf("%d. %s — Rp%d (%dx)", i+1, item.Description, item.TotalAmount, item.Frequency))
		}
	}

	if len(dataLines) == 0 {
		return c.JSON(fiber.Map{"roast": "Belum ada transaksi bulan ini. Mau di-roast apa dong? Nyatet dulu sana! 😅"})
	}

	financialData := strings.Join(dataLines, "\n")

	prompt := fmt.Sprintf(`Kamu adalah "RoastBot" — AI yang SAVAGE, BRUTAL, dan LUCU dalam bahasa gaul Indonesia.

Tugas: Roast kebiasaan keuangan user berdasarkan data di bawah. Buat user KENA MENTAL tapi tetap lucu dan menghibur.

Aturan:
- Pakai bahasa gaul Indonesia (lu, gue, anjir, buset, ngab, dah, dll)
- SAVAGE tapi LUCU, jangan kasar atau menyinggung SARA
- Sindir kebiasaan belanja yang boros atau pola yang aneh
- Kasih 1 saran keuangan yang dibungkus humor di akhir
- Pakai emoji secukupnya
- Maksimal 800 karakter
- JANGAN pakai format markdown (tidak ada * atau _)
- Langsung roast, jangan basa-basi

Nama user: %s

Data keuangan:
%s`, name, financialData)

	roastText, err := h.roastGen.GenerateRoast(prompt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "AI lagi males nge-roast, coba lagi nanti"})
	}

	// Track usage for rate limiting
	_ = h.service.queries.InsertFeatureUsage(c.Context(), InsertFeatureUsageParams{
		UserID:  userID,
		Feature: "roast",
	})

	return c.JSON(fiber.Map{"roast": roastText})
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
