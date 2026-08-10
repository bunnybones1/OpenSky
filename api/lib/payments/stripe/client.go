package stripe

import (
	"context"
	"fmt"
	"net/http"

	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/client"

	"github.com/horizon-games/OpenSky/api/config"
)

type Client struct {
	cfg      config.OpenSkyStripeConfig
	client   *client.API
	priceIDs map[string]string
}

func NewClient(cfg config.OpenSkyStripeConfig, httpClient *http.Client) *Client {
	return &Client{
		cfg:      cfg,
		client:   client.New(cfg.APIKey, stripe.NewBackends(httpClient)),
		priceIDs: map[string]string{},
	}
}

func (c *Client) CreateIntent(_ context.Context, productID string, amount uint64) (*stripe.CheckoutSession, error) {
	if !c.cfg.Enabled {
		return nil, fmt.Errorf("Stripe payments are disabled")
	}

	if len(productID) == 0 {
		return nil, fmt.Errorf("product ID cannot be empty")
	}

	if amount == 0 {
		return nil, fmt.Errorf("amount cannot be zero")
	}

	priceID, err := c.getPriceID(productID)
	if err != nil {
		return nil, fmt.Errorf("get price ID: %w", err)
	}

	params := &stripe.CheckoutSessionParams{
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(int64(amount)),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(c.cfg.SuccessURL),
		CancelURL:  stripe.String(c.cfg.CancelURL),
	}

	s, err := c.client.CheckoutSessions.New(params)
	if err != nil {
		return nil, fmt.Errorf("initiate session: %w", err)
	}

	return s, nil
}

func (c *Client) getPriceID(productID string) (string, error) {
	if priceID, ok := c.priceIDs[productID]; ok {
		return priceID, nil
	}

	list := c.client.Products.List(&stripe.ProductListParams{
		Active: stripe.Bool(true),
	})
	if list.Err() != nil {
		return "", fmt.Errorf("list products: %w", list.Err())
	}

	for _, stripeProduct := range list.ProductList().Data {
		if stripeProduct.DefaultPrice == nil {
			continue
		}
		c.priceIDs[stripeProduct.Name] = stripeProduct.DefaultPrice.ID
	}

	if priceID, ok := c.priceIDs[productID]; ok {
		return priceID, nil
	}

	return "", fmt.Errorf("price not found: %s", productID)
}

func (c *Client) GetEvent(_ context.Context, eventID string) (*stripe.Event, error) {
	if len(eventID) == 0 {
		return nil, fmt.Errorf("event ID cannot be empty")
	}

	event, err := c.client.Events.Get(eventID, nil)
	if err != nil {
		return nil, fmt.Errorf("get event: %w", err)
	}

	return event, nil
}
