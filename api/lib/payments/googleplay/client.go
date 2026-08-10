package googleplay

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/androidpublisher/v3"
	"google.golang.org/api/option"

	"github.com/horizon-games/OpenSky/api/config"
)

// Client talks to Google Play API.
type Client struct {
	cfg        config.OpenSkyMobileIAPConfig
	httpClient *http.Client
	service    *androidpublisher.Service
}

// NewClient instantiates new Client.
func NewClient(cfg config.OpenSkyMobileIAPConfig, httpClient *http.Client) (*Client, error) {
	if !cfg.Enabled {
		return nil, nil
	}

	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	client := &Client{
		cfg:        cfg,
		httpClient: httpClient,
	}

	if err := client.setService(); err != nil {
		return nil, fmt.Errorf("get service: %w", err)
	}

	return client, nil
}

// Verify verifies product status https://developer.android.com/reference/com/android/billingclient/api/Purchase.PurchasesResult
func (c *Client) Verify(ctx context.Context, packageName string, productID string, token string) (*androidpublisher.ProductPurchase, error) {
	ps := androidpublisher.NewPurchasesProductsService(c.service)

	resp, err := ps.Get(packageName, productID, token).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("get purchase product: %w", err)
	}

	if resp.PurchaseState == 0 {
		return resp, nil
	}

	localCtx, cancelFn := context.WithTimeout(ctx, c.cfg.GoogleRetryPeriod)
	defer cancelFn()

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-localCtx.Done():
			return resp, nil
		case <-ticker.C:
			resp, err = ps.Get(packageName, productID, token).Context(ctx).Do()
			if err != nil {
				return nil, fmt.Errorf("get purchase product: %w", err)
			}

			if resp.PurchaseState == 0 {
				return resp, nil
			}
		}
	}
}

func (c *Client) setService() error {
	ctx := context.WithValue(context.Background(), oauth2.HTTPClient, c.httpClient)

	jsonKey := []byte(c.cfg.GoogleKeyData)

	conf, err := google.JWTConfigFromJSON(jsonKey, androidpublisher.AndroidpublisherScope)
	if err != nil {
		return fmt.Errorf("configure JWT from JSON: %w", err)
	}

	val := conf.Client(ctx).Transport.(*oauth2.Transport)

	_, err = val.Source.Token()
	if err != nil {
		return err
	}

	c.service, err = androidpublisher.NewService(ctx, option.WithHTTPClient(conf.Client(ctx)))
	if err != nil {
		return fmt.Errorf("instantiate new Android publisher service: %w", err)
	}

	return nil
}
