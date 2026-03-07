package category

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrCategoryExists = errors.New("kategori sudah ada")
	ErrCategoryInUse  = errors.New("kategori sedang digunakan oleh transaksi")
	ErrInvalidType    = errors.New("tipe harus INCOME atau EXPENSE")
	ErrNameRequired   = errors.New("nama kategori wajib diisi")
)

type Service struct {
	queries *Queries
}

type CategoryResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type CreateRequest struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type BudgetResponse struct {
	ID           string `json:"id"`
	CategoryName string `json:"category_name"`
	Amount       int64  `json:"amount"`
}

type BudgetWithSpent struct {
	ID           string `json:"id"`
	CategoryName string `json:"category_name"`
	Amount       int64  `json:"amount"`
	Spent        int64  `json:"spent"`
}

type UpsertBudgetRequest struct {
	CategoryName string `json:"category_name"`
	Amount       int64  `json:"amount"`
}

func NewService(queries *Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) List(ctx context.Context, userID pgtype.UUID, catType string) ([]CategoryResponse, error) {
	var cats []Category
	var err error

	if catType != "" {
		if catType != "INCOME" && catType != "EXPENSE" {
			return nil, ErrInvalidType
		}
		cats, err = s.queries.ListCategoriesByUserAndType(ctx, ListCategoriesByUserAndTypeParams{
			UserID: userID,
			Type:   catType,
		})
	} else {
		cats, err = s.queries.ListCategoriesByUser(ctx, userID)
	}

	if err != nil {
		return nil, fmt.Errorf("gagal list kategori: %w", err)
	}

	resp := make([]CategoryResponse, len(cats))
	for i, c := range cats {
		resp[i] = CategoryResponse{
			ID:   uuidToString(c.ID),
			Name: c.Name,
			Type: c.Type,
		}
	}
	return resp, nil
}

func (s *Service) Create(ctx context.Context, userID pgtype.UUID, req CreateRequest) (CategoryResponse, error) {
	if req.Name == "" {
		return CategoryResponse{}, ErrNameRequired
	}
	if req.Type != "INCOME" && req.Type != "EXPENSE" {
		return CategoryResponse{}, ErrInvalidType
	}

	cat, err := s.queries.CreateCategory(ctx, CreateCategoryParams{
		UserID: userID,
		Name:   req.Name,
		Type:   req.Type,
	})
	if err != nil {
		if containsUniqueViolation(err) {
			return CategoryResponse{}, ErrCategoryExists
		}
		return CategoryResponse{}, fmt.Errorf("gagal buat kategori: %w", err)
	}

	return CategoryResponse{
		ID:   uuidToString(cat.ID),
		Name: cat.Name,
		Type: cat.Type,
	}, nil
}

func (s *Service) Delete(ctx context.Context, userID, catID pgtype.UUID) error {
	err := s.queries.DeleteCategory(ctx, DeleteCategoryParams{
		ID:     catID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("gagal hapus kategori: %w", err)
	}
	return nil
}

func (s *Service) SeedDefaults(ctx context.Context, userID pgtype.UUID) error {
	return s.queries.SeedDefaultCategories(ctx, userID)
}

func (s *Service) UpsertBudget(ctx context.Context, userID pgtype.UUID, req UpsertBudgetRequest) (BudgetResponse, error) {
	if req.CategoryName == "" {
		return BudgetResponse{}, ErrNameRequired
	}
	if req.Amount <= 0 {
		return BudgetResponse{}, errors.New("jumlah budget harus lebih dari 0")
	}

	b, err := s.queries.UpsertBudget(ctx, UpsertBudgetParams{
		UserID:       userID,
		CategoryName: req.CategoryName,
		Amount:       req.Amount,
	})
	if err != nil {
		return BudgetResponse{}, fmt.Errorf("gagal simpan budget: %w", err)
	}

	return BudgetResponse{
		ID:           uuidToString(b.ID),
		CategoryName: b.CategoryName,
		Amount:       b.Amount,
	}, nil
}

func (s *Service) ListBudgets(ctx context.Context, userID pgtype.UUID) ([]BudgetWithSpent, error) {
	budgets, err := s.queries.ListBudgetsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal list budget: %w", err)
	}

	if len(budgets) == 0 {
		return []BudgetWithSpent{}, nil
	}

	// Get current month date range (Asia/Jakarta)
	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
	startOfNext := startOfMonth.AddDate(0, 1, 0)

	spent, err := s.queries.GetBudgetSpent(ctx, GetBudgetSpentParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: startOfMonth, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: startOfNext, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("gagal ambil pengeluaran: %w", err)
	}

	spentMap := make(map[string]int64)
	for _, s := range spent {
		spentMap[s.Category] = s.Spent
	}

	result := make([]BudgetWithSpent, len(budgets))
	for i, b := range budgets {
		result[i] = BudgetWithSpent{
			ID:           uuidToString(b.ID),
			CategoryName: b.CategoryName,
			Amount:       b.Amount,
			Spent:        spentMap[b.CategoryName],
		}
	}
	return result, nil
}

func (s *Service) DeleteBudget(ctx context.Context, userID, budgetID pgtype.UUID) error {
	err := s.queries.DeleteBudget(ctx, DeleteBudgetParams{
		ID:     budgetID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("gagal hapus budget: %w", err)
	}
	return nil
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
	if err != nil {
		return pgtype.UUID{}, fmt.Errorf("UUID tidak valid: %w", err)
	}
	return u, nil
}

func containsUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	errMsg := err.Error()
	for i := 0; i <= len(errMsg)-5; i++ {
		if errMsg[i:i+5] == "23505" {
			return true
		}
	}
	return false
}

// suppress unused import
var _ = time.Now
