package telegram

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
		client:  &http.Client{},
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
	resp, err := b.client.Post(
		fmt.Sprintf("%s/getFile", b.baseURL),
		"application/json",
		bytes.NewReader([]byte(fmt.Sprintf(`{"file_id":"%s"}`, fileID))),
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

// DownloadFile downloads a file from a URL and returns the bytes.
func (b *BotClient) DownloadFile(url string) ([]byte, error) {
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
