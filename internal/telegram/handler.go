package telegram

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"gas-catet/internal/analytics"
	"gas-catet/internal/category"
	"gas-catet/internal/plangating"
	"gas-catet/internal/transaction"
	"gas-catet/internal/user"
	"gas-catet/internal/wallet"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	bot          *BotClient
	fsm          *FSM
	catSvc       *category.Service
	userSvc      *user.Service
	txSvc        *transaction.Service
	txQueries    *transaction.Queries
	walSvc       *wallet.Service
	analyticsSvc *analytics.Service
	reporter     *Reporter
	ocrSvc       *OCRService
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

func (h *Handler) SetReporter(r *Reporter) {
	h.reporter = r
}

func (h *Handler) SetOCR(o *OCRService) {
	h.ocrSvc = o
}

func (h *Handler) SetAnalytics(a *analytics.Service) {
	h.analyticsSvc = a
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

	// Handle photo messages (receipt scanning)
	if len(msg.Photo) > 0 {
		h.handlePhoto(chatID, telegramID, msg.Photo)
		return
	}

	// Handle commands
	if strings.HasPrefix(text, "/") {
		h.handleCommand(chatID, telegramID, text)
		return
	}

	// Handle FSM state input
	session := h.fsm.GetSession(chatID)
	switch session.State {
	case StateIdle:
		// Session expired or no state — guide user back
		h.sendMessage(chatID, "Sesi sebelumnya sudah berakhir. Ketik /start untuk mulai lagi ya bos 👇")
		h.sendMainMenu(chatID)
	case StateWaitingCategory:
		// Category is selected via callback, not text input
		h.sendMessage(chatID, "⚠️ Pilih kategori pakai tombol di atas ya bos.")
	case StateWaitingForName:
		h.handleNameInput(chatID, telegramID, text)
	case StateWaitingAmount:
		h.handleAmountInput(chatID, telegramID, text)
	case StateWaitingCustomDate:
		h.handleCustomDateInput(chatID, telegramID, text)
	case StateWaitingConfirm:
		h.sendMessage(chatID, "⚠️ Pakai tombol di atas ya bos — ✅ Simpan atau ✏️ Edit.")
	case StateReceiptConfirm:
		h.sendMessage(chatID, "⚠️ Pakai tombol di atas ya bos — ✅ Simpan, ✏️ Edit, atau ❌ Batal.")
	case StateReceiptWallet:
		h.sendMessage(chatID, "⚠️ Pilih dompet pakai tombol di atas ya bos.")
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
	case text == "/laporan":
		if h.reporter != nil {
			h.reporter.SendReportToUser(chatID, telegramID)
		} else {
			h.sendMessage(chatID, "⚠️ Fitur laporan belum aktif.")
		}
	case strings.HasPrefix(text, "/catat "):
		h.handleQuickAdd(chatID, telegramID, strings.TrimPrefix(text, "/catat "), TypeExpense)
	case strings.HasPrefix(text, "/masuk "):
		h.handleQuickAdd(chatID, telegramID, strings.TrimPrefix(text, "/masuk "), TypeIncome)
	case text == "/help":
		h.sendHelp(chatID)
	case text == "/roast":
		h.handleRoast(chatID, telegramID)
	case text == "/akun":
		h.handleAkun(chatID, telegramID)
	case text == "/diskonek":
		h.handleDisconnectPrompt(chatID, telegramID)
	case text == "/batal":
		session := h.fsm.GetSession(chatID)
		if session.State != StateIdle {
			h.fsm.ResetSession(chatID)
			h.sendMessage(chatID, "❌ Dibatalin ya bos. Mau nyatet lagi?")
			h.sendMainMenu(chatID)
		} else {
			h.sendMessage(chatID, "Nggak ada yang perlu dibatalin bos. Ketik /start untuk mulai 👇")
		}
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
	case data == "confirm_save":
		h.handleConfirmSave(chatID, cb.From.ID)
	case data == "edit_back":
		h.handleEditBack(chatID)
	case data == "confirm_disconnect":
		h.handleDisconnectConfirm(chatID, cb.From.ID)
	case data == "cancel_disconnect":
		h.sendMessage(chatID, "👍 Oke, akun tetap terhubung!")
	case data == "cancel":
		h.fsm.ResetSession(chatID)
		h.sendMessage(chatID, "❌ Dibatalin ya bos. Mau nyatet lagi?")
		h.sendMainMenu(chatID)
	case data == "receipt_save":
		h.handleReceiptSave(chatID, cb.From.ID)
	case strings.HasPrefix(data, "receipt_wal_"):
		h.handleReceiptWalletSelection(chatID, cb.From.ID, strings.TrimPrefix(data, "receipt_wal_"))
	case data == "receipt_edit":
		h.fsm.ResetSession(chatID)
		h.sendMessage(chatID, "✏️ Oke, coba kirim ulang foto struk-nya ya bos!")
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

// State 5: Got date, show confirmation before saving
func (h *Handler) handleDateSelection(chatID, telegramID int64, dateChoice string) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateWaitingDate {
		h.sendMainMenu(chatID)
		return
	}

	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)

	switch dateChoice {
	case "today":
		session.TxDate = now.Format("2006-01-02")
	case "yesterday":
		session.TxDate = now.AddDate(0, 0, -1).Format("2006-01-02")
	default:
		session.TxDate = now.Format("2006-01-02")
	}

	session.State = StateWaitingConfirm
	h.fsm.SetSession(chatID, session)
	h.showConfirmation(chatID, session)
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

	// Accept both DD/MM/YYYY and DD-MM-YYYY
	text = strings.ReplaceAll(text, "-", "/")

	// Parse DD/MM/YYYY
	parsed, err := time.Parse("02/01/2006", text)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Format tanggal nggak valid bos. Pakai DD/MM/YYYY ya.\n\nContoh: 05/03/2026 atau 05-03-2026")
		return
	}

	// Don't allow future dates
	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)
	if parsed.After(now) {
		h.sendMessage(chatID, "⚠️ Tanggal nggak boleh di masa depan bos.")
		return
	}

	session := h.fsm.GetSession(chatID)
	session.TxDate = parsed.Format("2006-01-02")
	session.State = StateWaitingConfirm
	h.fsm.SetSession(chatID, session)
	h.showConfirmation(chatID, session)
}

// Confirmation step: show summary before saving
func (h *Handler) showConfirmation(chatID int64, session *UserSession) {
	typeEmoji := "💸"
	typeLabel := "Pengeluaran"
	if session.TransactionType == TypeIncome {
		typeEmoji = "💰"
		typeLabel = "Pemasukan"
	}

	walletLine := ""
	if session.WalletName != "" {
		walletLine = fmt.Sprintf("👛 Dompet: %s\n", session.WalletName)
	}

	msg := fmt.Sprintf("📋 *Cek dulu ya bos, bener nggak?*\n\n"+
		"%s *%s*\n"+
		"📝 %s\n"+
		"🏷️ %s\n"+
		"💵 %s\n"+
		"📅 %s\n"+
		"%s\n"+
		"Udah bener? Tap ✅ buat simpan!",
		typeEmoji, typeLabel,
		session.Description,
		session.Category,
		formatRupiah(session.Amount),
		session.TxDate,
		walletLine,
	)

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      msg,
		ParseMode: "Markdown",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{
					{Text: "✅ Simpan", CallbackData: "confirm_save"},
					{Text: "✏️ Ulangi", CallbackData: "edit_back"},
				},
				{{Text: "❌ Batal", CallbackData: "cancel"}},
			},
		},
	})
}

// Handle confirmation: actually save the transaction
func (h *Handler) handleConfirmSave(chatID, telegramID int64) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateWaitingConfirm {
		h.sendMainMenu(chatID)
		return
	}

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
		TransactionDate: session.TxDate,
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
		formatRupiah(session.Amount),
		session.TxDate,
		walletLine,
	)

	h.sendMessage(chatID, msg)
	h.fsm.ResetSession(chatID)
}

// Handle edit: go back to main menu to start over
func (h *Handler) handleEditBack(chatID int64) {
	h.fsm.ResetSession(chatID)
	h.sendMessage(chatID, "🔄 Oke, ulangi dari awal ya bos!")
	h.sendMainMenu(chatID)
}

// /akun — show linked account info
func (h *Handler) handleAkun(chatID, telegramID int64) {
	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Akun Telegram kamu belum terhubung.\n\nKirim /link <token> untuk menghubungkan.")
		return
	}

	msg := fmt.Sprintf("👤 *Info Akun GasCatet*\n\n"+
		"📧 Email: %s\n"+
		"👤 Nama: %s\n"+
		"📱 Telegram ID: `%d`\n\n"+
		"_Mau putuskan koneksi? Ketik /diskonek_",
		userRow.Email,
		userRow.Name,
		telegramID,
	)

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      msg,
		ParseMode: "Markdown",
	})
}

// /diskonek — prompt user to confirm disconnect
func (h *Handler) handleDisconnectPrompt(chatID, telegramID int64) {
	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Akun Telegram kamu belum terhubung.")
		return
	}

	msg := fmt.Sprintf("⚠️ *Yakin mau putuskan koneksi?*\n\n"+
		"Akun: %s (%s)\n\n"+
		"Setelah diputus:\n"+
		"• Bot tidak bisa catat transaksi\n"+
		"• Laporan otomatis berhenti\n"+
		"• Bisa dihubungkan ulang nanti dari web",
		userRow.Name,
		userRow.Email,
	)

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      msg,
		ParseMode: "Markdown",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{
					{Text: "🔌 Ya, Putuskan", CallbackData: "confirm_disconnect"},
					{Text: "❌ Batal", CallbackData: "cancel_disconnect"},
				},
			},
		},
	})
}

// Handle disconnect confirmation
func (h *Handler) handleDisconnectConfirm(chatID, telegramID int64) {
	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Akun sudah tidak terhubung.")
		return
	}

	_, err = h.userSvc.UnlinkTelegram(ctx, userRow.ID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal memutuskan koneksi. Coba lagi ya bos.")
		return
	}

	h.sendMessage(chatID, "✅ Koneksi berhasil diputus.\n\nAkun Telegram kamu sudah tidak terhubung ke GasCatet. Untuk menghubungkan ulang, ambil token baru di web GasCatet.")
}

// ============ ROAST AI ============

func (h *Handler) handleRoast(chatID, telegramID int64) {
	if h.ocrSvc == nil {
		h.sendMessage(chatID, "⚠️ Fitur roast belum aktif (AI belum dikonfigurasi).")
		return
	}

	if !h.isUserLinked(telegramID) {
		h.sendMessage(chatID, "⚠️ Akun belum terhubung. Kirim /link <token> dulu ya bos.")
		return
	}

	h.sendMessage(chatID, "🔥 Bentar ya, lagi ngintip dompet kamu...")

	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data user.")
		return
	}

	roastText := h.generateRoast(ctx, userRow.ID, userRow.Name)
	if roastText == "" {
		return
	}

	msg := fmt.Sprintf("🔥🔥🔥 ROAST TIME 🔥🔥🔥\n\n%s", roastText)
	h.sendMessage(chatID, msg)
}

// generateRoast builds financial data and calls AI to generate a roast.
// Returns empty string if no data or AI fails.
func (h *Handler) generateRoast(ctx context.Context, userID pgtype.UUID, userName string) string {
	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)

	var dataLines []string

	// Monthly summary
	summary, err := h.txSvc.GetMonthlySummary(ctx, userID, now.Year(), now.Month())
	if err == nil {
		dataLines = append(dataLines, fmt.Sprintf("Bulan ini (%s %d):", indonesianMonth(now.Month()), now.Year()))
		dataLines = append(dataLines, fmt.Sprintf("- Total pemasukan: Rp%d", summary.TotalIncome))
		dataLines = append(dataLines, fmt.Sprintf("- Total pengeluaran: Rp%d", summary.TotalExpense))
		dataLines = append(dataLines, fmt.Sprintf("- Sisa saldo: Rp%d", summary.Balance))
	}

	// Category breakdown & top expenses
	if h.analyticsSvc != nil {
		catBreakdown, err := h.analyticsSvc.GetCategoryBreakdown(ctx, userID, now.Year(), now.Month())
		if err == nil && len(catBreakdown.Items) > 0 {
			dataLines = append(dataLines, "\nPengeluaran per kategori:")
			for _, item := range catBreakdown.Items {
				if item.Type == "EXPENSE" {
					dataLines = append(dataLines, fmt.Sprintf("- %s: Rp%d (%d transaksi)", item.Category, item.Total, item.Count))
				}
			}
		}

		topExpenses, err := h.analyticsSvc.GetTopExpenses(ctx, userID, now.Year(), now.Month(), 5)
		if err == nil && len(topExpenses.Items) > 0 {
			dataLines = append(dataLines, "\nTop 5 pengeluaran terbanyak:")
			for i, item := range topExpenses.Items {
				dataLines = append(dataLines, fmt.Sprintf("%d. %s — Rp%d (%dx)", i+1, item.Description, item.TotalAmount, item.Frequency))
			}
		}
	}

	if len(dataLines) == 0 {
		return ""
	}

	financialData := strings.Join(dataLines, "\n")

	prompt := fmt.Sprintf(`Kamu adalah "RoastBot" — AI yang SAVAGE, BRUTAL, dan LUCU dalam bahasa gaul Indonesia.

Tugas: Roast kebiasaan keuangan user berdasarkan data di bawah. Buat user KENA MENTAL tapi tetap lucu dan menghibur.

Aturan:
- Pakai bahasa gaul Indonesia (lu, gue, anjir, buset, ngab, dah, dll)
- SAVAGE tapi LUCU, jangan kasar atau menyinggung SARA
- Sindir kebiasaan belanja yang boros atau pola yang aneh
- Kasih 1 saran keuangan yang dibungkus humor di akhir
- Pakai emoji secukupnya
- Maksimal 800 karakter
- JANGAN pakai format markdown (tidak ada * atau _)
- Langsung roast, jangan basa-basi

Nama user: %s

Data keuangan:
%s`, userName, financialData)

	roastText, err := h.ocrSvc.GenerateRoast(prompt)
	if err != nil {
		log.Printf("Roast AI error: %v", err)
		return ""
	}

	return roastText
}

// ============ RECEIPT SCANNING (OCR) ============

func (h *Handler) handlePhoto(chatID, telegramID int64, photos []Photo) {
	if h.ocrSvc == nil {
		h.sendMessage(chatID, "⚠️ Fitur scan struk belum diaktifkan.")
		return
	}

	if !h.isUserLinked(telegramID) {
		h.sendMessage(chatID, "⚠️ Akun belum terhubung. Kirim /link <token> dulu ya bos.")
		return
	}

	// OCR is Pro-only (unless early access)
	if !plangating.IsEarlyAccess() {
		ctx := context.Background()
		userRow, err := h.getUserByTelegramID(ctx, telegramID)
		if err == nil && userRow.Plan != plangating.PlanPro {
			h.sendMessage(chatID, "🔒 Fitur Scan Struk AI khusus paket Pro.\n\nUpgrade di: https://dna-indonesia.myr.id/m/gascatet-pro")
			return
		}
	}

	// Get the largest photo (last in array = highest resolution)
	photo := photos[len(photos)-1]

	h.sendMessage(chatID, "🔍 Lagi baca struk-nya... tunggu bentar ya bos!")

	// Download photo from Telegram
	fileURL, err := h.bot.GetFileURL(photo.FileID)
	if err != nil {
		log.Printf("Error getting file URL: %v", err)
		h.sendMessage(chatID, "⚠️ Gagal ambil foto. Coba kirim ulang ya bos.")
		return
	}

	imageData, err := h.bot.DownloadFile(fileURL)
	if err != nil {
		log.Printf("Error downloading file: %v", err)
		h.sendMessage(chatID, "⚠️ Gagal download foto. Coba kirim ulang ya bos.")
		return
	}

	// Send to Gemini for OCR
	data, err := h.ocrSvc.ExtractReceipt(imageData)
	if err != nil {
		log.Printf("OCR error: %v", err)
		if strings.Contains(err.Error(), "bukan struk") {
			h.sendMessage(chatID, "🤔 Kayaknya ini bukan foto struk bos. Coba kirim foto struk belanja/transaksi ya!")
		} else {
			h.sendMessage(chatID, "⚠️ Gagal baca struk-nya bos. Pastikan foto struk-nya jelas dan coba kirim ulang.")
		}
		return
	}

	// Save to FSM session for wallet selection
	h.fsm.SetSession(chatID, &UserSession{
		State:           StateReceiptWallet,
		TransactionType: TypeExpense,
		Category:        data.Category,
		Description:     data.Description,
		Amount:          data.Total,
		TxDate:          data.Date,
		ReceiptFileID:   photo.FileID,
	})

	// Show wallet selection for receipt
	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data user.")
		h.fsm.ResetSession(chatID)
		return
	}

	wallets, err := h.walSvc.List(ctx, userRow.ID)
	if err != nil || len(wallets) == 0 {
		// No wallets — skip to confirmation
		session := h.fsm.GetSession(chatID)
		session.State = StateReceiptConfirm
		h.fsm.SetSession(chatID, session)
		msg := formatReceiptConfirmation(data)
		_ = h.bot.SendMessage(SendMessageRequest{
			ChatID:    chatID,
			Text:      msg,
			ParseMode: "Markdown",
			ReplyMarkup: &ReplyMarkup{
				InlineKeyboard: [][]InlineKeyboardButton{
					{
						{Text: "✅ Simpan", CallbackData: "receipt_save"},
						{Text: "✏️ Kirim Ulang", CallbackData: "receipt_edit"},
						{Text: "❌ Batal", CallbackData: "cancel"},
					},
				},
			},
		})
		return
	}

	buttons := make([][]InlineKeyboardButton, 0, len(wallets)/2+2)
	row := make([]InlineKeyboardButton, 0, 2)
	for _, w := range wallets {
		row = append(row, InlineKeyboardButton{Text: w.Icon + " " + w.Name, CallbackData: "receipt_wal_" + w.ID})
		if len(row) == 2 {
			buttons = append(buttons, row)
			row = make([]InlineKeyboardButton, 0, 2)
		}
	}
	if len(row) > 0 {
		buttons = append(buttons, row)
	}
	buttons = append(buttons, []InlineKeyboardButton{{Text: "⏭️ Tanpa Dompet", CallbackData: "receipt_wal_skip"}})
	buttons = append(buttons, []InlineKeyboardButton{{Text: "❌ Batal", CallbackData: "cancel"}})

	receiptMsg := formatReceiptConfirmation(data)
	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      receiptMsg + "\n\n👛 *Dari dompet mana?*",
		ParseMode: "Markdown",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: buttons,
		},
	})
}

// handleReceiptWalletSelection handles wallet selection after receipt OCR
func (h *Handler) handleReceiptWalletSelection(chatID, telegramID int64, walletData string) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateReceiptWallet {
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

	session.State = StateReceiptConfirm
	h.fsm.SetSession(chatID, session)

	walletLine := ""
	if session.WalletName != "" {
		walletLine = fmt.Sprintf("\n👛 Dompet: %s", session.WalletName)
	}

	msg := fmt.Sprintf("📸 *Konfirmasi Struk*\n\n"+
		"💸 Pengeluaran\n"+
		"📝 %s\n"+
		"🏷️ %s\n"+
		"💵 %s\n"+
		"📅 %s%s\n\n"+
		"_Udah bener? Tap ✅ buat simpan!_",
		session.Description,
		session.Category,
		formatRupiah(session.Amount),
		session.TxDate,
		walletLine,
	)

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      msg,
		ParseMode: "Markdown",
		ReplyMarkup: &ReplyMarkup{
			InlineKeyboard: [][]InlineKeyboardButton{
				{
					{Text: "✅ Simpan", CallbackData: "receipt_save"},
					{Text: "✏️ Kirim Ulang", CallbackData: "receipt_edit"},
					{Text: "❌ Batal", CallbackData: "cancel"},
				},
			},
		},
	})
}

func (h *Handler) handleReceiptSave(chatID, telegramID int64) {
	session := h.fsm.GetSession(chatID)
	if session.State != StateReceiptConfirm {
		h.sendMainMenu(chatID)
		return
	}

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
		TransactionDate: session.TxDate,
	})

	if err != nil {
		log.Printf("Error creating receipt transaction: %v", err)
		h.sendMessage(chatID, "⚠️ Gagal nyimpen transaksi. Coba lagi ya bos.")
		h.fsm.ResetSession(chatID)
		return
	}

	// Update wallet balance
	if session.WalletID != "" {
		var wID pgtype.UUID
		_ = wID.Scan(session.WalletID)
		_ = h.walSvc.UpdateBalance(ctx, wID, -session.Amount)
	}

	walletLine := ""
	if session.WalletName != "" {
		walletLine = fmt.Sprintf("\n👛 %s", session.WalletName)
	}

	msg := fmt.Sprintf("✅ Struk berhasil dicatat!\n\n"+
		"💸 Pengeluaran\n"+
		"📝 %s\n"+
		"🏷️ %s\n"+
		"💵 %s\n"+
		"📅 %s%s",
		session.Description,
		session.Category,
		formatRupiah(session.Amount),
		session.TxDate,
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
	msg := `🤖 *Panduan GasCatet Bot*

📌 *Menu Utama*
/start — Buka menu catat transaksi
/batal — Batalkan input yang sedang berjalan

💰 *Lihat Keuangan*
/saldo — Ringkasan saldo bulan ini
/laporan — Laporan lengkap hari ini & bulan ini
/roast — AI nge-roast kebiasaan belanja kamu 🔥

⚡ *Quick Add (1 pesan langsung jadi)*
/catat <nominal> <deskripsi>
→ Contoh: /catat 25000 kopi susu

/masuk <nominal> <deskripsi>
→ Contoh: /masuk 5000000 gaji bulanan

🔗 *Akun*
/link <token> — Hubungkan akun Telegram
/akun — Info akun yang terhubung
/diskonek — Putuskan koneksi akun
/help — Tampilkan bantuan ini

💡 *Tips:*
• Nominal bisa pakai titik: 25.000
• Tanggal bisa DD/MM/YYYY atau DD-MM-YYYY
• Quick add otomatis masuk kategori "Lainnya"
• 📸 Kirim foto struk → otomatis kecatat!
• Laporan otomatis dikirim jam 20:00 WIB 🕗`

	_ = h.bot.SendMessage(SendMessageRequest{
		ChatID:    chatID,
		Text:      msg,
		ParseMode: "Markdown",
	})
}

// handleQuickAdd processes quick add commands: /catat 40000 kopi starbucks
func (h *Handler) handleQuickAdd(chatID, telegramID int64, input string, txType string) {
	if !h.isUserLinked(telegramID) {
		h.sendMessage(chatID, "⚠️ Akun Telegram kamu belum terhubung.\n\n1. Login di web GasCatet\n2. Ambil token di menu Link Telegram\n3. Kirim: /link <token>")
		return
	}

	parts := strings.SplitN(input, " ", 2)
	if len(parts) < 2 {
		if txType == TypeIncome {
			h.sendMessage(chatID, "⚠️ Format: /masuk <nominal> <deskripsi>\n\nContoh: /masuk 5000000 gaji bulanan")
		} else {
			h.sendMessage(chatID, "⚠️ Format: /catat <nominal> <deskripsi>\n\nContoh: /catat 40000 kopi starbucks")
		}
		return
	}

	// Parse amount
	amountStr := parts[0]
	amountStr = strings.ReplaceAll(amountStr, ".", "")
	amountStr = strings.ReplaceAll(amountStr, ",", "")
	amountStr = strings.ToLower(amountStr)
	amountStr = strings.TrimPrefix(amountStr, "rp")

	amount, err := strconv.ParseInt(amountStr, 10, 64)
	if err != nil || amount <= 0 {
		h.sendMessage(chatID, "⚠️ Nominal nggak valid bos. Contoh: /catat 40000 kopi")
		return
	}

	description := strings.TrimSpace(parts[1])
	if description == "" {
		h.sendMessage(chatID, "⚠️ Deskripsi nggak boleh kosong bos.")
		return
	}

	ctx := context.Background()
	userRow, err := h.getUserByTelegramID(ctx, telegramID)
	if err != nil {
		h.sendMessage(chatID, "⚠️ Gagal ambil data user. Coba lagi ya bos.")
		return
	}

	loc := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(loc)
	txDate := now.Format("2006-01-02")

	_, err = h.txSvc.Create(ctx, userRow.ID, transaction.CreateRequest{
		Amount:          amount,
		TransactionType: txType,
		Description:     description,
		Category:        "Lainnya",
		TransactionDate: txDate,
	})

	if err != nil {
		log.Printf("Error quick-add transaction: %v", err)
		h.sendMessage(chatID, "⚠️ Gagal nyimpen transaksi. Coba lagi ya bos.")
		return
	}

	typeEmoji := "💸"
	typeLabel := "Pengeluaran"
	if txType == TypeIncome {
		typeEmoji = "💰"
		typeLabel = "Pemasukan"
	}

	msg := fmt.Sprintf("⚡ Quick add berhasil!\n\n%s %s\n📝 %s\n💵 %s\n📅 %s",
		typeEmoji, typeLabel,
		description,
		formatRupiah(amount),
		txDate,
	)

	h.sendMessage(chatID, msg)
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
