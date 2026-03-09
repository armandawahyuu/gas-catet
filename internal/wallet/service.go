package wallet

import (
	"context"
	"errors"
	"fmt"

	"gas-catet/internal/plangating"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNameRequired      = errors.New("nama dompet wajib diisi")
	ErrWalletExists      = errors.New("dompet sudah ada")
	ErrSameWallet        = errors.New("dompet asal dan tujuan tidak boleh sama")
	ErrInvalidAmount     = errors.New("nominal harus lebih dari 0")
	ErrInsufficientFunds = errors.New("saldo dompet asal tidak cukup")
	ErrWalletLimitFree   = errors.New("paket Free maksimal 2 dompet, upgrade ke Pro untuk unlimited")
)

type Service struct {
	queries *Queries
	pool    *pgxpool.Pool
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

type TransferRequest struct {
	FromWalletID string `json:"from_wallet_id"`
	ToWalletID   string `json:"to_wallet_id"`
	Amount       int64  `json:"amount"`
	Note         string `json:"note"`
}

type TransferResponse struct {
	ID             string `json:"id"`
	FromWalletID   string `json:"from_wallet_id"`
	FromWalletName string `json:"from_wallet_name"`
	FromWalletIcon string `json:"from_wallet_icon"`
	ToWalletID     string `json:"to_wallet_id"`
	ToWalletName   string `json:"to_wallet_name"`
	ToWalletIcon   string `json:"to_wallet_icon"`
	Amount         int64  `json:"amount"`
	Note           string `json:"note"`
	CreatedAt      string `json:"created_at"`
}

func NewService(queries *Queries, pool *pgxpool.Pool) *Service {
	return &Service{queries: queries, pool: pool}
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

	// Check wallet limit for free users
	plan := plangating.CheckPlan(ctx, s.pool, userID)
	if plan == plangating.PlanFree {
		count, err := s.queries.CountWalletsByUser(ctx, userID)
		if err == nil && count >= plangating.MaxFreeWallets {
			return WalletResponse{}, ErrWalletLimitFree
		}
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

func (s *Service) Transfer(ctx context.Context, userID pgtype.UUID, req TransferRequest) (TransferResponse, error) {
	if req.Amount <= 0 {
		return TransferResponse{}, ErrInvalidAmount
	}

	fromID, err := stringToUUID(req.FromWalletID)
	if err != nil {
		return TransferResponse{}, fmt.Errorf("from_wallet_id tidak valid: %w", err)
	}
	toID, err := stringToUUID(req.ToWalletID)
	if err != nil {
		return TransferResponse{}, fmt.Errorf("to_wallet_id tidak valid: %w", err)
	}

	if fromID == toID {
		return TransferResponse{}, ErrSameWallet
	}

	// Begin DB transaction for atomic transfer
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return TransferResponse{}, fmt.Errorf("gagal mulai transaksi: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// Verify wallets belong to user & check balance
	fromWallet, err := qtx.GetWalletByID(ctx, GetWalletByIDParams{ID: fromID, UserID: userID})
	if err != nil {
		return TransferResponse{}, fmt.Errorf("dompet asal tidak ditemukan: %w", err)
	}
	if fromWallet.Balance < req.Amount {
		return TransferResponse{}, ErrInsufficientFunds
	}

	toWallet, err := qtx.GetWalletByID(ctx, GetWalletByIDParams{ID: toID, UserID: userID})
	if err != nil {
		return TransferResponse{}, fmt.Errorf("dompet tujuan tidak ditemukan: %w", err)
	}

	// Deduct from source, add to destination
	if err := qtx.UpdateWalletBalance(ctx, UpdateWalletBalanceParams{ID: fromID, Balance: -req.Amount}); err != nil {
		return TransferResponse{}, fmt.Errorf("gagal kurangi saldo: %w", err)
	}
	if err := qtx.UpdateWalletBalance(ctx, UpdateWalletBalanceParams{ID: toID, Balance: req.Amount}); err != nil {
		return TransferResponse{}, fmt.Errorf("gagal tambah saldo: %w", err)
	}

	// Create transfer record
	t, err := qtx.CreateTransfer(ctx, CreateTransferParams{
		UserID:       userID,
		FromWalletID: fromID,
		ToWalletID:   toID,
		Amount:       req.Amount,
		Note:         req.Note,
	})
	if err != nil {
		return TransferResponse{}, fmt.Errorf("gagal catat transfer: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return TransferResponse{}, fmt.Errorf("gagal commit transfer: %w", err)
	}

	return TransferResponse{
		ID:             uuidToString(t.ID),
		FromWalletID:   req.FromWalletID,
		FromWalletName: fromWallet.Name,
		FromWalletIcon: fromWallet.Icon,
		ToWalletID:     req.ToWalletID,
		ToWalletName:   toWallet.Name,
		ToWalletIcon:   toWallet.Icon,
		Amount:         t.Amount,
		Note:           t.Note,
		CreatedAt:      t.CreatedAt.Time.Format("2006-01-02 15:04"),
	}, nil
}

func (s *Service) ListTransfers(ctx context.Context, userID pgtype.UUID, limit, offset int32) ([]TransferResponse, error) {
	rows, err := s.queries.ListTransfersByUser(ctx, ListTransfersByUserParams{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("gagal list transfer: %w", err)
	}

	resp := make([]TransferResponse, len(rows))
	for i, r := range rows {
		resp[i] = TransferResponse{
			ID:             uuidToString(r.ID),
			FromWalletID:   uuidToString(r.FromWalletID),
			FromWalletName: r.FromWalletName,
			FromWalletIcon: r.FromWalletIcon,
			ToWalletID:     uuidToString(r.ToWalletID),
			ToWalletName:   r.ToWalletName,
			ToWalletIcon:   r.ToWalletIcon,
			Amount:         r.Amount,
			Note:           r.Note,
			CreatedAt:      r.CreatedAt.Time.Format("2006-01-02 15:04"),
		}
	}
	return resp, nil
}

func (s *Service) DeleteTransfer(ctx context.Context, userID, transferID pgtype.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("gagal mulai transaksi: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	row, err := qtx.DeleteTransfer(ctx, DeleteTransferParams{
		ID:     transferID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("gagal hapus transfer: %w", err)
	}

	// Reverse the balance changes
	if err := qtx.UpdateWalletBalance(ctx, UpdateWalletBalanceParams{ID: row.FromWalletID, Balance: row.Amount}); err != nil {
		return fmt.Errorf("gagal kembalikan saldo asal: %w", err)
	}
	if err := qtx.UpdateWalletBalance(ctx, UpdateWalletBalanceParams{ID: row.ToWalletID, Balance: -row.Amount}); err != nil {
		return fmt.Errorf("gagal kembalikan saldo tujuan: %w", err)
	}

	return tx.Commit(ctx)
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
