package tripay

// APIResp is the generic Tripay API response wrapper
type APIResp[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

// CreateTransactionRequest for creating a closed transaction
type CreateTransactionRequest struct {
	Method        string
	MerchantRef   string
	Amount        int
	CustomerName  string
	CustomerEmail string
	ItemName      string
	CallbackURL   string
	ReturnURL     string
	ExpiredTime   int64 // Unix timestamp
}

// TripayTransaction response from Tripay create transaction
type TripayTransaction struct {
	Reference      string `json:"reference"`
	MerchantRef    string `json:"merchant_ref"`
	PaymentName    string `json:"payment_name"`
	Amount         int    `json:"amount"`
	FeeMerchant    int    `json:"fee_merchant"`
	FeeCustomer    int    `json:"fee_customer"`
	TotalFee       int    `json:"total_fee"`
	AmountReceived int    `json:"amount_received"`
	PayCode        string `json:"pay_code"`
	PayURL         string `json:"pay_url"`
	CheckoutURL    string `json:"checkout_url"`
	Status         string `json:"status"`
	ExpiredTime    int64  `json:"expired_time"`
}

// PaymentChannelInfo from Tripay
type PaymentChannelInfo struct {
	Group       string `json:"group"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	FeeMerchant struct {
		Flat    int     `json:"flat"`
		Percent float64 `json:"percent"`
	} `json:"fee_merchant"`
	FeeCustomer struct {
		Flat    int     `json:"flat"`
		Percent float64 `json:"percent"`
	} `json:"fee_customer"`
	TotalFee struct {
		Flat    int     `json:"flat"`
		Percent float64 `json:"percent"`
	} `json:"total_fee"`
	IconURL string `json:"icon_url"`
	Active  bool   `json:"active"`
}

// CallbackPayload from Tripay webhook callback
type CallbackPayload struct {
	Reference         string  `json:"reference"`
	MerchantRef       string  `json:"merchant_ref"`
	PaymentMethod     string  `json:"payment_method"`
	PaymentMethodCode string  `json:"payment_method_code"`
	TotalAmount       int     `json:"total_amount"`
	FeeMerchant       int     `json:"fee_merchant"`
	FeeCustomer       int     `json:"fee_customer"`
	TotalFee          int     `json:"total_fee"`
	AmountReceived    int     `json:"amount_received"`
	IsClosedPayment   int     `json:"is_closed_payment"`
	Status            string  `json:"status"`
	PaidAt            *int64  `json:"paid_at"`
	Note              *string `json:"note"`
}
