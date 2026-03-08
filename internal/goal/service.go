package goal

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrInvalidName   = errors.New("nama target wajib diisi")
	ErrInvalidAmount = errors.New("target nominal harus lebih dari 0")
)

type Service struct {
	queries *Queries
}

type GoalResponse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	TargetAmount  int64  `json:"target_amount"`
	CurrentAmount int64  `json:"current_amount"`
	Deadline      string `json:"deadline"`
}

type CreateGoalRequest struct {
	Name         string `json:"name"`
	TargetAmount int64  `json:"target_amount"`
	Deadline     string `json:"deadline"`
}

type UpdateGoalRequest struct {
	Name         string `json:"name"`
	TargetAmount int64  `json:"target_amount"`
	Deadline     string `json:"deadline"`
}

type AddAmountRequest struct {
	Amount int64 `json:"amount"`
}

func NewService(queries *Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) Create(ctx context.Context, userID pgtype.UUID, req CreateGoalRequest) (GoalResponse, error) {
	if req.Name == "" {
		return GoalResponse{}, ErrInvalidName
	}
	if req.TargetAmount <= 0 {
		return GoalResponse{}, ErrInvalidAmount
	}

	var deadline pgtype.Date
	if req.Deadline != "" {
		t, err := parseDate(req.Deadline)
		if err == nil {
			deadline = pgtype.Date{Time: t, Valid: true}
		}
	}

	row, err := s.queries.CreateGoal(ctx, CreateGoalParams{
		UserID:        userID,
		Name:          req.Name,
		TargetAmount:  req.TargetAmount,
		CurrentAmount: 0,
		Deadline:      deadline,
	})
	if err != nil {
		return GoalResponse{}, fmt.Errorf("gagal buat goal: %w", err)
	}
	return rowToResponse(row), nil
}

func (s *Service) List(ctx context.Context, userID pgtype.UUID) ([]GoalResponse, error) {
	rows, err := s.queries.ListGoalsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal list goals: %w", err)
	}
	resp := make([]GoalResponse, len(rows))
	for i, r := range rows {
		resp[i] = rowToResponse(Goal(r))
	}
	return resp, nil
}

func (s *Service) Update(ctx context.Context, userID, goalID pgtype.UUID, req UpdateGoalRequest) (GoalResponse, error) {
	if req.Name == "" {
		return GoalResponse{}, ErrInvalidName
	}
	if req.TargetAmount <= 0 {
		return GoalResponse{}, ErrInvalidAmount
	}

	var deadline pgtype.Date
	if req.Deadline != "" {
		t, err := parseDate(req.Deadline)
		if err == nil {
			deadline = pgtype.Date{Time: t, Valid: true}
		}
	}

	row, err := s.queries.UpdateGoal(ctx, UpdateGoalParams{
		ID:           goalID,
		UserID:       userID,
		Name:         req.Name,
		TargetAmount: req.TargetAmount,
		Deadline:     deadline,
	})
	if err != nil {
		return GoalResponse{}, fmt.Errorf("gagal update goal: %w", err)
	}
	return rowToResponse(row), nil
}

func (s *Service) AddAmount(ctx context.Context, userID, goalID pgtype.UUID, amount int64) (GoalResponse, error) {
	if amount <= 0 {
		return GoalResponse{}, ErrInvalidAmount
	}
	row, err := s.queries.AddToGoal(ctx, AddToGoalParams{
		ID:            goalID,
		UserID:        userID,
		CurrentAmount: amount,
	})
	if err != nil {
		return GoalResponse{}, fmt.Errorf("gagal tambah amount: %w", err)
	}
	return rowToResponse(row), nil
}

func (s *Service) Delete(ctx context.Context, userID, goalID pgtype.UUID) error {
	return s.queries.DeleteGoal(ctx, DeleteGoalParams{ID: goalID, UserID: userID})
}

// Helpers

func parseDate(s string) (time.Time, error) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	return time.ParseInLocation("2006-01-02", s, loc)
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func stringToUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	return u, err
}

func rowToResponse(g Goal) GoalResponse {
	dl := ""
	if g.Deadline.Valid {
		dl = g.Deadline.Time.Format("2006-01-02")
	}
	return GoalResponse{
		ID:            uuidToString(g.ID),
		Name:          g.Name,
		TargetAmount:  g.TargetAmount,
		CurrentAmount: g.CurrentAmount,
		Deadline:      dl,
	}
}
