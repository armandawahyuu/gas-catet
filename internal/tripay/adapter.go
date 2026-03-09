package tripay

import (
	"context"

	"gas-catet/internal/user"

	"github.com/jackc/pgx/v5/pgtype"
)

// TripayPlanAdapter adapts user.Queries to the PlanUpdater interface
type TripayPlanAdapter struct {
	queries *user.Queries
}

func NewPlanAdapter(queries *user.Queries) *TripayPlanAdapter {
	return &TripayPlanAdapter{queries: queries}
}

func (a *TripayPlanAdapter) UpgradePlanByEmail(ctx context.Context, email string) error {
	return a.queries.UpgradePlanByEmail(ctx, user.UpgradePlanByEmailParams{
		Email:                 email,
		MayarCustomerID:       pgtype.Text{},
		SubscriptionExpiresAt: pgtype.Timestamptz{},
	})
}
