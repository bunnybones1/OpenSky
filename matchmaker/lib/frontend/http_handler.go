package frontend

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type HTTPHandler struct {
	logger                zerolog.Logger
	ipAddressRetriever    IPAddressRetriever
	websocketUpgrader     WebsocketUpgrader
	websocketHandler      WebsocketHandler
	statusService         matchmaker.StatusService
	redisClient           *redis.Client
	accountGetter         AccountGetter
	httpErrorHandler      HTTPErrorHandler
	matchInProgressGetter MatchInProgressGetter
	recentMatchGetter     RecentMatchGetter
}

func NewHTTPHandler(
	logger zerolog.Logger,
	ipAddressRetriever IPAddressRetriever,
	websocketUpgrader WebsocketUpgrader,
	websocketHandler WebsocketHandler,
	statusService matchmaker.StatusService,
	redisClient *redis.Client,
	accountGetter AccountGetter,
	httpErrorHandler HTTPErrorHandler,
	matchInProgressGetter MatchInProgressGetter,
	recentMatchGetter RecentMatchGetter,
) *HTTPHandler {
	handler := &HTTPHandler{
		logger:                logger.With().Str("fn", "frontend.HTTPHandler").Logger(),
		ipAddressRetriever:    ipAddressRetriever,
		websocketUpgrader:     websocketUpgrader,
		websocketHandler:      websocketHandler,
		statusService:         statusService,
		redisClient:           redisClient,
		accountGetter:         accountGetter,
		httpErrorHandler:      httpErrorHandler,
		matchInProgressGetter: matchInProgressGetter,
		recentMatchGetter:     recentMatchGetter,
	}

	return handler
}

func (h *HTTPHandler) MatchMakerHandle(w http.ResponseWriter, r *http.Request) {
	ipAddress, err := h.ipAddressRetriever.Retrieve(r)
	if err != nil {
		h.logger.Err(err).Msg("unable to determine IP address")

		w.WriteHeader(400)

		if _, err := w.Write([]byte{}); err != nil {
			h.logger.Err(err).Msg("write to body in getting IP address error")
		}

		return
	}

	wsConn, err := h.websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Warn().Err(err).Msg("failed to upgrade connection")

		w.WriteHeader(400)

		if _, err := w.Write([]byte{}); err != nil {
			h.logger.Err(err).Msg("write to body in upgrading websocket error")
		}

		return
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	if err := h.websocketHandler.Handle(ctx, wsConn, ipAddress); err != nil {
		h.logger.Err(err).Msg("handle frontend")
		return
	}
}

func (h *HTTPHandler) StatusHandle(w http.ResponseWriter, r *http.Request) {
	mmStatus, err := h.statusService.Status()
	if err != nil {
		h.logger.Err(err).Msg("could not provide status")
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	status := serverStatus{}

	status.Status = mmStatus

	if h.redisClient != nil {
		rpStats := h.redisClient.PoolStats()

		status.RedisPool.Hits = rpStats.Hits
		status.RedisPool.Misses = rpStats.Misses
		status.RedisPool.Timeouts = rpStats.Timeouts

		status.RedisPool.TotalConns = rpStats.TotalConns
		status.RedisPool.IdleConns = rpStats.IdleConns
		status.RedisPool.StaleConns = rpStats.StaleConns
	}

	render.JSON(w, r, status)
}

func (h *HTTPHandler) MatchInfoHandle(w http.ResponseWriter, r *http.Request) {
	playerID := chi.URLParam(r, "playerID")

	account, err := h.accountGetter(r.Context())
	if err != nil || account == "" {
		if err := h.httpErrorHandler(w, mmerrors.ErrUnauthorized); err != nil {
			h.logger.Err(err).Msg("handle account auth error")
		}

		return
	}

	address := proto.HashFromString(playerID)

	logger := h.logger.With().
		Str("playerID", playerID).
		Logger()

	inProgressMatchInfo, err := h.matchInProgressGetter.GetMatch(address)
	if err != nil {
		logger.Err(err).Msg("get match in progress")
	}

	if inProgressMatchInfo != nil {
		logger.Debug().Str("status", "MATCH_IN_PROGRESS").Msg("found match in progress")
		render.JSON(w, r, inProgressMatchInfo)
		return
	}

	recentMatchInfo, err := h.recentMatchGetter.GetMatch(address)
	if err != nil {
		logger.Err(err).Msg("check recent match")
	}

	if recentMatchInfo != nil {
		logger.Debug().Str("status", "RECENT_MATCH_INFO").Msg("found recent match info")
		render.JSON(w, r, recentMatchInfo)
		return
	}

	logger.Debug().Str("status", "MATCH_NOT_FOUND").Msg("no match in progress")

	noMatch := messages.NoMatchFoundMessage()
	render.JSON(w, r, noMatch)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/websocket_upgrader.go -package mock . WebsocketUpgrader
type WebsocketUpgrader interface {
	Upgrade(http.ResponseWriter, *http.Request, http.Header) (*websocket.Conn, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/websocket_handler.go -package mock . WebsocketHandler
type WebsocketHandler interface {
	Handle(ctx context.Context, wsConn *websocket.Conn, ipAddress string) error
}

type AccountGetter func(context.Context) (string, error)

type HTTPErrorHandler func(w http.ResponseWriter, rpcErr proto.Error) error

type MatchInProgressGetter interface {
	GetMatch(proto.Hash) (*messages.InProgressMatchInfo, error)
}

type RecentMatchGetter interface {
	GetMatch(proto.Hash) (*messages.RecentMatchInfo, error)
}

type serverStatus struct {
	*matchmaker.Status
	RedisPool struct {
		Hits     uint32 `json:"hits"`
		Misses   uint32 `json:"misses"`
		Timeouts uint32 `json:"timeouts"`

		TotalConns uint32 `json:"total_conns"`
		IdleConns  uint32 `json:"idle_conns"`
		StaleConns uint32 `json:"stale_conns"`
	} `json:"redis_pool"`
}
