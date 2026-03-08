package admin

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type Service struct {
	queries *Queries
}

func NewService(queries *Queries) *Service {
	return &Service{queries: queries}
}

type StatsResponse struct {
	TotalUsers    int64  `json:"total_users"`
	TotalTx       int64  `json:"total_transactions"`
	ActiveUsers7d int64  `json:"active_users_7d"`
	TotalVolume   int64  `json:"total_volume"`
	TotalIncome   int64  `json:"total_income"`
	TotalExpense  int64  `json:"total_expense"`
	TelegramUsers int64  `json:"telegram_users"`
	NewUsersToday int64  `json:"new_users_today"`
	TxToday       int64  `json:"tx_today"`
	DatabaseSize  string `json:"database_size"`
}

type UserItem struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	HasTelegram bool   `json:"has_telegram"`
	TxCount     int64  `json:"tx_count"`
	CreatedAt   string `json:"created_at"`
}

type RecentTxItem struct {
	ID              string `json:"id"`
	Amount          int64  `json:"amount"`
	TransactionType string `json:"transaction_type"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	TransactionDate string `json:"transaction_date"`
	UserName        string `json:"user_name"`
	UserEmail       string `json:"user_email"`
}

type DashboardResponse struct {
	Stats         StatsResponse     `json:"stats"`
	Users         []UserItem        `json:"users"`
	RecentTx      []RecentTxItem    `json:"recent_transactions"`
	TopCategories []TopCategoryItem `json:"top_categories"`
}

type TopCategoryItem struct {
	Category    string `json:"category"`
	TxCount     int64  `json:"tx_count"`
	TotalAmount int64  `json:"total_amount"`
}

func (s *Service) GetDashboard(ctx context.Context) (DashboardResponse, error) {
	totalUsers, err := s.queries.CountUsers(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("count users: %w", err)
	}

	totalTx, err := s.queries.CountTransactions(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("count tx: %w", err)
	}

	activeUsers, err := s.queries.CountActiveUsers(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("count active: %w", err)
	}

	totalVol, err := s.queries.TotalVolume(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("total volume: %w", err)
	}

	totalIncome, err := s.queries.TotalIncome(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("total income: %w", err)
	}

	totalExpense, err := s.queries.TotalExpense(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("total expense: %w", err)
	}

	telegramUsers, err := s.queries.CountTelegramUsers(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("telegram users: %w", err)
	}

	newUsersToday, err := s.queries.NewUsersToday(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("new users today: %w", err)
	}

	txToday, err := s.queries.TransactionsToday(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("tx today: %w", err)
	}

	dbSize, err := s.queries.GetDatabaseSize(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("db size: %w", err)
	}

	topCatsRows, err := s.queries.TopCategories(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("top categories: %w", err)
	}

	usersRows, err := s.queries.ListAllUsers(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("list users: %w", err)
	}

	recentRows, err := s.queries.RecentTransactions(ctx)
	if err != nil {
		return DashboardResponse{}, fmt.Errorf("recent tx: %w", err)
	}

	users := make([]UserItem, 0, len(usersRows))
	for _, u := range usersRows {
		users = append(users, UserItem{
			ID:          uuidToString(u.ID),
			Email:       u.Email,
			Name:        u.Name,
			HasTelegram: u.TelegramID.Valid,
			TxCount:     u.TxCount,
			CreatedAt:   u.CreatedAt.Time.Format(time.RFC3339),
		})
	}

	txItems := make([]RecentTxItem, 0, len(recentRows))
	for _, t := range recentRows {
		desc := ""
		if t.Description.Valid {
			desc = t.Description.String
		}
		txItems = append(txItems, RecentTxItem{
			ID:              uuidToString(t.ID),
			Amount:          t.Amount,
			TransactionType: t.TransactionType,
			Description:     desc,
			Category:        t.Category,
			TransactionDate: t.TransactionDate.Time.Format("2006-01-02"),
			UserName:        t.UserName,
			UserEmail:       t.UserEmail,
		})
	}

	topCats := make([]TopCategoryItem, 0, len(topCatsRows))
	for _, c := range topCatsRows {
		topCats = append(topCats, TopCategoryItem{
			Category:    c.Category,
			TxCount:     c.TxCount,
			TotalAmount: c.TotalAmount,
		})
	}

	return DashboardResponse{
		Stats: StatsResponse{
			TotalUsers:    totalUsers,
			TotalTx:       totalTx,
			ActiveUsers7d: activeUsers,
			TotalVolume:   totalVol,
			TotalIncome:   totalIncome,
			TotalExpense:  totalExpense,
			TelegramUsers: telegramUsers,
			NewUsersToday: newUsersToday,
			TxToday:       txToday,
			DatabaseSize:  dbSize,
		},
		Users:         users,
		RecentTx:      txItems,
		TopCategories: topCats,
	}, nil
}

type DailyVolumeItem struct {
	Date    string `json:"date"`
	Income  int64  `json:"income"`
	Expense int64  `json:"expense"`
}

type CategoryBreakdownItem struct {
	Category        string `json:"category"`
	TransactionType string `json:"transaction_type"`
	TxCount         int64  `json:"tx_count"`
	TotalAmount     int64  `json:"total_amount"`
}

type UserGrowthItem struct {
	Date     string `json:"date"`
	NewUsers int64  `json:"new_users"`
}

type AnalyticsResponse struct {
	DailyVolume []DailyVolumeItem       `json:"daily_volume"`
	Categories  []CategoryBreakdownItem `json:"categories"`
	UserGrowth  []UserGrowthItem        `json:"user_growth"`
}

func (s *Service) GetAnalytics(ctx context.Context) (AnalyticsResponse, error) {
	dailyRows, err := s.queries.DailyVolume(ctx)
	if err != nil {
		return AnalyticsResponse{}, fmt.Errorf("daily volume: %w", err)
	}

	catRows, err := s.queries.AllCategories(ctx)
	if err != nil {
		return AnalyticsResponse{}, fmt.Errorf("categories: %w", err)
	}

	growthRows, err := s.queries.UserGrowth(ctx)
	if err != nil {
		return AnalyticsResponse{}, fmt.Errorf("user growth: %w", err)
	}

	daily := make([]DailyVolumeItem, 0, len(dailyRows))
	for _, d := range dailyRows {
		daily = append(daily, DailyVolumeItem{
			Date:    d.DateStr,
			Income:  d.Income,
			Expense: d.Expense,
		})
	}

	cats := make([]CategoryBreakdownItem, 0, len(catRows))
	for _, c := range catRows {
		cats = append(cats, CategoryBreakdownItem{
			Category:        c.Category,
			TransactionType: c.TransactionType,
			TxCount:         c.TxCount,
			TotalAmount:     c.TotalAmount,
		})
	}

	growth := make([]UserGrowthItem, 0, len(growthRows))
	for _, g := range growthRows {
		growth = append(growth, UserGrowthItem{
			Date:     g.DateStr,
			NewUsers: g.NewUsers,
		})
	}

	return AnalyticsResponse{
		DailyVolume: daily,
		Categories:  cats,
		UserGrowth:  growth,
	}, nil
}

func (s *Service) GetAllTransactions(ctx context.Context) ([]RecentTxItem, error) {
	rows, err := s.queries.AllTransactions(ctx)
	if err != nil {
		return nil, fmt.Errorf("all transactions: %w", err)
	}

	items := make([]RecentTxItem, 0, len(rows))
	for _, t := range rows {
		desc := ""
		if t.Description.Valid {
			desc = t.Description.String
		}
		items = append(items, RecentTxItem{
			ID:              uuidToString(t.ID),
			Amount:          t.Amount,
			TransactionType: t.TransactionType,
			Description:     desc,
			Category:        t.Category,
			TransactionDate: t.TransactionDate.Time.Format("2006-01-02"),
			UserName:        t.UserName,
			UserEmail:       t.UserEmail,
		})
	}

	return items, nil
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
