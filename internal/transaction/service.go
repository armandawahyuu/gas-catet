package transaction

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrTransactionNotFound = errors.New("transaksi tidak ditemukan")
	ErrInvalidType         = errors.New("tipe transaksi harus INCOME atau EXPENSE")
	ErrInvalidAmount       = errors.New("nominal harus lebih dari 0")
)

type Service struct {
	queries *Queries
}

type TransactionResponse struct {
	ID              string `json:"id"`
	Amount          int64  `json:"amount"`
	TransactionType string `json:"transaction_type"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	WalletID        string `json:"wallet_id"`
	WalletName      string `json:"wallet_name"`
	TransactionDate string `json:"transaction_date"`
	CreatedAt       string `json:"created_at"`
}

type CreateRequest struct {
	Amount          int64  `json:"amount"`
	TransactionType string `json:"transaction_type"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	WalletID        string `json:"wallet_id"`
	TransactionDate string `json:"transaction_date"`
}

type UpdateRequest struct {
	Amount          int64  `json:"amount"`
	TransactionType string `json:"transaction_type"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	WalletID        string `json:"wallet_id"`
	TransactionDate string `json:"transaction_date"`
}

type ListResponse struct {
	Transactions []TransactionResponse `json:"transactions"`
	Count        int                   `json:"count"`
}

type SummaryResponse struct {
	TotalIncome  int64 `json:"total_income"`
	TotalExpense int64 `json:"total_expense"`
	Balance      int64 `json:"balance"`
}

type TodaySummaryResponse struct {
	TotalIncome  int64 `json:"total_income"`
	TotalExpense int64 `json:"total_expense"`
	TxCount      int64 `json:"tx_count"`
}

func NewService(queries *Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) Create(ctx context.Context, userID pgtype.UUID, req CreateRequest) (TransactionResponse, error) {
	if req.Amount <= 0 {
		return TransactionResponse{}, ErrInvalidAmount
	}

	if req.TransactionType != "INCOME" && req.TransactionType != "EXPENSE" {
		return TransactionResponse{}, ErrInvalidType
	}

	txDate, err := parseTransactionDate(req.TransactionDate)
	if err != nil {
		return TransactionResponse{}, fmt.Errorf("format tanggal tidak valid (gunakan YYYY-MM-DD): %w", err)
	}

	category := req.Category
	if category == "" {
		category = "Lainnya"
	}

	var walletUUID pgtype.UUID
	if req.WalletID != "" {
		walletUUID, _ = stringToUUID(req.WalletID)
	}

	row, err := s.queries.CreateTransaction(ctx, CreateTransactionParams{
		UserID:          userID,
		Amount:          req.Amount,
		TransactionType: req.TransactionType,
		Description:     pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Category:        category,
		TransactionDate: pgtype.Timestamptz{Time: txDate, Valid: true},
		WalletID:        walletUUID,
	})
	if err != nil {
		return TransactionResponse{}, fmt.Errorf("gagal buat transaksi: %w", err)
	}

	return createRowToResponse(row), nil
}

func (s *Service) GetByID(ctx context.Context, userID, txID pgtype.UUID) (TransactionResponse, error) {
	row, err := s.queries.GetTransactionByID(ctx, GetTransactionByIDParams{
		ID:     txID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TransactionResponse{}, ErrTransactionNotFound
		}
		return TransactionResponse{}, fmt.Errorf("gagal ambil transaksi: %w", err)
	}

	return getRowToResponse(row), nil
}

func (s *Service) List(ctx context.Context, userID pgtype.UUID, txType string, limit, offset int32) (ListResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	var resp []TransactionResponse

	if txType != "" {
		if txType != "INCOME" && txType != "EXPENSE" {
			return ListResponse{}, ErrInvalidType
		}
		rows, err := s.queries.ListTransactionsByUserAndType(ctx, ListTransactionsByUserAndTypeParams{
			UserID:          userID,
			TransactionType: txType,
			Limit:           limit,
			Offset:          offset,
		})
		if err != nil {
			return ListResponse{}, fmt.Errorf("gagal list transaksi: %w", err)
		}
		resp = make([]TransactionResponse, len(rows))
		for i, tx := range rows {
			resp[i] = listTypeRowToResponse(tx)
		}
	} else {
		rows, err := s.queries.ListTransactionsByUser(ctx, ListTransactionsByUserParams{
			UserID: userID,
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			return ListResponse{}, fmt.Errorf("gagal list transaksi: %w", err)
		}
		resp = make([]TransactionResponse, len(rows))
		for i, tx := range rows {
			resp[i] = listRowToResponse(tx)
		}
	}

	return ListResponse{
		Transactions: resp,
		Count:        len(resp),
	}, nil
}

func (s *Service) Update(ctx context.Context, userID, txID pgtype.UUID, req UpdateRequest) (TransactionResponse, error) {
	if req.Amount <= 0 {
		return TransactionResponse{}, ErrInvalidAmount
	}

	if req.TransactionType != "INCOME" && req.TransactionType != "EXPENSE" {
		return TransactionResponse{}, ErrInvalidType
	}

	txDate, err := parseTransactionDate(req.TransactionDate)
	if err != nil {
		return TransactionResponse{}, fmt.Errorf("format tanggal tidak valid (gunakan YYYY-MM-DD): %w", err)
	}

	updateCategory := req.Category
	if updateCategory == "" {
		updateCategory = "Lainnya"
	}

	var walletUUID pgtype.UUID
	if req.WalletID != "" {
		walletUUID, _ = stringToUUID(req.WalletID)
	}

	row, err := s.queries.UpdateTransaction(ctx, UpdateTransactionParams{
		ID:              txID,
		UserID:          userID,
		Amount:          req.Amount,
		TransactionType: req.TransactionType,
		Description:     pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Category:        updateCategory,
		TransactionDate: pgtype.Timestamptz{Time: txDate, Valid: true},
		WalletID:        walletUUID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TransactionResponse{}, ErrTransactionNotFound
		}
		return TransactionResponse{}, fmt.Errorf("gagal update transaksi: %w", err)
	}

	return updateRowToResponse(row), nil
}

func (s *Service) Delete(ctx context.Context, userID, txID pgtype.UUID) error {
	err := s.queries.DeleteTransaction(ctx, DeleteTransactionParams{
		ID:     txID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("gagal hapus transaksi: %w", err)
	}
	return nil
}

func (s *Service) GetMonthlySummary(ctx context.Context, userID pgtype.UUID, year int, month time.Month) (SummaryResponse, error) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	start := time.Date(year, month, 1, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 1, 0)

	rows, err := s.queries.GetMonthlyTotal(ctx, GetMonthlyTotalParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
	})
	if err != nil {
		return SummaryResponse{}, fmt.Errorf("gagal ambil summary: %w", err)
	}

	var summary SummaryResponse
	for _, row := range rows {
		switch row.TransactionType {
		case "INCOME":
			summary.TotalIncome = row.Total
		case "EXPENSE":
			summary.TotalExpense = row.Total
		}
	}
	summary.Balance = summary.TotalIncome - summary.TotalExpense

	return summary, nil
}

func (s *Service) GetTodaySummary(ctx context.Context, userID pgtype.UUID) (TodaySummaryResponse, error) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	end := start.AddDate(0, 0, 1)

	rows, err := s.queries.GetDailyTotal(ctx, GetDailyTotalParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
	})
	if err != nil {
		return TodaySummaryResponse{}, fmt.Errorf("gagal ambil today summary: %w", err)
	}

	var resp TodaySummaryResponse
	for _, row := range rows {
		switch row.TransactionType {
		case "INCOME":
			resp.TotalIncome = row.Total
			resp.TxCount += row.Count
		case "EXPENSE":
			resp.TotalExpense = row.Total
			resp.TxCount += row.Count
		}
	}
	return resp, nil
}

// CreateFromRecurring creates a transaction from a recurring template (used by recurring scheduler).
func (s *Service) CreateFromRecurring(ctx context.Context, userID pgtype.UUID, amount int64, txType, description, category string, walletID pgtype.UUID, txDate time.Time) error {
	if category == "" {
		category = "Lainnya"
	}

	_, err := s.queries.CreateTransaction(ctx, CreateTransactionParams{
		UserID:          userID,
		Amount:          amount,
		TransactionType: txType,
		Description:     pgtype.Text{String: description, Valid: description != ""},
		Category:        category,
		TransactionDate: pgtype.Timestamptz{Time: txDate, Valid: true},
		WalletID:        walletID,
	})
	return err
}

func (s *Service) Search(ctx context.Context, userID pgtype.UUID, query string, limit, offset int32) (ListResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	rows, err := s.queries.SearchTransactions(ctx, SearchTransactionsParams{
		UserID:  userID,
		Column2: pgtype.Text{String: query, Valid: true},
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		return ListResponse{}, fmt.Errorf("gagal search transaksi: %w", err)
	}

	resp := make([]TransactionResponse, len(rows))
	for i, tx := range rows {
		resp[i] = searchRowToResponse(tx)
	}

	return ListResponse{
		Transactions: resp,
		Count:        len(resp),
	}, nil
}

// Helpers

func parseTransactionDate(dateStr string) (time.Time, error) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	return time.ParseInLocation("2006-01-02", dateStr, loc)
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

func toResponse(tx Transaction) TransactionResponse {
	desc := ""
	if tx.Description.Valid {
		desc = tx.Description.String
	}
	return TransactionResponse{
		ID:              uuidToString(tx.ID),
		Amount:          tx.Amount,
		TransactionType: tx.TransactionType,
		Description:     desc,
		Category:        tx.Category,
		TransactionDate: tx.TransactionDate.Time.Format("2006-01-02"),
		CreatedAt:       tx.CreatedAt.Time.Format(time.RFC3339),
	}
}

func createRowToResponse(tx CreateTransactionRow) TransactionResponse {
	desc := ""
	if tx.Description.Valid {
		desc = tx.Description.String
	}
	return TransactionResponse{
		ID:              uuidToString(tx.ID),
		Amount:          tx.Amount,
		TransactionType: tx.TransactionType,
		Description:     desc,
		Category:        tx.Category,
		WalletID:        uuidToString(tx.WalletID),
		TransactionDate: tx.TransactionDate.Time.Format("2006-01-02"),
		CreatedAt:       tx.CreatedAt.Time.Format(time.RFC3339),
	}
}

func getRowToResponse(tx GetTransactionByIDRow) TransactionResponse {
	desc := ""
	if tx.Description.Valid {
		desc = tx.Description.String
	}
	return TransactionResponse{
		ID:              uuidToString(tx.ID),
		Amount:          tx.Amount,
		TransactionType: tx.TransactionType,
		Description:     desc,
		Category:        tx.Category,
		WalletID:        uuidToString(tx.WalletID),
		WalletName:      tx.WalletName,
		TransactionDate: tx.TransactionDate.Time.Format("2006-01-02"),
		CreatedAt:       tx.CreatedAt.Time.Format(time.RFC3339),
	}
}

func updateRowToResponse(tx UpdateTransactionRow) TransactionResponse {
	desc := ""
	if tx.Description.Valid {
		desc = tx.Description.String
	}
	return TransactionResponse{
		ID:              uuidToString(tx.ID),
		Amount:          tx.Amount,
		TransactionType: tx.TransactionType,
		Description:     desc,
		Category:        tx.Category,
		WalletID:        uuidToString(tx.WalletID),
		TransactionDate: tx.TransactionDate.Time.Format("2006-01-02"),
		CreatedAt:       tx.CreatedAt.Time.Format(time.RFC3339),
	}
}

func listRowToResponse(tx ListTransactionsByUserRow) TransactionResponse {
	desc := ""
	if tx.Description.Valid {
		desc = tx.Description.String
	}
	return TransactionResponse{
		ID:              uuidToString(tx.ID),
		Amount:          tx.Amount,
		TransactionType: tx.TransactionType,
		Description:     desc,
		Category:        tx.Category,
		WalletID:        uuidToString(tx.WalletID),
		WalletName:      tx.WalletName,
		TransactionDate: tx.TransactionDate.Time.Format("2006-01-02"),
		CreatedAt:       tx.CreatedAt.Time.Format(time.RFC3339),
	}
}

func listTypeRowToResponse(tx ListTransactionsByUserAndTypeRow) TransactionResponse {
	desc := ""
	if tx.Description.Valid {
		desc = tx.Description.String
	}
	return TransactionResponse{
		ID:              uuidToString(tx.ID),
		Amount:          tx.Amount,
		TransactionType: tx.TransactionType,
		Description:     desc,
		Category:        tx.Category,
		WalletID:        uuidToString(tx.WalletID),
		WalletName:      tx.WalletName,
		TransactionDate: tx.TransactionDate.Time.Format("2006-01-02"),
		CreatedAt:       tx.CreatedAt.Time.Format(time.RFC3339),
	}
}

func searchRowToResponse(tx SearchTransactionsRow) TransactionResponse {
	desc := ""
	if tx.Description.Valid {
		desc = tx.Description.String
	}
	return TransactionResponse{
		ID:              uuidToString(tx.ID),
		Amount:          tx.Amount,
		TransactionType: tx.TransactionType,
		Description:     desc,
		Category:        tx.Category,
		WalletID:        uuidToString(tx.WalletID),
		WalletName:      tx.WalletName,
		TransactionDate: tx.TransactionDate.Time.Format("2006-01-02"),
		CreatedAt:       tx.CreatedAt.Time.Format(time.RFC3339),
	}
}
