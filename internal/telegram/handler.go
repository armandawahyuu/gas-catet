package telegram

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"gas-catet/internal/category"
	"gas-catet/internal/transaction"
	"gas-catet/internal/user"
	"gas-catet/internal/wallet"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	bot       *BotClient
	fsm       *FSM
	catSvc    *category.Service
	userSvc   *user.Service
	txSvc     *transaction.Service
	txQueries *transaction.Queries
	walSvc    *wallet.Service
}

func NewHandler(bot *BotClient, fsm *FSM, catSvc *category.Service, userSvc *user.Service, txSvc *transaction.Service, txQueries *transaction.Queries, walSvc *wallet.Service) *Handler {
	return &Handler{
		bot:       bot,
		fsm:       fsm,
		catSvc:    catSvc,
		userSvc:   userSvc,
		txSvc:     txSvc,
		txQueries: txQueries,
		walSvc:    walSvc,
	}
}

// Webhook handles incoming Telegram updates
func (h *Handler) Webhook(c *fiber.Ctx) error {
	var update Update
	if err := c.BodyParser(&update); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid update"})
	}

	// Process asynchronously via goroutine (as per PRD)
	go h.processUpdate(update)

	return c.SendStatus(fiber.StatusOK)
}

func (h *Handler) processUpdate(update Update) {
	if update.CallbackQuery != nil {
		h.handleCallback(update.CallbackQuery)
		return
	}

	if update.Message != nil {
		h.handleMessage(update.Message)
		return
	}
}

func (h *Handler) handleMessage(msg *Message) {
	chatID := msg.Chat.ID
	telegramID := msg.From.ID
	text := strings.TrimSpace(msg.Text)

	// Handle commands
	if strings.HasPrefix(text, "/") {
		h.handleCommand(chatID, telegramID, text)
		return
	}

	// Handle FSM state input
	session := h.fsm.GetSession(chatID)
	switch session.State {
	case StateWaitingCategory:
		// Category is selected via callback, not text input
		h.sendMessage(chatID, "⚠️ Pilih kategori pakai tombol di atas ya bos.")
	case StateWaitingForName:
		h.handleNameInput(chatID, telegramID, text)
	case StateWaitingAmount:
		h.handleAmountInput(chatID, telegramID, text)
	case StateWaitingCustomDate:
		h.handleCustomDateInput(chatID, telegramID, text)
	default:
		h.sendMainMenu(chatID)
	}
}

func (h *Handler) handleCommand(chatID, telegramID int64, text string) {
	switch {
	case text == "/start" || text == "/menu":
		h.sendMainMenu(chatID)
	case strings.HasPrefix(text, "/start "):
		// Deep link: t.me/bot?start=TOKEN sends "/start TOKEN"
		token := strings.TrimPrefix(text, "/start ")
		h.handleLinkToken(chatID, telegramID, token)
	case strings.HasPrefix(text, "/link "):
		token := strings.TrimPrefix(text, "/link ")
		h.handleLinkToken(chatID, telegramID, token)
	case text == "/saldo":
		h.handleSaldo(chatID, telegramID)
	case text == "/help":
		h.sendHelp(chatID)
	default:
		h.sendMainMenu(chatID)
	}
}

func (h *Handler) handleCallback(cb *CallbackQuery) {
	chatID := cb.Message.Chat.ID
	data := cb.Data

	// Answer callback to remove loading state
	_ = h.bot.AnswerCallbackQuery(AnswerCallbackQueryRequest{
		CallbackQueryID: cb.ID,
	})

	switch {
	case data == "expense":
		h.startTransaction(chatID, cb.From.ID, TypeExpense)
	case data == "income":
		h.startTransaction(chatID, cb.From.ID, TypeIncome)
	case strings.HasPrefix(data, "cat_"):
		h.handleCategorySelection(chatID, cb.From.ID, strings.TrimPrefix(data, "cat_"))
	case strings.HasPrefix(data, "wal_"):
		h.handleWalletSelection(chatID, cb.From.ID, strings.TrimPrefix(data, "wal_"))
	case data == "date_today":
		h.handleDateSelection(chatID, cb.From.ID, "today")
	case data == "date_yesterday":
		h.handleDateSelection(chatID, cb.From.ID, "yesterday")
	case data == "date_custom":
		h.handleCustomDatePrompt(chatID)
	case data == "cancel":
		h.fsm.ResetSession(chatID)
		h.sendMessage(chatID, "❌ Dibatalin ya bos. Mau nyatet lagi?")
		h.sendMainMenu(chatID)
	}
}

// FSM Flow

func (h *Handler) sendMainMenu(chatID int64) {
	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID: chatID,
		Text:   "Mau nyatet apa nih bos? 📝",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{
					{Text: "💸 Pengeluaran", CallbackData: "expense"},
					{Text: "💰 Pemasukan", CallbackData: "income"},
				},
			},
		},
	})
}

// State 1: User picked transaction type, show category buttons
func (h *Handler) startTransaction(chatID, telegramID int64, txType string) {
	// Check if user is linked
	if !h.isUserLinked(telegramID) {
		h.sendMessage(chatID, "⚠️ Akun Telegram kamu belum terhubung.\n\n1. Login di web GasCatet\n2. Ambil token di menu Link Telegram\n3. Kirim: /link <token>")
		return
	}

	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data user, coba lagi ya bos.")
		return
	}

	h.fsm.SetSession(chatID, &UserSession{
		State:           StateWaitingCategory,
		TransactionType: txType,
	})

	catType := "EXPENSE"
	if txType == TypeIncome {
		catType = "INCOME"
	}

	catItems, err := h.catSvc.List(ctx, userRow.ID, catType)
	if err != nil || len(catItems) == 0 {
		h.sendMessage(chatID, "⚠️ Kategori belum tersedia. Atur dulu di halaman Settings web ya bos.")
		return
	}

	buttons := make([][]InlineKeyboardButton, 0, len(catItems)/2+2)
	row := make([]InlineKeyboardButton, 0, 2)
	for _, item := range catItems {
		row = append(row, InlineKeyboardButton{Text: item.Name, CallbackData: "cat_" + item.Name})
		if len(row) == 2 {
			buttons = append(buttons, row)
			row = make([]InlineKeyboardButton, 0, 2)
		}
	}
	if len(row) > 0 {
		buttons = append(buttons, row)
	}
	buttons = append(buttons, []InlineKeyboardButton{{Text: "❌ Batal", CallbackData: "cancel"}})

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID: chatID,
		Text:   "Pilih kategorinya:",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: buttons,
		},
	})
}

// State 2: User picked category, ask for item name
func (h *Handler) handleCategorySelection(chatID, telegramID int64, category string) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateWaitingCategory {
		h.sendMainMenu(chatID)
		return
	}

	session.State = StateWaitingForName
	session.Category = category
	h.fsm.SetSession(chatID, session)

	label := "Beli apa tuh?"
	if session.TransactionType == TypeIncome {
		label = "Dapet duit dari mana nih?"
	}

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID: chatID,
		Text:   fmt.Sprintf("%s (Ketik nama barangnya)", label),
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{{Text: "❌ Batal", CallbackData: "cancel"}},
			},
		},
	})
}

// State 3: Got name, ask for amount
func (h *Handler) handleNameInput(chatID, telegramID int64, text string) {
	session := h.fsm.GetSession(chatID)
	session.State = StateWaitingAmount
	session.Description = text
	h.fsm.SetSession(chatID, session)

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID: chatID,
		Text:   fmt.Sprintf("Berapa harganya \"%s\"? (Ketik angkanya aja, misal: 40000)", text),
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{{Text: "❌ Batal", CallbackData: "cancel"}},
			},
		},
	})
}

// State 4: Got amount, ask for wallet
func (h *Handler) handleAmountInput(chatID, telegramID int64, text string) {
	// Clean number: remove dots, commas, spaces, "rp", "Rp"
	cleaned := text
	cleaned = strings.ReplaceAll(cleaned, ".", "")
	cleaned = strings.ReplaceAll(cleaned, ",", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	cleaned = strings.ToLower(cleaned)
	cleaned = strings.TrimPrefix(cleaned, "rp")

	amount, err := strconv.ParseInt(cleaned, 10, 64)
	if err != nil || amount <= 0 {
		h.sendMessage(chatID, "⚠️ Angka nggak valid bos. Ketik angkanya aja ya, misal: 40000")
		return
	}

	session := h.fsm.GetSession(chatID)
	session.State = StateWaitingWallet
	session.Amount = amount
	h.fsm.SetSession(chatID, session)

	// Show wallet selection
	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data user.")
		h.fsm.ResetSession(chatID)
		return
	}

	wallets, err := h.walSvc.List(ctx, userRow.ID)
	if err != nil || len(wallets) == 0 {
		// No wallets, skip to date
		session.State = StateWaitingDate
		h.fsm.SetSession(chatID, session)
		h.showDateSelection(chatID)
		return
	}

	buttons := make([][]InlineKeyboardButton, 0, len(wallets)/2+2)
	row := make([]InlineKeyboardButton, 0, 2)
	for _, w := range wallets {
		row = append(row, InlineKeyboardButton{Text: w.Icon + " " + w.Name, CallbackData: "wal_" + w.ID})
		if len(row) == 2 {
			buttons = append(buttons, row)
			row = make([]InlineKeyboardButton, 0, 2)
		}
	}
	if len(row) > 0 {
		buttons = append(buttons, row)
	}
	buttons = append(buttons, []InlineKeyboardButton{{Text: "⏭️ Skip", CallbackData: "wal_skip"}})
	buttons = append(buttons, []InlineKeyboardButton{{Text: "❌ Batal", CallbackData: "cancel"}})

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID: chatID,
		Text:   "Dari dompet mana?",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: buttons,
		},
	})
}

// Wallet selected, show date
func (h *Handler) handleWalletSelection(chatID, telegramID int64, walletData string) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateWaitingWallet {
		h.sendMainMenu(chatID)
		return
	}

	if walletData != "skip" {
		session.WalletID = walletData
		// Get wallet name for display
		ctx := context.Background()
		userRow, err := h.getUserByTelegramID(ctx, telegramID)
		if err == nil {
			var wID pgtype.UUID
			_ = wID.Scan(walletData)
			w, err := h.walSvc.GetByID(ctx, userRow.ID, wID)
			if err == nil {
				session.WalletName = w.Name
			}
		}
	}

	session.State = StateWaitingDate
	h.fsm.SetSession(chatID, session)
	h.showDateSelection(chatID)
}

func (h *Handler) showDateSelection(chatID int64) {
	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID: chatID,
		Text:   "Kapan transaksinya?",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{
					{Text: "🕒 Hari Ini", CallbackData: "date_today"},
					{Text: "🔙 Kemarin", CallbackData: "date_yesterday"},
				},
				{{Text: "📅 Pilih Tanggal", CallbackData: "date_custom"}},
				{{Text: "❌ Batal", CallbackData: "cancel"}},
			},
		},
	})
}

// State 5 (Finish): Got date, insert to DB
func (h *Handler) handleDateSelection(chatID, telegramID int64, dateChoice string) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateWaitingDate {
		h.sendMainMenu(chatID)
		return
	}

	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)

	var txDate string
	switch dateChoice {
	case "today":
		txDate = now.Format("2006-01-02")
	case "yesterday":
		txDate = now.AddDate(0, 0, -1).Format("2006-01-02")
	default:
		txDate = now.Format("2006-01-02")
	}

	// Get user by telegram ID
	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data user. Coba lagi nanti ya bos.")
		h.fsm.ResetSession(chatID)
		return
	}

	// Create transaction
	_, err = h.txSvc.Create(ctx, userRow.ID, transaction.CreateRequest{
		Amount:          session.Amount,
		TransactionType: session.TransactionType,
		Description:     session.Description,
		Category:        session.Category,
		WalletID:        session.WalletID,
		TransactionDate: txDate,
	})

	if err != nil {
		log.Printf("Error creating transaction: %v", err)
		h.sendMessage(chatID, "⚠️ Gagal nyimpen transaksi. Coba lagi ya bos.")
		h.fsm.ResetSession(chatID)
		return
	}

	// Update wallet balance
	if session.WalletID != "" {
		var wID pgtype.UUID
		_ = wID.Scan(session.WalletID)
		delta := -session.Amount
		if session.TransactionType == TypeIncome {
			delta = session.Amount
		}
		_ = h.walSvc.UpdateBalance(ctx, wID, delta)
	}

	// Format the amount
	amountStr := formatRupiah(session.Amount)

	typeEmoji := "💸"
	typeLabel := "Pengeluaran"
	if session.TransactionType == TypeIncome {
		typeEmoji = "💰"
		typeLabel = "Pemasukan"
	}

	walletLine := ""
	if session.WalletName != "" {
		walletLine = fmt.Sprintf("\n👛 %s", session.WalletName)
	}

	msg := fmt.Sprintf("✅ Gas! Udah dicatet bos!\n\n%s %s\n📝 %s\n🏷️ %s\n💵 %s\n📅 %s%s",
		typeEmoji, typeLabel,
		session.Description,
		session.Category,
		amountStr,
		txDate,
		walletLine,
	)

	h.sendMessage(chatID, msg)
	h.fsm.ResetSession(chatID)
}

// Custom date: prompt user to type date
func (h *Handler) handleCustomDatePrompt(chatID int64) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateWaitingDate {
		h.sendMainMenu(chatID)
		return
	}

	session.State = StateWaitingCustomDate
	h.fsm.SetSession(chatID, session)

	h.sendMessage(chatID, "📅 Ketik tanggalnya ya bos, format: DD/MM/YYYY\n\nContoh: 05/03/2026")
}

// Custom date: parse user text input
func (h *Handler) handleCustomDateInput(chatID, telegramID int64, text string) {
	text = strings.TrimSpace(text)

	// Parse DD/MM/YYYY
	parsed, err := time.Parse("02/01/2006", text)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Format tanggal nggak valid bos. Pakai DD/MM/YYYY ya.\n\nContoh: 05/03/2026")
		return
	}

	// Don't allow future dates
	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)
	if parsed.After(now) {
		h.sendMessage(chatID, "⚠️ Tanggal nggak boleh di masa depan bos.")
		return
	}

	txDate := parsed.Format("2006-01-02")

	session := h.fsm.GetSession(chatID)

	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data user. Coba lagi nanti ya bos.")
		h.fsm.ResetSession(chatID)
		return
	}

	_, err = h.txSvc.Create(ctx, userRow.ID, transaction.CreateRequest{
		Amount:          session.Amount,
		TransactionType: session.TransactionType,
		Description:     session.Description,
		Category:        session.Category,
		WalletID:        session.WalletID,
		TransactionDate: txDate,
	})

	if err != nil {
		log.Printf("Error creating transaction: %v", err)
		h.sendMessage(chatID, "⚠️ Gagal nyimpen transaksi. Coba lagi ya bos.")
		h.fsm.ResetSession(chatID)
		return
	}

	// Update wallet balance
	if session.WalletID != "" {
		var wID pgtype.UUID
		_ = wID.Scan(session.WalletID)
		delta := -session.Amount
		if session.TransactionType == TypeIncome {
			delta = session.Amount
		}
		_ = h.walSvc.UpdateBalance(ctx, wID, delta)
	}

	amountStr := formatRupiah(session.Amount)
	typeEmoji := "💸"
	typeLabel := "Pengeluaran"
	if session.TransactionType == TypeIncome {
		typeEmoji = "💰"
		typeLabel = "Pemasukan"
	}

	walletLine := ""
	if session.WalletName != "" {
		walletLine = fmt.Sprintf("\n👛 %s", session.WalletName)
	}

	msg := fmt.Sprintf("✅ Gas! Udah dicatet bos!\n\n%s %s\n📝 %s\n🏷️ %s\n💵 %s\n📅 %s%s",
		typeEmoji, typeLabel,
		session.Description,
		session.Category,
		amountStr,
		txDate,
		walletLine,
	)

	h.sendMessage(chatID, msg)
	h.fsm.ResetSession(chatID)
}

func (h *Handler) handleLinkToken(chatID, telegramID int64, token string) {
	ctx := context.Background()
	token = strings.TrimSpace(token)

	resp, err := h.userSvc.RedeemLinkToken(ctx, token, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Token tidak valid atau sudah kadaluarsa. Ambil token baru di web GasCatet.")
		return
	}

	h.sendMessage(chatID, fmt.Sprintf("✅ Berhasil terhubung!\n\nHalo %s, akun Telegram kamu udah nyambung ke GasCatet. Gas catet pengeluaran kamu! 🚀", resp.Name))
	h.sendMainMenu(chatID)
}

func (h *Handler) handleSaldo(chatID, telegramID int64) {
	ctx := context.Background()

	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Akun Telegram kamu belum terhubung. Kirim /link <token> untuk menghubungkan.")
		return
	}

	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)

	summary, err := h.txSvc.GetMonthlySummary(ctx, userRow.ID, now.Year(), now.Month())
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data saldo.")
		return
	}

	msg := fmt.Sprintf("📊 Ringkasan %s %d\n\n💰 Pemasukan: %s\n💸 Pengeluaran: %s\n\n💵 Sisa Saldo: %s",
		indonesianMonth(now.Month()),
		now.Year(),
		formatRupiah(summary.TotalIncome),
		formatRupiah(summary.TotalExpense),
		formatRupiah(summary.Balance),
	)

	h.sendMessage(chatID, msg)
}

func (h *Handler) sendHelp(chatID int64) {
	msg := `🤖 *GasCatet Bot*

Perintah:
/start - Menu utama
/saldo - Cek saldo bulan ini
/link <token> - Hubungkan akun Telegram
/help - Bantuan

Cara pakai:
1. Tap /start
2. Pilih Pengeluaran/Pemasukan
3. Ketik nama barang
4. Ketik harga
5. Pilih tanggal
Done! ✅`

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      msg,
		ParseMode: "Markdown",
	})
}

// Helpers

func (h *Handler) sendMessage(chatID int64, text string) {
	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID: chatID,
		Text:   text,
	})
}

func (h *Handler) isUserLinked(telegramID int64) bool {
	ctx := context.Background()
	_, err := h.getUserByTelegramID(ctx, telegramID)
	return err == nil
}

func (h *Handler) getUserByTelegramID(ctx context.Context, telegramID int64) (user.GetUserByTelegramIDRow, error) {
	userQueries := h.userSvc.GetQueries()
	return userQueries.GetUserByTelegramID(ctx, pgtype.Int8{Int64: telegramID, Valid: true})
}

func formatRupiah(amount int64) string {
	negative := amount < 0
	if negative {
		amount = -amount
	}

	str := strconv.FormatInt(amount, 10)
	n := len(str)
	if n <= 3 {
		if negative {
			return "-Rp" + str
		}
		return "Rp" + str
	}

	var result []byte
	for i, digit := range str {
		if i > 0 && (n-i)%3 == 0 {
			result = append(result, '.')
		}
		result = append(result, byte(digit))
	}

	if negative {
		return "-Rp" + string(result)
	}
	return "Rp" + string(result)
}

func indonesianMonth(m time.Month) string {
	months := []string{
		"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}
	return months[m]
}
