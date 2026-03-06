package analytics

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type Service struct {
	queries *Queries
}

type MonthlySummaryResponse struct {
	Year         int   `json:"year"`
	Month        int   `json:"month"`
	TotalIncome  int64 `json:"total_income"`
	TotalExpense int64 `json:"total_expense"`
	Balance      int64 `json:"balance"`
}

type DailyItem struct {
	Date    string `json:"date"`
	Income  int64  `json:"income"`
	Expense int64  `json:"expense"`
}

type DailyBreakdownResponse struct {
	Year  int         `json:"year"`
	Month int         `json:"month"`
	Days  []DailyItem `json:"days"`
}

type TrendItem struct {
	Month   string `json:"month"`
	Income  int64  `json:"income"`
	Expense int64  `json:"expense"`
	Balance int64  `json:"balance"`
}

type TrendResponse struct {
	Months []TrendItem `json:"months"`
}

type TopItem struct {
	Description string `json:"description"`
	Frequency   int64  `json:"frequency"`
	TotalAmount int64  `json:"total_amount"`
}

type TopExpensesResponse struct {
	Year  int       `json:"year"`
	Month int       `json:"month"`
	Items []TopItem `json:"items"`
}

func NewService(queries *Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) GetMonthlySummary(ctx context.Context, userID pgtype.UUID, year int, month time.Month) (MonthlySummaryResponse, error) {
	start, end := monthRange(year, month)

	rows, err := s.queries.GetMonthlySummary(ctx, GetMonthlySummaryParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
	})
	if err != nil {
		return MonthlySummaryResponse{}, fmt.Errorf("gagal ambil summary: %w", err)
	}

	resp := MonthlySummaryResponse{Year: year, Month: int(month)}
	for _, row := range rows {
		switch row.TransactionType {
		case "INCOME":
			resp.TotalIncome = row.Total
		case "EXPENSE":
			resp.TotalExpense = row.Total
		}
	}
	resp.Balance = resp.TotalIncome - resp.TotalExpense
	return resp, nil
}

func (s *Service) GetDailyBreakdown(ctx context.Context, userID pgtype.UUID, year int, month time.Month) (DailyBreakdownResponse, error) {
	start, end := monthRange(year, month)

	rows, err := s.queries.GetDailyBreakdown(ctx, GetDailyBreakdownParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
	})
	if err != nil {
		return DailyBreakdownResponse{}, fmt.Errorf("gagal ambil daily breakdown: %w", err)
	}

	// Merge income and expense per date
	dayMap := make(map[string]*DailyItem)
	for _, row := range rows {
		dateStr := row.TxDate.Time.Format("2006-01-02")
		item, exists := dayMap[dateStr]
		if !exists {
			item = &DailyItem{Date: dateStr}
			dayMap[dateStr] = item
		}
		switch row.TransactionType {
		case "INCOME":
			item.Income = row.Total
		case "EXPENSE":
			item.Expense = row.Total
		}
	}

	// Collect and sort by date
	days := make([]DailyItem, 0, len(dayMap))
	loc, _ := time.LoadLocation("Asia/Jakarta")
	daysInMonth := time.Date(year, month+1, 0, 0, 0, 0, 0, loc).Day()
	for d := 1; d <= daysInMonth; d++ {
		dateStr := time.Date(year, month, d, 0, 0, 0, 0, loc).Format("2006-01-02")
		if item, exists := dayMap[dateStr]; exists {
			days = append(days, *item)
		}
	}

	return DailyBreakdownResponse{
		Year:  year,
		Month: int(month),
		Days:  days,
	}, nil
}

func (s *Service) GetTrend(ctx context.Context, userID pgtype.UUID, months int) (TrendResponse, error) {
	if months <= 0 || months > 12 {
		months = 6
	}

	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)
	end := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, loc)
	start := time.Date(now.Year(), now.Month()-time.Month(months-1), 1, 0, 0, 0, 0, loc)

	rows, err := s.queries.GetMonthlyTrend(ctx, GetMonthlyTrendParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
	})
	if err != nil {
		return TrendResponse{}, fmt.Errorf("gagal ambil trend: %w", err)
	}

	// Merge income/expense per month
	monthMap := make(map[string]*TrendItem)
	for _, row := range rows {
		item, exists := monthMap[row.TxMonth]
		if !exists {
			item = &TrendItem{Month: row.TxMonth}
			monthMap[row.TxMonth] = item
		}
		switch row.TransactionType {
		case "INCOME":
			item.Income = row.Total
		case "EXPENSE":
			item.Expense = row.Total
		}
	}

	// Build ordered result for all months in range
	result := make([]TrendItem, 0, months)
	for i := 0; i < months; i++ {
		m := time.Date(start.Year(), start.Month()+time.Month(i), 1, 0, 0, 0, 0, loc)
		key := m.Format("2006-01")
		if item, exists := monthMap[key]; exists {
			item.Balance = item.Income - item.Expense
			result = append(result, *item)
		} else {
			result = append(result, TrendItem{Month: key})
		}
	}

	return TrendResponse{Months: result}, nil
}

func (s *Service) GetTopExpenses(ctx context.Context, userID pgtype.UUID, year int, month time.Month, limit int32) (TopExpensesResponse, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	start, end := monthRange(year, month)

	rows, err := s.queries.GetTopDescriptions(ctx, GetTopDescriptionsParams{
		UserID:            userID,
		TransactionType:   "EXPENSE",
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
		Limit:             limit,
	})
	if err != nil {
		return TopExpensesResponse{}, fmt.Errorf("gagal ambil top expenses: %w", err)
	}

	items := make([]TopItem, len(rows))
	for i, row := range rows {
		desc := ""
		if row.Description.Valid {
			desc = row.Description.String
		}
		items[i] = TopItem{
			Description: desc,
			Frequency:   row.Frequency,
			TotalAmount: row.TotalAmount,
		}
	}

	return TopExpensesResponse{
		Year:  year,
		Month: int(month),
		Items: items,
	}, nil
}

type CategoryItem struct {
	Category string `json:"category"`
	Type     string `json:"type"`
	Total    int64  `json:"total"`
	Count    int64  `json:"count"`
}

type CategoryBreakdownResponse struct {
	Year  int            `json:"year"`
	Month int            `json:"month"`
	Items []CategoryItem `json:"items"`
}

func (s *Service) GetCategoryBreakdown(ctx context.Context, userID pgtype.UUID, year int, month time.Month) (CategoryBreakdownResponse, error) {
	start, end := monthRange(year, month)

	rows, err := s.queries.GetCategoryBreakdown(ctx, GetCategoryBreakdownParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
	})
	if err != nil {
		return CategoryBreakdownResponse{}, fmt.Errorf("gagal ambil category breakdown: %w", err)
	}

	items := make([]CategoryItem, len(rows))
	for i, row := range rows {
		items[i] = CategoryItem{
			Category: row.Category,
			Type:     row.TransactionType,
			Total:    row.Total,
			Count:    row.Count,
		}
	}

	return CategoryBreakdownResponse{
		Year:  year,
		Month: int(month),
		Items: items,
	}, nil
}

func monthRange(year int, month time.Month) (time.Time, time.Time) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	start := time.Date(year, month, 1, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 1, 0)
	return start, end
}
