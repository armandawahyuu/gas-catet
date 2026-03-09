package tripay

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	SandboxBaseURL    = "https://tripay.co.id/api-sandbox"
	ProductionBaseURL = "https://tripay.co.id/api"
)

type Client struct {
	apiKey       string
	privateKey   string
	merchantCode string
	baseURL      string
	httpClient   *http.Client
}

func NewClient(apiKey, privateKey, merchantCode string, sandbox bool) *Client {
	base := ProductionBaseURL
	if sandbox {
		base = SandboxBaseURL
	}
	return &Client{
		apiKey:       apiKey,
		privateKey:   privateKey,
		merchantCode: merchantCode,
		baseURL:      base,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

// CreateClosedTransaction creates a closed payment transaction in Tripay
func (c *Client) CreateClosedTransaction(req CreateTransactionRequest) (*TripayTransaction, error) {
	// Generate signature: HMAC-SHA256(merchantCode + merchantRef + amount)
	signData := fmt.Sprintf("%s%s%d", c.merchantCode, req.MerchantRef, req.Amount)
	mac := hmac.New(sha256.New, []byte(c.privateKey))
	mac.Write([]byte(signData))
	signature := hex.EncodeToString(mac.Sum(nil))

	payload := map[string]interface{}{
		"method":         req.Method,
		"merchant_ref":   req.MerchantRef,
		"amount":         req.Amount,
		"customer_name":  req.CustomerName,
		"customer_email": req.CustomerEmail,
		"order_items": []map[string]interface{}{
			{
				"name":     req.ItemName,
				"price":    req.Amount,
				"quantity": 1,
			},
		},
		"callback_url": req.CallbackURL,
		"return_url":   req.ReturnURL,
		"signature":    signature,
	}

	if req.ExpiredTime > 0 {
		payload["expired_time"] = req.ExpiredTime
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.baseURL+"/transaction/create", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var apiResp APIResp[TripayTransaction]
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("tripay error: %s", apiResp.Message)
	}

	return &apiResp.Data, nil
}

// GetPaymentChannels returns available payment channels
func (c *Client) GetPaymentChannels() ([]PaymentChannelInfo, error) {
	httpReq, err := http.NewRequest("GET", c.baseURL+"/merchant/payment-channel", nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp APIResp[[]PaymentChannelInfo]
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, err
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("tripay error: %s", apiResp.Message)
	}

	return apiResp.Data, nil
}

// VerifyCallbackSignature verifies the HMAC signature from Tripay callback
func (c *Client) VerifyCallbackSignature(signature string, body []byte) bool {
	mac := hmac.New(sha256.New, []byte(c.privateKey))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}
