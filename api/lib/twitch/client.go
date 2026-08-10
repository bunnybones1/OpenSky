package twitch

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/horizon-games/OpenSky/api/rpc"
)

const (
	urlGetStreams  = "https://api.twitch.tv/helix/streams"
	urlGetVideos   = "https://api.twitch.tv/helix/videos"
	urlAccessToken = "https://twitch-access-token.skyweaver.net"
)

// HTTPClient sends HTTP requests.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/http_client.go -package mock . HTTPClient
type HTTPClient interface {
	Do(*http.Request) (*http.Response, error)
}

// Client provides data from Twitch.
type Client struct {
	httpClient HTTPClient

	clientID string
}

// NewClient instantiates a new instance of Client.
func NewClient(httpClient HTTPClient, clientID string) *Client {
	return &Client{
		httpClient: httpClient,
		clientID:   clientID,
	}
}

func (c *Client) GetStreams(ctx context.Context, first, gameID string) (*rpc.TwitchAPIResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlGetStreams, nil)
	if err != nil {
		return nil, fmt.Errorf("create new request: %w", err)
	}

	urlQuery := req.URL.Query()
	urlQuery.Set("first", first)
	urlQuery.Set("game_id", gameID)
	req.URL.RawQuery = urlQuery.Encode()

	return c.doAndParseResponse(ctx, req)
}

func (c *Client) GetVideos(ctx context.Context, gameID string) (*rpc.TwitchAPIResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlGetVideos, nil)
	if err != nil {
		return nil, fmt.Errorf("create new request: %w", err)
	}

	urlQuery := req.URL.Query()
	urlQuery.Set("game_id", gameID)
	req.URL.RawQuery = urlQuery.Encode()

	return c.doAndParseResponse(ctx, req)
}

func (c *Client) setAuthorization(ctx context.Context, req *http.Request) error {
	token, err := c.getTwitchToken(ctx)
	if err != nil {
		return fmt.Errorf("get twitch token: %w", err)
	}

	req.Header.Add("Client-ID", c.clientID)
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", token))

	return nil
}

func (c *Client) getTwitchToken(ctx context.Context) (string, error) {
	token := &twitchToken{}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, urlAccessToken, nil)
	if err != nil {
		return "", fmt.Errorf("create new request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("do: %w", err)
	}
	defer resp.Body.Close()

	err = json.NewDecoder(resp.Body).Decode(token)
	if err != nil {
		return "", fmt.Errorf("json decode body: %w", err)
	}

	return token.AccessToken, nil
}

func (c *Client) doAndParseResponse(ctx context.Context, req *http.Request) (*rpc.TwitchAPIResponse, error) {
	var apiResponse rpc.TwitchAPIResponse

	err := c.setAuthorization(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("set authorization: %w", err)
	}

	rawResponse, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do: %w", err)
	}
	defer rawResponse.Body.Close()

	err = json.NewDecoder(rawResponse.Body).Decode(&apiResponse)
	if err != nil {
		return nil, fmt.Errorf("json decode body: %w", err)
	}

	return &apiResponse, nil
}

type twitchToken struct {
	AccessToken string `json:"access_token"`
}
