package customgameservers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"

	"github.com/google/uuid"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type Client struct {
	httpClient *http.Client

	authToken string
}

func NewClient(cfg config.GameServerConfig, httpClient *http.Client) *Client {
	return &Client{
		httpClient: httpClient,
		authToken:  cfg.AuthToken,
	}
}

func (c *Client) HealthCheck(ctx context.Context, gameServer *gameservers.GameServerInfo) (bool, error) {
	uri, err := url.Parse(gameServer.InternalHTTP)
	if err != nil {
		return false, err
	}

	uri.Path = "ping"
	uri.RawQuery = "release=" + gameServer.ReleaseVersion

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, uri.String(), nil)
	if err != nil {
		return false, fmt.Errorf("create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return true, nil
	}

	return false, nil
}

func (c *Client) InitiateMatch(
	ctx context.Context,
	matchID uint64,
	replayID string,
	p1 *player.Player, p2 *player.Player,
	gameServer *gameservers.GameServerInfo,
	season uint16,
) (bool, error) {
	if p1 == nil {
		return false, fmt.Errorf("player 1 cannot be nil")
	}

	if p2 == nil {
		return false, fmt.Errorf("player 2 cannot be nil")
	}

	if len(p1.PrivateSeed.Cards) < 1 {
		p1.PrivateSeed.Cards = []uint64{}
	}

	if len(p2.PrivateSeed.Cards) < 1 {
		p2.PrivateSeed.Cards = []uint64{}
	}

	var isBot bool

	if p1.IsBotMatch() || p2.IsBotMatch() {
		isBot = true
	}

	uri, err := url.Parse(gameServer.InternalHTTP)
	if err != nil {
		return false, fmt.Errorf("parse internal HTTP: %w", err)
	}

	uri.Path = "createMatch"
	uri.RawQuery = "release=" + gameServer.ReleaseVersion

	matchStartMessage := gameServerStartMatchMessage{
		Type:     "start_match",
		MatchID:  matchID,
		ReplayID: replayID,
		Player1:  c.playerMatchContext(p1),
		Player2:  c.playerMatchContext(p2),
		MatchSettings: matchSettings{
			TurnTimer:       !isBot,
			MatchmakingCode: p1.SessionID,
			BotDifficulty:   math.Max(p1.BotDifficulty, p2.BotDifficulty),
			Season:          season,
		},
	}

	payload, err := json.Marshal(matchStartMessage)
	if err != nil {
		return false, fmt.Errorf("encode match start message: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uri.String(), bytes.NewReader(payload))
	if err != nil {
		return false, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("BEARER %s", c.authToken))
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("do: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusOK {
		return true, nil
	}

	errMessage := struct {
		Error string `json:"error"`
	}{}
	if err := json.NewDecoder(res.Body).Decode(&errMessage); err != nil {
		return false, fmt.Errorf("decode error message: %w", err)
	}

	if errMessage.Error == "" {
		errMessage.Error = http.StatusText(res.StatusCode)
	}

	return false, fmt.Errorf("start match on game server: %q", errMessage.Error)
}

func (c *Client) playerMatchContext(p *player.Player) gameServerPlayerInfo {
	min := int32(1000000)
	n := min + rand.Int31n(math.MaxInt32-min)
	spectateCode := strconv.FormatInt(int64(n), 10)

	info := gameServerPlayerInfo{
		PrivateSeed:     p.PrivateSeed,
		GameMode:        p.Mode,
		Account:         p.Account,
		ConquestInfo:    p.ConquestInfo,
		PlayerSessionID: p.PlayerSessionID,
		BotSubkey:       p.BotSubkey,
		SpectateCode:    spectateCode,
		Quests:          p.Quests,
	}

	return info
}

type gameServerStartMatchMessage struct {
	Type          string               `json:"type"`
	MatchID       uint64               `json:"matchID"`
	ReplayID      string               `json:"replayID"`
	Player1       gameServerPlayerInfo `json:"player1"`
	Player2       gameServerPlayerInfo `json:"player2"`
	MatchSettings matchSettings        `json:"matchSettings"`
}

type gameServerPlayerInfo struct {
	PrivateSeed     player.PrivateSeed       `json:"privateSeed"`
	GameMode        proto.GameMode           `json:"gameMode"`
	Account         *player.AccountWithItems `json:"account"`
	ConquestInfo    *proto.Conquest          `json:"conquestInfo,omitempty"`
	PlayerSessionID uuid.UUID                `json:"playerSessionID"`
	BotSubkey       *proto.Hash              `json:"botSubkey,omitempty"`
	SpectateCode    string                   `json:"spectateCode"`
	Quests          []*proto.Quest           `json:"quests"`
}

type matchSettings struct {
	BotDifficulty   float64 `json:"botDifficulty"`
	TurnTimer       bool    `json:"turnTimer"`
	MatchmakingCode string  `json:"matchmakingCode"`
	Season          uint16  `json:"season"`
}
