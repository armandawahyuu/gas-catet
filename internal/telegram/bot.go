package telegram

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type BotClient struct {
	token   string
	baseURL string
	client  *http.Client
}

func NewBotClient(token string) *BotClient {
	return &BotClient{
		token:   token,
		baseURL: fmt.Sprintf("https://api.telegram.org/bot%s", token),
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

func (b *BotClient) SendMessage(req SendMessageRequest) error {
	return b.callAPI("sendMessage", req)
}

func (b *BotClient) AnswerCallbackQuery(req AnswerCallbackQueryRequest) error {
	return b.callAPI("answerCallbackQuery", req)
}

// GetFileURL returns the download URL for a Telegram file by file_id.
func (b *BotClient) GetFileURL(fileID string) (string, error) {
	payload := map[string]string{"file_id": fileID}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal error: %w", err)
	}

	resp, err := b.client.Post(
		fmt.Sprintf("%s/getFile", b.baseURL),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		OK     bool `json:"ok"`
		Result struct {
			FilePath string `json:"file_path"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if !result.OK || result.Result.FilePath == "" {
		return "", fmt.Errorf("getFile failed")
	}

	return fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", b.token, result.Result.FilePath), nil
}

// DownloadFile downloads a file from a Telegram API URL and returns the bytes.
func (b *BotClient) DownloadFile(url string) ([]byte, error) {
	// Only allow downloads from Telegram's file API to prevent SSRF
	allowedPrefix := fmt.Sprintf("https://api.telegram.org/file/bot%s/", b.token)
	if !strings.HasPrefix(url, allowedPrefix) {
		return nil, fmt.Errorf("invalid file URL: must be from Telegram API")
	}

	resp, err := b.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func (b *BotClient) callAPI(method string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("gagal marshal payload: %w", err)
	}

	resp, err := b.client.Post(
		fmt.Sprintf("%s/%s", b.baseURL, method),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("gagal kirim request ke Telegram: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API error: status %d", resp.StatusCode)
	}

	return nil
}
