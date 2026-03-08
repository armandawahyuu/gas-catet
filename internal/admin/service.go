package admin

import (
	"context"
	"crypto/sha256"
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

// ============ TRACK PAGE VIEW ============

func (s *Service) TrackPageView(ctx context.Context, path, ip, userAgent, referrer string, isAuth bool) error {
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(ip+userAgent)))
	return s.queries.InsertPageView(ctx, InsertPageViewParams{
		Path:            path,
		VisitorHash:     hash[:16],
		UserAgent:       pgtype.Text{String: userAgent, Valid: userAgent != ""},
		Referrer:        pgtype.Text{String: referrer, Valid: referrer != ""},
		IsAuthenticated: pgtype.Bool{Bool: isAuth, Valid: true},
	})
}

// ============ DASHBOARD (Overview) ============

type OverviewStats struct {
	TotalUsers        int64   `json:"total_users"`
	NewUsersToday     int64   `json:"new_users_today"`
	NewUsersThisWeek  int64   `json:"new_users_week"`
	NewUsersThisMonth int64   `json:"new_users_month"`
	ActiveUsers7d     int64   `json:"active_users_7d"`
	ActiveUsers30d    int64   `json:"active_users_30d"`
	TelegramUsers     int64   `json:"telegram_users"`
	TotalTransactions int64   `json:"total_transactions"`
	TxToday           int64   `json:"tx_today"`
	AvgTxPerUser      float64 `json:"avg_tx_per_user"`
	DatabaseSize      string  `json:"database_size"`
}

type VisitorStats struct {
	PageViewsToday      int64 `json:"page_views_today"`
	UniqueVisitorsToday int64 `json:"unique_visitors_today"`
	UniqueVisitorsWeek  int64 `json:"unique_visitors_week"`
	UniqueVisitorsMonth int64 `json:"unique_visitors_month"`
	TotalPageViews      int64 `json:"total_page_views"`
	TotalUniqueVisitors int64 `json:"total_unique_visitors"`
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
	Stats    OverviewStats  `json:"stats"`
	Visitors VisitorStats   `json:"visitors"`
	Users    []UserItem     `json:"users"`
	RecentTx []RecentTxItem `json:"recent_transactions"`
}

func (s *Service) GetDashboard(ctx context.Context) (DashboardResponse, error) {
	totalUsers, _ := s.queries.CountUsers(ctx)
	newToday, _ := s.queries.NewUsersToday(ctx)
	newWeek, _ := s.queries.NewUsersThisWeek(ctx)
	newMonth, _ := s.queries.NewUsersThisMonth(ctx)
	active7d, _ := s.queries.CountActiveUsers7d(ctx)
	active30d, _ := s.queries.CountActiveUsers30d(ctx)
	telegramUsers, _ := s.queries.CountTelegramUsers(ctx)
	totalTx, _ := s.queries.CountTransactions(ctx)
	txToday, _ := s.queries.TransactionsToday(ctx)
	avgTx, _ := s.queries.AvgTxPerUser(ctx)
	dbSize, _ := s.queries.GetDatabaseSize(ctx)

	pvToday, _ := s.queries.TotalPageViewsToday(ctx)
	uvToday, _ := s.queries.UniqueVisitorsToday(ctx)
	uvWeek, _ := s.queries.UniqueVisitorsThisWeek(ctx)
	uvMonth, _ := s.queries.UniqueVisitorsThisMonth(ctx)
	pvAll, _ := s.queries.TotalPageViewsAll(ctx)
	uvAll, _ := s.queries.TotalUniqueVisitorsAll(ctx)

	usersRows, _ := s.queries.ListAllUsers(ctx)
	recentRows, _ := s.queries.RecentTransactions(ctx)

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

	return DashboardResponse{
		Stats: OverviewStats{
			TotalUsers:        totalUsers,
			NewUsersToday:     newToday,
			NewUsersThisWeek:  newWeek,
			NewUsersThisMonth: newMonth,
			ActiveUsers7d:     active7d,
			ActiveUsers30d:    active30d,
			TelegramUsers:     telegramUsers,
			TotalTransactions: totalTx,
			TxToday:           txToday,
			AvgTxPerUser:      avgTx,
			DatabaseSize:      dbSize,
		},
		Visitors: VisitorStats{
			PageViewsToday:      pvToday,
			UniqueVisitorsToday: uvToday,
			UniqueVisitorsWeek:  uvWeek,
			UniqueVisitorsMonth: uvMonth,
			TotalPageViews:      pvAll,
			TotalUniqueVisitors: uvAll,
		},
		Users:    users,
		RecentTx: txItems,
	}, nil
}

// ============ GROWTH ANALYTICS ============

type DailyPageViewItem struct {
	Date           string `json:"date"`
	Views          int64  `json:"views"`
	UniqueVisitors int64  `json:"unique_visitors"`
}

type TopPageItem struct {
	Path           string `json:"path"`
	Views          int64  `json:"views"`
	UniqueVisitors int64  `json:"unique_visitors"`
}

type HourlyViewItem struct {
	Hour  int   `json:"hour"`
	Views int64 `json:"views"`
}

type UserGrowthItem struct {
	Date     string `json:"date"`
	NewUsers int64  `json:"new_users"`
}

type CumulativeUserItem struct {
	Date       string `json:"date"`
	Cumulative int64  `json:"cumulative"`
}

type DailyActiveItem struct {
	Date        string `json:"date"`
	ActiveUsers int64  `json:"active_users"`
}

type DailyTxCountItem struct {
	Date    string `json:"date"`
	TxCount int64  `json:"tx_count"`
}

type GrowthResponse struct {
	DailyPageViews   []DailyPageViewItem  `json:"daily_page_views"`
	TopPages         []TopPageItem        `json:"top_pages"`
	HourlyViews      []HourlyViewItem     `json:"hourly_views"`
	UserGrowth       []UserGrowthItem     `json:"user_growth"`
	CumulativeUsers  []CumulativeUserItem `json:"cumulative_users"`
	DailyActiveUsers []DailyActiveItem    `json:"daily_active_users"`
	DailyTxCount     []DailyTxCountItem   `json:"daily_tx_count"`
}

func (s *Service) GetGrowth(ctx context.Context) (GrowthResponse, error) {
	dpvRows, _ := s.queries.DailyPageViews(ctx)
	tpRows, _ := s.queries.TopPages(ctx)
	hvRows, _ := s.queries.HourlyPageViews(ctx)
	ugRows, _ := s.queries.UserGrowthDaily(ctx)
	cuRows, _ := s.queries.CumulativeUsers(ctx)
	dauRows, _ := s.queries.DailyActiveUsers(ctx)
	dtcRows, _ := s.queries.DailyTransactionCount(ctx)

	dpv := make([]DailyPageViewItem, 0, len(dpvRows))
	for _, r := range dpvRows {
		dpv = append(dpv, DailyPageViewItem{Date: r.DateStr, Views: r.Views, UniqueVisitors: r.UniqueVisitors})
	}

	tp := make([]TopPageItem, 0, len(tpRows))
	for _, r := range tpRows {
		tp = append(tp, TopPageItem{Path: r.Path, Views: r.Views, UniqueVisitors: r.UniqueVisitors})
	}

	hv := make([]HourlyViewItem, 0, len(hvRows))
	for _, r := range hvRows {
		hv = append(hv, HourlyViewItem{Hour: int(r.HourOfDay), Views: r.Views})
	}

	ug := make([]UserGrowthItem, 0, len(ugRows))
	for _, r := range ugRows {
		ug = append(ug, UserGrowthItem{Date: r.DateStr, NewUsers: r.NewUsers})
	}

	cu := make([]CumulativeUserItem, 0, len(cuRows))
	for _, r := range cuRows {
		cu = append(cu, CumulativeUserItem{Date: r.DateStr, Cumulative: r.Cumulative})
	}

	dau := make([]DailyActiveItem, 0, len(dauRows))
	for _, r := range dauRows {
		dau = append(dau, DailyActiveItem{Date: r.DateStr, ActiveUsers: r.ActiveUsers})
	}

	dtc := make([]DailyTxCountItem, 0, len(dtcRows))
	for _, r := range dtcRows {
		dtc = append(dtc, DailyTxCountItem{Date: r.DateStr, TxCount: r.TxCount})
	}

	return GrowthResponse{
		DailyPageViews:   dpv,
		TopPages:         tp,
		HourlyViews:      hv,
		UserGrowth:       ug,
		CumulativeUsers:  cu,
		DailyActiveUsers: dau,
		DailyTxCount:     dtc,
	}, nil
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
