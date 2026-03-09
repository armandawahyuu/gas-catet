package plangating

import (
	"context"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	PlanFree           = "free"
	PlanPro            = "pro"
	MaxFreeWallets     = 2
	MaxFreeRoastPerDay = 3
)

// IsEarlyAccess returns true if EARLY_ACCESS env is "true"
func IsEarlyAccess() bool {
	return strings.ToLower(os.Getenv("EARLY_ACCESS")) == "true"
}

// getUserPlan fetches the user plan from DB
func getUserPlan(ctx context.Context, pool *pgxpool.Pool, userID pgtype.UUID) (string, error) {
	var plan string
	err := pool.QueryRow(ctx, "SELECT plan FROM users WHERE id = $1", userID).Scan(&plan)
	return plan, err
}

// RequirePro is a Fiber middleware that blocks free users from Pro-only features.
// During early access (EARLY_ACCESS=true), all users pass through.
func RequirePro(pool *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if IsEarlyAccess() {
			return c.Next()
		}

		userID, ok := c.Locals("user_id").(pgtype.UUID)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		plan, err := getUserPlan(c.Context(), pool, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal cek paket"})
		}

		if plan != PlanPro {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":            "fitur ini khusus paket Pro",
				"upgrade_required": true,
				"upgrade_url":      "/dashboard/upgrade",
			})
		}

		return c.Next()
	}
}

// CheckPlan is a helper to check user plan in-handler (e.g. for wallet limit).
// Returns "free" or "pro". During early access, always returns "pro".
func CheckPlan(ctx context.Context, pool *pgxpool.Pool, userID pgtype.UUID) string {
	if IsEarlyAccess() {
		return PlanPro
	}
	plan, err := getUserPlan(ctx, pool, userID)
	if err != nil {
		return PlanFree
	}
	return plan
}
