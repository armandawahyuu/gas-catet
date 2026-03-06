package telegram

import (
	"bytes"
	"encoding/json"
	"fmt"
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
