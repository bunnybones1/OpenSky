package samsunggalaxystore

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/horizon-games/OpenSky/api/config"
)

const verifyURL = "http://iap.samsungapps.com/iap/v6/receipt?purchaseID=%s"

type Client struct {
	cfg        config.OpenSkyMobileIAPConfig
	httpClient *http.Client
}

func NewClient(cfg config.OpenSkyMobileIAPConfig, httpClient *http.Client) *Client {
	if !cfg.Enabled {
		return nil
	}

	return &Client{
		cfg:        cfg,
		httpClient: httpClient,
	}
}

// Verify sends a request to the Samsung Galaxy Store to get purchase data.
// https://developer.samsung.com/iap/programming-guide/samsung-iap-server-api.html#Verify-a-purchase
func (c *Client) Verify(ctx context.Context, purchaseID string) (*Response, error) {
	response, err := c.sendRequest(ctx, fmt.Sprintf(verifyURL, purchaseID))
	if err != nil {
		return nil, fmt.Errorf("send request with purchase ID %q: %w", purchaseID, err)
	}

	return response, nil
}

func (c *Client) sendRequest(ctx context.Context, targetURL string) (*Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("instantiate request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result *Response

	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return nil, fmt.Errorf("decode response body: %w", err)
	}

	return result, nil
}
