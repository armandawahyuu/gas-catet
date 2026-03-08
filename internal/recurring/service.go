package recurring

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrInvalidAmount    = errors.New("nominal harus lebih dari 0")
	ErrInvalidType      = errors.New("tipe harus INCOME atau EXPENSE")
	ErrInvalidFrequency = errors.New("frekuensi harus daily, weekly, monthly, atau yearly")
)

// TransactionCreator creates actual transactions from recurring templates.
type TransactionCreator interface {
	CreateFromRecurring(ctx context.Context, userID pgtype.UUID, amount int64, txType, description, category string, walletID pgtype.UUID, txDate time.Time) error
}

// WalletBalanceUpdater updates wallet balance when recurring transactions are created.
type WalletBalanceUpdater interface {
	UpdateBalance(ctx context.Context, walletID pgtype.UUID, delta int64) error
}

type Service struct {
	queries    *Queries
	txCreator  TransactionCreator
	walUpdater WalletBalanceUpdater
}

type RecurringResponse struct {
	ID              string `json:"id"`
	Amount          int64  `json:"amount"`
	TransactionType string `json:"transaction_type"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	WalletID        string `json:"wallet_id"`
	WalletName      string `json:"wallet_name"`
	Frequency       string `json:"frequency"`
	NextRun         string `json:"next_run"`
	IsActive        bool   `json:"is_active"`
}

type CreateRecurringRequest struct {
	Amount          int64  `json:"amount"`
	TransactionType string `json:"transaction_type"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	WalletID        string `json:"wallet_id"`
	Frequency       string `json:"frequency"`
	NextRun         string `json:"next_run"`
}

type UpdateRecurringRequest struct {
	Amount          int64  `json:"amount"`
	TransactionType string `json:"transaction_type"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	WalletID        string `json:"wallet_id"`
	Frequency       string `json:"frequency"`
	NextRun         string `json:"next_run"`
	IsActive        bool   `json:"is_active"`
}

func NewService(queries *Queries, txCreator TransactionCreator) *Service {
	return &Service{queries: queries, txCreator: txCreator}
}

func (s *Service) SetWalletUpdater(w WalletBalanceUpdater) {
	s.walUpdater = w
}

func (s *Service) Create(ctx context.Context, userID pgtype.UUID, req CreateRecurringRequest) (RecurringResponse, error) {
	if req.Amount <= 0 {
		return RecurringResponse{}, ErrInvalidAmount
	}
	if req.TransactionType != "INCOME" && req.TransactionType != "EXPENSE" {
		return RecurringResponse{}, ErrInvalidType
	}
	if !isValidFrequency(req.Frequency) {
		return RecurringResponse{}, ErrInvalidFrequency
	}

	nextRun, err := parseDate(req.NextRun)
	if err != nil {
		return RecurringResponse{}, fmt.Errorf("format tanggal tidak valid (gunakan YYYY-MM-DD)")
	}

	category := req.Category
	if category == "" {
		category = "Lainnya"
	}

	var walletUUID pgtype.UUID
	if req.WalletID != "" {
		walletUUID, _ = stringToUUID(req.WalletID)
	}

	row, err := s.queries.CreateRecurring(ctx, CreateRecurringParams{
		UserID:          userID,
		Amount:          req.Amount,
		TransactionType: req.TransactionType,
		Description:     req.Description,
		Category:        category,
		WalletID:        walletUUID,
		Frequency:       req.Frequency,
		NextRun:         pgtype.Date{Time: nextRun, Valid: true},
	})
	if err != nil {
		return RecurringResponse{}, fmt.Errorf("gagal buat recurring: %w", err)
	}

	return rowToResponse(row), nil
}

func (s *Service) List(ctx context.Context, userID pgtype.UUID) ([]RecurringResponse, error) {
	rows, err := s.queries.ListRecurringByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal list recurring: %w", err)
	}

	resp := make([]RecurringResponse, len(rows))
	for i, r := range rows {
		resp[i] = RecurringResponse{
			ID:              uuidToString(r.ID),
			Amount:          r.Amount,
			TransactionType: r.TransactionType,
			Description:     r.Description,
			Category:        r.Category,
			WalletID:        uuidToString(r.WalletID),
			WalletName:      r.WalletName,
			Frequency:       r.Frequency,
			NextRun:         r.NextRun.Time.Format("2006-01-02"),
			IsActive:        r.IsActive,
		}
	}
	return resp, nil
}

func (s *Service) Update(ctx context.Context, userID, recID pgtype.UUID, req UpdateRecurringRequest) (RecurringResponse, error) {
	if req.Amount <= 0 {
		return RecurringResponse{}, ErrInvalidAmount
	}
	if req.TransactionType != "INCOME" && req.TransactionType != "EXPENSE" {
		return RecurringResponse{}, ErrInvalidType
	}
	if !isValidFrequency(req.Frequency) {
		return RecurringResponse{}, ErrInvalidFrequency
	}

	nextRun, err := parseDate(req.NextRun)
	if err != nil {
		return RecurringResponse{}, fmt.Errorf("format tanggal tidak valid (gunakan YYYY-MM-DD)")
	}

	category := req.Category
	if category == "" {
		category = "Lainnya"
	}

	var walletUUID pgtype.UUID
	if req.WalletID != "" {
		walletUUID, _ = stringToUUID(req.WalletID)
	}

	row, err := s.queries.UpdateRecurring(ctx, UpdateRecurringParams{
		ID:              recID,
		UserID:          userID,
		Amount:          req.Amount,
		TransactionType: req.TransactionType,
		Description:     req.Description,
		Category:        category,
		WalletID:        walletUUID,
		Frequency:       req.Frequency,
		NextRun:         pgtype.Date{Time: nextRun, Valid: true},
		IsActive:        req.IsActive,
	})
	if err != nil {
		return RecurringResponse{}, fmt.Errorf("gagal update recurring: %w", err)
	}

	return rowToResponse(row), nil
}

func (s *Service) Delete(ctx context.Context, userID, recID pgtype.UUID) error {
	return s.queries.DeleteRecurring(ctx, DeleteRecurringParams{ID: recID, UserID: userID})
}

func (s *Service) Toggle(ctx context.Context, userID, recID pgtype.UUID) (RecurringResponse, error) {
	row, err := s.queries.ToggleRecurring(ctx, ToggleRecurringParams{ID: recID, UserID: userID})
	if err != nil {
		return RecurringResponse{}, fmt.Errorf("gagal toggle recurring: %w", err)
	}
	return rowToResponse(row), nil
}

// ProcessDue finds all due recurring transactions and creates actual transactions.
func (s *Service) ProcessDue(ctx context.Context) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	today := time.Now().In(loc)
	todayDate := pgtype.Date{
		Time:  time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, loc),
		Valid: true,
	}

	dues, err := s.queries.ListDueRecurring(ctx, todayDate)
	if err != nil {
		log.Printf("[recurring] gagal list due: %v", err)
		return
	}

	for _, r := range dues {
		txDate := r.NextRun.Time
		err := s.txCreator.CreateFromRecurring(ctx, r.UserID, r.Amount, r.TransactionType, r.Description, r.Category, r.WalletID, txDate)
		if err != nil {
			log.Printf("[recurring] gagal buat transaksi untuk %s: %v", uuidToString(r.ID), err)
			continue
		}

		// Update wallet balance
		if s.walUpdater != nil && r.WalletID.Valid {
			delta := r.Amount
			if r.TransactionType == "EXPENSE" {
				delta = -r.Amount
			}
			_ = s.walUpdater.UpdateBalance(ctx, r.WalletID, delta)
		}

		next := advanceDate(txDate, r.Frequency)
		_ = s.queries.UpdateNextRun(ctx, UpdateNextRunParams{
			ID:      r.ID,
			NextRun: pgtype.Date{Time: next, Valid: true},
		})
		log.Printf("[recurring] processed %s, next run: %s", uuidToString(r.ID), next.Format("2006-01-02"))
	}
}

// StartScheduler runs ProcessDue every hour in a goroutine.
func (s *Service) StartScheduler(ctx context.Context) {
	go func() {
		// Run immediately on start
		s.ProcessDue(ctx)

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.ProcessDue(ctx)
			}
		}
	}()
	log.Println("[recurring] scheduler started (every 1 hour)")
}

// Helpers

func isValidFrequency(f string) bool {
	return f == "daily" || f == "weekly" || f == "monthly" || f == "yearly"
}

func parseDate(s string) (time.Time, error) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	return time.ParseInLocation("2006-01-02", s, loc)
}

func advanceDate(t time.Time, freq string) time.Time {
	switch freq {
	case "daily":
		return t.AddDate(0, 0, 1)
	case "weekly":
		return t.AddDate(0, 0, 7)
	case "monthly":
		return t.AddDate(0, 1, 0)
	case "yearly":
		return t.AddDate(1, 0, 0)
	default:
		return t.AddDate(0, 1, 0)
	}
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

func rowToResponse(r RecurringTransaction) RecurringResponse {
	return RecurringResponse{
		ID:              uuidToString(r.ID),
		Amount:          r.Amount,
		TransactionType: r.TransactionType,
		Description:     r.Description,
		Category:        r.Category,
		WalletID:        uuidToString(r.WalletID),
		Frequency:       r.Frequency,
		NextRun:         r.NextRun.Time.Format("2006-01-02"),
		IsActive:        r.IsActive,
	}
}
