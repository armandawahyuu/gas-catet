package telegram

import (
	"context"
	"fmt"
	"log"
	"time"

	"gas-catet/internal/transaction"
	"gas-catet/internal/user"

	"github.com/jackc/pgx/v5/pgtype"
)

// Reporter sends automated financial reports to Telegram users
type Reporter struct {
	bot     *BotClient
	userSvc *user.Service
	txSvc   *transaction.Service
}

func NewReporter(bot *BotClient, userSvc *user.Service, txSvc *transaction.Service) *Reporter {
	return &Reporter{
		bot:     bot,
		userSvc: userSvc,
		txSvc:   txSvc,
	}
}

// StartDailyReport runs a scheduler that sends daily reports at 20:00 WIB
func (r *Reporter) StartDailyReport() {
	go func() {
		for {
			loc := time.FixedZone("WIB", 7*60*60)
			now := time.Now().In(loc)

			// Schedule for 20:00 WIB today, or tomorrow if already past
			next := time.Date(now.Year(), now.Month(), now.Day(), 20, 0, 0, 0, loc)
			if now.After(next) {
				next = next.AddDate(0, 0, 1)
			}

			sleepDuration := next.Sub(now)
			log.Printf("[Reporter] Next daily report at %s (sleeping %s)", next.Format("2006-01-02 15:04"), sleepDuration.Round(time.Minute))
			time.Sleep(sleepDuration)

			r.sendDailyReports()
		}
	}()
}

func (r *Reporter) sendDailyReports() {
	ctx := context.Background()
	queries := r.userSvc.GetQueries()

	users, err := queries.ListLinkedTelegramUsers(ctx)
	if err != nil {
		log.Printf("[Reporter] Error listing linked users: %v", err)
		return
	}

	log.Printf("[Reporter] Sending daily report to %d users", len(users))

	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)

	for _, u := range users {
		if !u.TelegramID.Valid {
			continue
		}

		// Today's summary
		todaySummary, err := r.txSvc.GetTodaySummary(ctx, u.ID)
		if err != nil {
			log.Printf("[Reporter] Error getting today summary for user %s: %v", u.Email, err)
			continue
		}

		// Monthly summary
		monthlySummary, err := r.txSvc.GetMonthlySummary(ctx, u.ID, now.Year(), now.Month())
		if err != nil {
			log.Printf("[Reporter] Error getting monthly summary for user %s: %v", u.Email, err)
			continue
		}

		msg := fmt.Sprintf("📊 *Laporan Harian GasCatet*\n📅 %s\n\n"+
			"*Hari Ini:*\n"+
			"💰 Pemasukan: %s\n"+
			"💸 Pengeluaran: %s\n"+
			"📝 Transaksi: %d\n\n"+
			"*Bulan %s:*\n"+
			"💰 Pemasukan: %s\n"+
			"💸 Pengeluaran: %s\n"+
			"💵 Sisa Saldo: %s\n\n"+
			"Tetap semangat mengatur keuangan! 💪",
			now.Format("02 Jan 2006"),
			formatRupiah(todaySummary.TotalIncome),
			formatRupiah(todaySummary.TotalExpense),
			todaySummary.TxCount,
			indonesianMonth(now.Month()),
			formatRupiah(monthlySummary.TotalIncome),
			formatRupiah(monthlySummary.TotalExpense),
			formatRupiah(monthlySummary.Balance),
		)

		err = r.bot.SendMessage(SendMessageRequest{
			ChatID:    u.TelegramID.Int64,
			Text:      msg,
			ParseMode: "Markdown",
		})
		if err != nil {
			log.Printf("[Reporter] Error sending report to %s: %v", u.Email, err)
		}
	}

	log.Printf("[Reporter] Daily report sent to %d users", len(users))
}

// SendReportToUser sends an immediate report to a specific telegram user (for /laporan command)
func (r *Reporter) SendReportToUser(chatID, telegramID int64) {
	ctx := context.Background()
	queries := r.userSvc.GetQueries()

	userRow, err := queries.GetUserByTelegramID(ctx, pgtype.Int8{Int64: telegramID, Valid: true})
	if err != nil {
		_ = r.bot.SendMessage(SendMessageRequest{
			ChatID: chatID,
			Text:   "⚠️ Akun Telegram kamu belum terhubung. Kirim /link <token> untuk menghubungkan.",
		})
		return
	}

	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)

	todaySummary, err := r.txSvc.GetTodaySummary(ctx, userRow.ID)
	if err != nil {
		_ = r.bot.SendMessage(SendMessageRequest{
			ChatID: chatID,
			Text:   "⚠️ Gagal ambil data laporan.",
		})
		return
	}

	monthlySummary, err := r.txSvc.GetMonthlySummary(ctx, userRow.ID, now.Year(), now.Month())
	if err != nil {
		_ = r.bot.SendMessage(SendMessageRequest{
			ChatID: chatID,
			Text:   "⚠️ Gagal ambil data laporan.",
		})
		return
	}

	msg := fmt.Sprintf("📊 *Laporan Keuangan GasCatet*\n📅 %s\n\n"+
		"*Hari Ini:*\n"+
		"💰 Pemasukan: %s\n"+
		"💸 Pengeluaran: %s\n"+
		"📝 Transaksi: %d\n\n"+
		"*Bulan %s:*\n"+
		"💰 Pemasukan: %s\n"+
		"💸 Pengeluaran: %s\n"+
		"💵 Sisa Saldo: %s\n\n"+
		"_Laporan otomatis dikirim setiap jam 20:00 WIB_ 🕗",
		now.Format("02 Jan 2006"),
		formatRupiah(todaySummary.TotalIncome),
		formatRupiah(todaySummary.TotalExpense),
		todaySummary.TxCount,
		indonesianMonth(now.Month()),
		formatRupiah(monthlySummary.TotalIncome),
		formatRupiah(monthlySummary.TotalExpense),
		formatRupiah(monthlySummary.Balance),
	)

	_ = r.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      msg,
		ParseMode: "Markdown",
	})
}
