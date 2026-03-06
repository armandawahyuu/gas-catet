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
