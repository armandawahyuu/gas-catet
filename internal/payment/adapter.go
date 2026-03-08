package payment

import (
	"context"

	"gas-catet/internal/user"

	"github.com/jackc/pgx/v5/pgtype"
)

// UserQueriesAdapter adapts user.Queries to UserPlanUpdater interface
type UserQueriesAdapter struct {
	queries *user.Queries
}

func NewUserQueriesAdapter(queries *user.Queries) *UserQueriesAdapter {
	return &UserQueriesAdapter{queries: queries}
}

func (a *UserQueriesAdapter) UpgradePlanByEmail(ctx context.Context, arg UpgradePlanByEmailParams) error {
	return a.queries.UpgradePlanByEmail(ctx, user.UpgradePlanByEmailParams{
		Email:                 arg.Email,
		MayarCustomerID:       pgtype.Text{String: arg.MayarCustomerID.String, Valid: arg.MayarCustomerID.Valid},
		SubscriptionExpiresAt: arg.SubscriptionExpiresAt,
	})
}

func (a *UserQueriesAdapter) DowngradePlanByEmail(ctx context.Context, email string) error {
	return a.queries.DowngradePlanByEmail(ctx, email)
}
