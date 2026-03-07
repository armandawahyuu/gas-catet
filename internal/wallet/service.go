package wallet

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrNameRequired = errors.New("nama dompet wajib diisi")
	ErrWalletExists = errors.New("dompet sudah ada")
)

type Service struct {
	queries *Queries
}

type WalletResponse struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Icon    string `json:"icon"`
	Balance int64  `json:"balance"`
}

type CreateRequest struct {
	Name string `json:"name"`
	Icon string `json:"icon"`
}

type UpdateRequest struct {
	Name string `json:"name"`
	Icon string `json:"icon"`
}

func NewService(queries *Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) List(ctx context.Context, userID pgtype.UUID) ([]WalletResponse, error) {
	wallets, err := s.queries.ListWalletsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal list dompet: %w", err)
	}

	resp := make([]WalletResponse, len(wallets))
	for i, w := range wallets {
		resp[i] = WalletResponse{
			ID:      uuidToString(w.ID),
			Name:    w.Name,
			Icon:    w.Icon,
			Balance: w.Balance,
		}
	}
	return resp, nil
}

func (s *Service) GetByID(ctx context.Context, userID, walletID pgtype.UUID) (WalletResponse, error) {
	w, err := s.queries.GetWalletByID(ctx, GetWalletByIDParams{
		ID:     walletID,
		UserID: userID,
	})
	if err != nil {
		return WalletResponse{}, fmt.Errorf("dompet tidak ditemukan: %w", err)
	}
	return WalletResponse{
		ID:      uuidToString(w.ID),
		Name:    w.Name,
		Icon:    w.Icon,
		Balance: w.Balance,
	}, nil
}

func (s *Service) Create(ctx context.Context, userID pgtype.UUID, req CreateRequest) (WalletResponse, error) {
	if req.Name == "" {
		return WalletResponse{}, ErrNameRequired
	}
	if req.Icon == "" {
		req.Icon = "💰"
	}

	w, err := s.queries.CreateWallet(ctx, CreateWalletParams{
		UserID: userID,
		Name:   req.Name,
		Icon:   req.Icon,
	})
	if err != nil {
		if containsUniqueViolation(err) {
			return WalletResponse{}, ErrWalletExists
		}
		return WalletResponse{}, fmt.Errorf("gagal buat dompet: %w", err)
	}

	return WalletResponse{
		ID:      uuidToString(w.ID),
		Name:    w.Name,
		Icon:    w.Icon,
		Balance: w.Balance,
	}, nil
}

func (s *Service) Update(ctx context.Context, userID, walletID pgtype.UUID, req UpdateRequest) (WalletResponse, error) {
	if req.Name == "" {
		return WalletResponse{}, ErrNameRequired
	}
	if req.Icon == "" {
		req.Icon = "💰"
	}

	w, err := s.queries.UpdateWallet(ctx, UpdateWalletParams{
		ID:     walletID,
		UserID: userID,
		Name:   req.Name,
		Icon:   req.Icon,
	})
	if err != nil {
		if containsUniqueViolation(err) {
			return WalletResponse{}, ErrWalletExists
		}
		return WalletResponse{}, fmt.Errorf("gagal update dompet: %w", err)
	}

	return WalletResponse{
		ID:      uuidToString(w.ID),
		Name:    w.Name,
		Icon:    w.Icon,
		Balance: w.Balance,
	}, nil
}

func (s *Service) Delete(ctx context.Context, userID, walletID pgtype.UUID) error {
	return s.queries.DeleteWallet(ctx, DeleteWalletParams{
		ID:     walletID,
		UserID: userID,
	})
}

func (s *Service) UpdateBalance(ctx context.Context, walletID pgtype.UUID, delta int64) error {
	return s.queries.UpdateWalletBalance(ctx, UpdateWalletBalanceParams{
		ID:      walletID,
		Balance: delta,
	})
}

func (s *Service) SetBalance(ctx context.Context, userID, walletID pgtype.UUID, balance int64) error {
	return s.queries.SetWalletBalance(ctx, SetWalletBalanceParams{
		ID:      walletID,
		UserID:  userID,
		Balance: balance,
	})
}

func (s *Service) GetTotalBalance(ctx context.Context, userID pgtype.UUID) (int64, error) {
	return s.queries.GetWalletsTotalBalance(ctx, userID)
}

func (s *Service) SeedDefaults(ctx context.Context, userID pgtype.UUID) error {
	return s.queries.SeedDefaultWallets(ctx, userID)
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
	return fmt.Sprintf("%v", err) == "ERROR: duplicate key value violates unique constraint \"wallets_user_id_name_key\" (SQLSTATE 23505)" ||
		contains(fmt.Sprintf("%v", err), "23505")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
