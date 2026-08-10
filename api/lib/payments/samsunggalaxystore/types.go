package samsunggalaxystore

// Response represents response data.
// https://developer.samsung.com/iap/programming-guide/samsung-iap-server-api.html#Verify-a-purchase
type Response struct {
	ItemID             string         `json:"itemId"`
	PaymentID          string         `json:"paymentId"`
	OrderID            string         `json:"orderId"`
	PackageName        string         `json:"packageName"`
	ItemName           string         `json:"itemName"`
	ItemDesc           string         `json:"itemDesc"`
	PurchaseDate       string         `json:"purchaseDate"`
	PaymentAmount      string         `json:"paymentAmount"`
	Status             ResponseStatus `json:"status"`
	PaymentMethod      string         `json:"paymentMethod"`
	Mode               string         `json:"mode"`
	ConsumeYN          string         `json:"consumeYN"`
	ConsumeDate        string         `json:"consumeDate"`
	ConsumeDeviceModel string         `json:"consumeDeviceModel"`
	PassThroughParam   string         `json:"passThroughParam"`
	CurrencyCode       string         `json:"currencyCode"`
	CurrencyUnit       string         `json:"currencyUnit"`
}

type ResponseStatus string

const (
	ResponseStatusSuccess ResponseStatus = "success"
	ResponseStatusFail    ResponseStatus = "fail"
	ResponseStatusCancel  ResponseStatus = "cancel"
)
