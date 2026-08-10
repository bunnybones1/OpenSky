package discord

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/horizon-games/OpenSky/api/rpc"
)

const OpenSkyDiscordServerID = "444586810765475860"

// HTTPClient sends HTTP requests.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/http_client.go -package mock . HTTPClient
type HTTPClient interface {
	Do(*http.Request) (*http.Response, error)
}

// Client provides data from Discord.
type Client struct {
	httpClient HTTPClient

	infoURL string
}

// NewClient instantiates a new instance of Client.
func NewClient(httpClient HTTPClient, infoURL string) *Client {
	return &Client{
		httpClient: httpClient,
		infoURL:    infoURL,
	}
}

func (c *Client) GetServerInfo(ctx context.Context) (*rpc.DiscordAPIResponse, error) {
	apiResponse := &rpc.DiscordAPIResponse{}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s%s/widget.json", c.infoURL, OpenSkyDiscordServerID), nil)
	if err != nil {
		return nil, fmt.Errorf("create new request: %w", err)
	}

	rawResponse, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do: %w", err)
	}
	defer rawResponse.Body.Close()

	err = json.NewDecoder(rawResponse.Body).Decode(apiResponse)
	if err != nil {
		return nil, fmt.Errorf("decode body: %w", err)
	}

	return apiResponse, nil
}
