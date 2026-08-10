package appleappstore

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/horizon-games/OpenSky/api/config"
)

const (
	sandboxURL    = "https://sandbox.itunes.apple.com/verifyReceipt"
	productionURL = "https://buy.itunes.apple.com/verifyReceipt"
	contentType   = "application/json; charset=utf-8"

	// Official docs: https://developer.apple.com/documentation/appstorereceipts/status
	receiptStatusReceiptIsFromTestEnvButSentToProdEnv = 21007
)

// Client talks to Apple App Store API.
type Client struct {
	cfg           config.OpenSkyMobileIAPConfig
	productionURL string
	sandboxURL    string
	httpClient    *http.Client
}

var ErrAppleAppStoreServer = errors.New("Apple App Store server error")

// NewClient instantiates a new Client.
func NewClient(cfg config.OpenSkyMobileIAPConfig, httpClient *http.Client) *Client {
	if !cfg.Enabled {
		return nil
	}

	return &Client{
		cfg:           cfg,
		productionURL: productionURL,
		sandboxURL:    sandboxURL,
		httpClient:    httpClient,
	}
}

func (c *Client) WithProductionURL(url string) *Client {
	c.productionURL = url

	return c
}

func (c *Client) WithSandboxURL(url string) *Client {
	c.sandboxURL = url

	return c
}

func (c *Client) Verify(ctx context.Context, receiptData string) (*Response, error) {
	reqBody := Request{
		ReceiptData: receiptData,
	}

	resp, err := c.sendRequest(ctx, reqBody, c.productionURL)
	if err != nil {
		return nil, fmt.Errorf("send request to production: %w", err)
	}

	if resp.Status == receiptStatusReceiptIsFromTestEnvButSentToProdEnv {
		resp, err = c.sendRequest(ctx, reqBody, c.sandboxURL)
		if err != nil {
			return nil, fmt.Errorf("send request to sandbox: %w", err)
		}
	}

	return resp, nil
}

func (c *Client) sendRequest(ctx context.Context, reqBody Request, targetURL string) (*Response, error) {
	b := new(bytes.Buffer)
	if err := json.NewEncoder(b).Encode(reqBody); err != nil {
		return nil, fmt.Errorf("encode request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, b)
	if err != nil {
		return nil, fmt.Errorf("instantiate request: %w", err)
	}

	req.Header.Set("Content-Type", contentType)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode >= 400 && resp.StatusCode < 500 {
		return nil, fmt.Errorf("bad Request %d from the App Store: %w", resp.StatusCode, ErrAppleAppStoreServer)
	}

	if resp.StatusCode >= 500 {
		return nil, fmt.Errorf("received http status code %d from the Apple App Store: %w", resp.StatusCode, ErrAppleAppStoreServer)
	}

	var result *Response

	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return nil, fmt.Errorf("decode response body: %w", err)
	}

	return result, nil
}
