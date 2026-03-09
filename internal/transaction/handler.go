package transaction

import (
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// sanitizeCSV prevents CSV injection by prefixing dangerous characters
func sanitizeCSV(s string) string {
	if len(s) > 0 && (s[0] == '=' || s[0] == '+' || s[0] == '-' || s[0] == '@' || s[0] == '\t' || s[0] == '\r') {
		return "'" + s
	}
	return s
}

// WalletBalanceUpdater abstracts wallet balance operations to avoid circular imports
type WalletBalanceUpdater interface {
	UpdateBalance(ctx context.Context, walletID pgtype.UUID, delta int64) error
}

type Handler struct {
	service    *Service
	walUpdater WalletBalanceUpdater
}

func NewHandler(service *Service, walUpdater WalletBalanceUpdater) *Handler {
	return &Handler{service: service, walUpdater: walUpdater}
}

func (h *Handler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
	}

	if req.TransactionDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "transaction_date wajib diisi (YYYY-MM-DD)"})
	}

	resp, err := h.service.Create(c.Context(), userID, req)
	if err != nil {
		switch err {
		case ErrInvalidAmount:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		case ErrInvalidType:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal buat transaksi"})
		}
	}

	// Update wallet balance
	if req.WalletID != "" && h.walUpdater != nil {
		walUUID, _ := stringToUUID(req.WalletID)
		if walUUID.Valid {
			delta := req.Amount
			if req.TransactionType == "EXPENSE" {
				delta = -delta
			}
			if err := h.walUpdater.UpdateBalance(c.Context(), walUUID, delta); err != nil {
				log.Printf("[WARN] Wallet balance update failed: %v", err)
			}
		}
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	resp, err := h.service.GetByID(c.Context(), userID, txID)
	if err != nil {
		if err == ErrTransactionNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil transaksi"})
	}

	return c.JSON(resp)
}

func (h *Handler) List(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txType := c.Query("type")
	search := c.Query("q")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	if search != "" {
		resp, err := h.service.Search(c.Context(), userID, search, int32(limit), int32(offset))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal cari transaksi"})
		}
		return c.JSON(resp)
	}

	resp, err := h.service.List(c.Context(), userID, txType, int32(limit), int32(offset))
	if err != nil {
		if err == ErrInvalidType {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal list transaksi"})
	}

	return c.JSON(resp)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	// Get old transaction to reverse wallet balance and preserve receipt
	oldTx, err := h.service.GetByID(c.Context(), userID, txID)
	if err != nil {
		if err == ErrTransactionNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil transaksi"})
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
	}

	// Preserve receipt_url if not explicitly provided
	if req.ReceiptURL == "" {
		req.ReceiptURL = oldTx.ReceiptURL
	}

	resp, err := h.service.Update(c.Context(), userID, txID, req)
	if err != nil {
		switch err {
		case ErrTransactionNotFound:
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		case ErrInvalidAmount, ErrInvalidType:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal update transaksi"})
		}
	}

	// Adjust wallet balances
	if h.walUpdater != nil {
		// Reverse old wallet balance
		if oldTx.WalletID != "" {
			oldWalUUID, _ := stringToUUID(oldTx.WalletID)
			if oldWalUUID.Valid {
				oldDelta := -oldTx.Amount
				if oldTx.TransactionType == "EXPENSE" {
					oldDelta = oldTx.Amount
				}
				_ = h.walUpdater.UpdateBalance(c.Context(), oldWalUUID, oldDelta)
			}
		}
		// Apply new wallet balance
		if req.WalletID != "" {
			newWalUUID, _ := stringToUUID(req.WalletID)
			if newWalUUID.Valid {
				newDelta := req.Amount
				if req.TransactionType == "EXPENSE" {
					newDelta = -req.Amount
				}
				_ = h.walUpdater.UpdateBalance(c.Context(), newWalUUID, newDelta)
			}
		}
	}

	return c.JSON(resp)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	// Get transaction first to reverse wallet balance
	if h.walUpdater != nil {
		tx, getErr := h.service.GetByID(c.Context(), userID, txID)
		if getErr == nil && tx.WalletID != "" {
			walUUID, _ := stringToUUID(tx.WalletID)
			if walUUID.Valid {
				delta := -tx.Amount
				if tx.TransactionType == "EXPENSE" {
					delta = tx.Amount
				}
				_ = h.walUpdater.UpdateBalance(c.Context(), walUUID, delta)
			}
		}
	}

	if err := h.service.Delete(c.Context(), userID, txID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal hapus transaksi"})
	}

	return c.JSON(fiber.Map{"message": "transaksi berhasil dihapus"})
}

func (h *Handler) MonthlySummary(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)

	year, _ := strconv.Atoi(c.Query("year", strconv.Itoa(now.Year())))
	monthInt, _ := strconv.Atoi(c.Query("month", strconv.Itoa(int(now.Month()))))

	if monthInt < 1 || monthInt > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bulan harus 1-12"})
	}

	resp, err := h.service.GetMonthlySummary(c.Context(), userID, year, time.Month(monthInt))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil summary"})
	}

	return c.JSON(resp)
}

func (h *Handler) TodaySummary(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	resp, err := h.service.GetTodaySummary(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil today summary"})
	}

	return c.JSON(resp)
}

func (h *Handler) ExportCSV(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)

	year, _ := strconv.Atoi(c.Query("year", strconv.Itoa(now.Year())))
	monthInt, _ := strconv.Atoi(c.Query("month", strconv.Itoa(int(now.Month()))))

	if monthInt < 1 || monthInt > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bulan harus 1-12"})
	}

	start := time.Date(year, time.Month(monthInt), 1, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 1, 0)

	rows, err := h.service.queries.ListTransactionsForExport(c.Context(), ListTransactionsForExportParams{
		UserID:            userID,
		TransactionDate:   pgtype.Timestamptz{Time: start, Valid: true},
		TransactionDate_2: pgtype.Timestamptz{Time: end, Valid: true},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal export"})
	}

	filename := fmt.Sprintf("gascatet_%d-%02d.csv", year, monthInt)
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Response().BodyWriter())
	_ = w.Write([]string{"Tanggal", "Tipe", "Kategori", "Deskripsi", "Dompet", "Nominal"})

	for _, r := range rows {
		desc := ""
		if r.Description.Valid {
			desc = r.Description.String
		}
		tipe := "Pemasukan"
		amount := r.Amount
		if r.TransactionType == "EXPENSE" {
			tipe = "Pengeluaran"
			amount = -amount
		}
		_ = w.Write([]string{
			sanitizeCSV(r.TransactionDate.Time.Format("2006-01-02")),
			sanitizeCSV(tipe),
			sanitizeCSV(r.Category),
			sanitizeCSV(desc),
			sanitizeCSV(r.WalletName),
			strconv.FormatInt(amount, 10),
		})
	}

	w.Flush()
	return nil
}

func (h *Handler) UploadReceipt(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	// Verify transaction belongs to user
	_, err = h.service.GetByID(c.Context(), userID, txID)
	if err != nil {
		if err == ErrTransactionNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "transaksi tidak ditemukan"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal verifikasi transaksi"})
	}

	file, err := c.FormFile("receipt")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file receipt wajib diupload"})
	}

	// Max 5MB
	if file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ukuran file maksimal 5MB"})
	}

	// Validate file type by extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowedExts[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format file harus JPG, PNG, atau WebP"})
	}

	// Validate content-type header
	contentType := file.Header.Get("Content-Type")
	allowedMIME := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}
	if !allowedMIME[contentType] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tipe file tidak diizinkan"})
	}

	// Create uploads directory
	uploadDir := "./uploads/receipts"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal buat direktori upload"})
	}

	// Generate unique filename (prevent path traversal via original filename)
	filename := uuid.New().String() + ext
	savePath := filepath.Join(uploadDir, filename)

	// Verify resolved path is within upload directory
	absUploadDir, _ := filepath.Abs(uploadDir)
	absSavePath, _ := filepath.Abs(savePath)
	if !strings.HasPrefix(absSavePath, absUploadDir) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path tidak valid"})
	}

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal simpan file"})
	}

	// Save URL to database
	receiptURL := "/uploads/receipts/" + filename
	if err := h.service.UpdateReceiptURL(c.Context(), userID, txID, receiptURL); err != nil {
		// Clean up file on DB error
		os.Remove(savePath)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal simpan url receipt"})
	}

	return c.JSON(fiber.Map{
		"message":     "receipt berhasil diupload",
		"receipt_url": receiptURL,
	})
}

func (h *Handler) DeleteReceipt(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	txID, err := stringToUUID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID transaksi tidak valid"})
	}

	tx, err := h.service.GetByID(c.Context(), userID, txID)
	if err != nil {
		if err == ErrTransactionNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "transaksi tidak ditemukan"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ambil transaksi"})
	}

	// Delete file from disk (verify path is within uploads directory)
	if tx.ReceiptURL != "" {
		cleanPath := filepath.Clean("." + tx.ReceiptURL)
		absPath, _ := filepath.Abs(cleanPath)
		absUploadDir, _ := filepath.Abs("./uploads/receipts")
		if strings.HasPrefix(absPath, absUploadDir) {
			os.Remove(cleanPath)
		}
	}

	// Clear in database
	if err := h.service.UpdateReceiptURL(c.Context(), userID, txID, ""); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal hapus receipt"})
	}

	return c.JSON(fiber.Map{"message": "receipt berhasil dihapus"})
}
