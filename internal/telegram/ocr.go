package telegram

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// OCRService handles receipt scanning via Gemini Vision API.
type OCRService struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// ReceiptData holds the extracted data from a receipt photo.
type ReceiptData struct {
	StoreName   string `json:"store_name"`
	Total       int64  `json:"total"`
	Date        string `json:"date"` // YYYY-MM-DD
	Description string `json:"description"`
	Category    string `json:"category"`
}

func NewOCRService(apiKey, baseURL, model string) *OCRService {
	return &OCRService{
		apiKey:  apiKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

// ExtractReceipt sends an image to Gemini Vision API and extracts receipt data.
func (o *OCRService) ExtractReceipt(imageData []byte) (*ReceiptData, error) {
	b64 := base64.StdEncoding.EncodeToString(imageData)

	payload := map[string]interface{}{
		"model": o.model,
		"messages": []map[string]interface{}{
			{
				"role": "user",
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": `Kamu adalah AI yang membaca struk belanja/transaksi dari foto.
Ekstrak informasi berikut dari foto struk ini dan REPLY HANYA dalam format JSON tanpa markdown:
{
  "store_name": "nama toko/merchant",
  "total": 25000,
  "date": "2026-03-08",
  "description": "deskripsi singkat belanja (max 5 kata)",
  "category": "pilih salah satu: Makan, Transport, Belanja, Hiburan, Kesehatan, Pendidikan, Tagihan, Lainnya"
}

Aturan:
- "total" harus angka bulat dalam Rupiah (tanpa titik/koma), ambil GRAND TOTAL / TOTAL yang dibayar
- "date" format YYYY-MM-DD, kalau tidak jelas pakai tanggal hari ini: ` + time.Now().Format("2006-01-02") + `
- "description" singkat saja, contoh: "Belanja Indomaret" atau "Makan KFC"
- Jika bukan foto struk/bukti transaksi, return: {"error": "bukan struk"}`,
					},
					{
						"type": "image_url",
						"image_url": map[string]string{
							"url": "data:image/jpeg;base64," + b64,
						},
					},
				},
			},
		},
		"max_tokens": 300,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal error: %w", err)
	}

	req, err := http.NewRequest("POST", o.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("request error: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.apiKey)

	resp, err := o.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errBody)
		return nil, fmt.Errorf("API status %d: %v", resp.StatusCode, errBody)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode error: %w", err)
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no response from AI")
	}

	content := result.Choices[0].Message.Content
	content = cleanJSON(content)

	// Check for error response
	var errCheck map[string]interface{}
	if json.Unmarshal([]byte(content), &errCheck) == nil {
		if _, hasErr := errCheck["error"]; hasErr {
			return nil, fmt.Errorf("bukan struk")
		}
	}

	var data ReceiptData
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return nil, fmt.Errorf("parse error: %w — raw: %s", err, content)
	}

	// Validate
	if data.Total <= 0 {
		return nil, fmt.Errorf("total tidak valid")
	}

	// Default date to today if empty or invalid
	if data.Date == "" {
		data.Date = time.Now().Format("2006-01-02")
	}
	if _, err := time.Parse("2006-01-02", data.Date); err != nil {
		data.Date = time.Now().Format("2006-01-02")
	}

	if data.Description == "" {
		data.Description = data.StoreName
	}
	if data.Category == "" {
		data.Category = "Lainnya"
	}

	return &data, nil
}

// cleanJSON extracts JSON from potential markdown code blocks.
func cleanJSON(s string) string {
	s = strings.TrimSpace(s)
	// Remove ```json ... ``` wrapper
	re := regexp.MustCompile("(?s)```(?:json)?\\s*(\\{.*?\\})\\s*```")
	if m := re.FindStringSubmatch(s); len(m) > 1 {
		return m[1]
	}
	// Try to find JSON object directly
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start >= 0 && end > start {
		return s[start : end+1]
	}
	return s
}

// formatReceiptConfirmation creates the confirmation message for a scanned receipt.
func formatReceiptConfirmation(data *ReceiptData) string {
	return fmt.Sprintf("📸 *Struk Terdeteksi!*\n\n"+
		"🏪 %s\n"+
		"💰 %s\n"+
		"📅 %s\n"+
		"📝 %s\n"+
		"🏷️ %s\n\n"+
		"_Cek dulu ya bos, bener gak?_",
		data.StoreName,
		formatRupiahOCR(data.Total),
		data.Date,
		data.Description,
		data.Category,
	)
}

func formatRupiahOCR(amount int64) string {
	s := strconv.FormatInt(amount, 10)
	n := len(s)
	if n <= 3 {
		return "Rp" + s
	}
	var result strings.Builder
	result.WriteString("Rp")
	remainder := n % 3
	if remainder > 0 {
		result.WriteString(s[:remainder])
		if remainder < n {
			result.WriteByte('.')
		}
	}
	for i := remainder; i < n; i += 3 {
		result.WriteString(s[i : i+3])
		if i+3 < n {
			result.WriteByte('.')
		}
	}
	return result.String()
}

// GenerateRoast calls Gemini to roast user's spending habits.
func (o *OCRService) GenerateRoast(prompt string) (string, error) {
	payload := map[string]interface{}{
		"model": o.model,
		"messages": []map[string]interface{}{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"max_tokens": 500,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal error: %w", err)
	}

	req, err := http.NewRequest("POST", o.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("request error: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.apiKey)

	resp, err := o.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API status %d", resp.StatusCode)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode error: %w", err)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}
