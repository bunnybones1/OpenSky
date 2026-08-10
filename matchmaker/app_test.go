package matchmaker_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/mockservices"
)

func TestAppSuite(t *testing.T) {
	suite.Run(t, new(AppSuite))
}

type AppSuite struct {
	suite.Suite

	cancelFn    func()
	app         *matchmaker.App
	versionHash string
}

func (s *AppSuite) SetupSuite() {
	ctx, cancelFn := context.WithCancel(context.Background())
	s.cancelFn = cancelFn

	cfg := s.newConfig()

	app := s.newApp(ctx, cfg)

	s.app = app
	s.versionHash = cfg.VersionHash
}

func (s *AppSuite) TearDownSuite() {
	s.cancelFn()
}

func (s *AppSuite) TestPing() {
	client := s.newClient(s.app)
	defer client.Close()

	s.sendMessage(client, []byte("PING"))
}

func (s *AppSuite) TestDuplicatedFindMatchDifferentClient() {
	client1 := s.newClient(s.app)
	defer client1.Close()

	client2 := s.newClient(s.app)
	defer client2.Close()

	b, err := json.Marshal(messages.FindMatchMessage{
		Envelope:    messages.Envelope{Type: messages.FindMatchType},
		PrivateSeed: matchmakertest.PlayerAppTest1.PrivateSeed,
		Mode:        proto.GameMode_RANKED_CONSTRUCTED,
		VersionHash: s.versionHash,
	})
	s.NoError(err)

	s.sendMessage(client1, b)

	s.sendMessage(client2, b)

	expectedErrorMessage := make(chan messages.ErrorMessage)

	go func() {
		var errorMessage messages.ErrorMessage
		if err := client1.ReadJSON(&errorMessage); err == nil {
			expectedErrorMessage <- errorMessage
		}
	}()

	go func() {
		var errorMessage messages.ErrorMessage
		if err := client2.ReadJSON(&errorMessage); err == nil {
			expectedErrorMessage <- errorMessage
		}
	}()

	timeOut := time.NewTicker(time.Second * 5)
	select {
	case errorMessage := <-expectedErrorMessage:
		s.Equal(mmerrors.ErrDuplicateConnection.Error(), errorMessage.Reason)
	case <-timeOut.C:
		s.Failf("timed out", "timed out while waiting for server response")
	}
}

// TestMatch contains sequential client flows for each client to better demonstrate
// at what moment which action happens and also to make sure the sequence of actions does not change.
func (s *AppSuite) TestMatch() {
	s.Run("one-player matches", func() {
		tests := []proto.GameMode{
			proto.GameMode_WARM_UP,
			proto.GameMode_PRACTICE_BOT,
		}

		clientFlow := func(wg *sync.WaitGroup, client *websocket.Conn, privateSeed player.PrivateSeed, gameMode proto.GameMode) {
			defer wg.Done()

			s.sendMessage(client, messages.FindMatchMessage{
				Envelope:    messages.Envelope{Type: messages.FindMatchType},
				PrivateSeed: privateSeed,
				Mode:        gameMode,
				VersionHash: s.versionHash,
			})

			msg1, err := readMessage[messages.MatchMadeMessage](client)
			s.NoError(err)
			assert.NotEmpty(s.T(), msg1.ServerAddress)

			msg2, err := readMessage[messages.MatchReadyToStartMessage](client)
			s.NoError(err)
			assert.Equal(s.T(), gameMode, msg2.Mode)
		}

		for _, gameMode := range tests {
			s.Run(gameMode.String(), func() {
				client1 := s.newClient(s.app)
				defer client1.Close()

				wg := sync.WaitGroup{}

				wg.Add(1)
				go clientFlow(&wg, client1, matchmakertest.PlayerAppTest1.PrivateSeed, gameMode)

				wg.Wait()
			})
		}
	})

	s.Run("two-players matches", func() {
		s.Run("accept on both sides", func() {
			tests := []struct {
				p1GameMode, p2GameMode proto.GameMode
				sessionID              string
			}{
				{
					p1GameMode: proto.GameMode_PRACTICE_PVP,
					p2GameMode: proto.GameMode_PRACTICE_PVP,
				},
				{
					p1GameMode: proto.GameMode_RANKED_CONSTRUCTED,
					p2GameMode: proto.GameMode_RANKED_CONSTRUCTED,
				},
				{
					p1GameMode: proto.GameMode_RANKED_DISCOVERY,
					p2GameMode: proto.GameMode_RANKED_DISCOVERY,
				},
				{
					p1GameMode: proto.GameMode_RANKED_CONSTRUCTED,
					p2GameMode: proto.GameMode_PRACTICE_PVP,
				},
				{
					p1GameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
					p2GameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
				},
				{
					p1GameMode: proto.GameMode_CHALLENGE_CONSTRUCTED,
					p2GameMode: proto.GameMode_CHALLENGE_CONSTRUCTED,
					sessionID:  uuid.NewString(),
				},
				{
					p1GameMode: proto.GameMode_CHALLENGE_DISCOVERY,
					p2GameMode: proto.GameMode_CHALLENGE_DISCOVERY,
					sessionID:  uuid.NewString(),
				},
			}

			clientFlow := func(wg *sync.WaitGroup, client *websocket.Conn, privateSeed player.PrivateSeed, gameMode proto.GameMode, sessionID string) {
				defer wg.Done()

				s.sendMessage(client, messages.FindMatchMessage{
					Envelope:    messages.Envelope{Type: messages.FindMatchType},
					PrivateSeed: privateSeed,
					Mode:        gameMode,
					VersionHash: s.versionHash,
					SessionID:   sessionID,
				})

				msg1, err := readMessage[messages.MatchFoundMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg1.Mode)

				s.sendMessage(client, messages.AcceptMatchMessage{
					Envelope: messages.Envelope{Type: messages.AcceptMatchType},
					PlayerID: privateSeed.Player.String(),
				})

				// From self
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)
				// From opponent
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				msg5, err := readMessage[messages.MatchMadeMessage](client)
				s.NoError(err)
				s.NotEmpty(msg5.ServerAddress)

				msg6, err := readMessage[messages.MatchReadyToStartMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg6.Mode)
			}

			for _, tt := range tests {
				s.Run(fmt.Sprintf("%s vs %s", tt.p1GameMode, tt.p2GameMode), func() {
					client1 := s.newClient(s.app)
					defer client1.Close()

					wg := sync.WaitGroup{}

					wg.Add(1)
					go clientFlow(&wg, client1, matchmakertest.PlayerAppTest1.PrivateSeed, tt.p1GameMode, tt.sessionID)

					client2 := s.newClient(s.app)
					defer client2.Close()

					wg.Add(1)
					go clientFlow(&wg, client2, matchmakertest.PlayerAppTest2.PrivateSeed, tt.p2GameMode, tt.sessionID)

					wg.Wait()
				})
			}
		})

		s.Run("decline on one side", func() {
			tests := []struct {
				gameMode  proto.GameMode
				sessionID string
			}{
				{
					gameMode: proto.GameMode_PRACTICE_PVP,
				},
				{
					gameMode: proto.GameMode_RANKED_CONSTRUCTED,
				},
				{
					gameMode: proto.GameMode_RANKED_DISCOVERY,
				},
				{
					gameMode:  proto.GameMode_CHALLENGE_CONSTRUCTED,
					sessionID: uuid.NewString(),
				},
				{
					gameMode:  proto.GameMode_CHALLENGE_DISCOVERY,
					sessionID: uuid.NewString(),
				},
			}

			acceptFlow := func(wg *sync.WaitGroup, client *websocket.Conn, privateSeed player.PrivateSeed, gameMode proto.GameMode, sessionID string) {
				defer wg.Done()

				s.sendMessage(client, messages.FindMatchMessage{
					Envelope:    messages.Envelope{Type: messages.FindMatchType},
					PrivateSeed: privateSeed,
					Mode:        gameMode,
					VersionHash: s.versionHash,
					SessionID:   sessionID,
				})

				msg1, err := readMessage[messages.MatchFoundMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg1.Mode)

				s.sendMessage(client, messages.AcceptMatchMessage{
					Envelope: messages.Envelope{Type: messages.AcceptMatchType},
					PlayerID: privateSeed.Player.String(),
				})

				// From self
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				// From opponent
				_, err = readMessage[messages.DeclineMatchMessage](client)
				s.NoError(err)
			}

			declineFlow := func(wg *sync.WaitGroup, client *websocket.Conn, privateSeed player.PrivateSeed, gameMode proto.GameMode, sessionID string) {
				defer wg.Done()

				s.sendMessage(client, messages.FindMatchMessage{
					Envelope:    messages.Envelope{Type: messages.FindMatchType},
					PrivateSeed: privateSeed,
					Mode:        gameMode,
					VersionHash: s.versionHash,
					SessionID:   sessionID,
				})

				msg1, err := readMessage[messages.MatchFoundMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg1.Mode)

				// From opponent
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				s.sendMessage(client, messages.DeclineMatchMessage{
					Envelope: messages.Envelope{Type: messages.DeclineMatchType},
					PlayerID: privateSeed.Player.String(),
				})

				// From self
				_, err = readMessage[messages.DeclineMatchMessage](client)
				s.NoError(err)
			}

			for _, tt := range tests {
				s.Run(tt.gameMode.String(), func() {
					client1 := s.newClient(s.app)
					defer client1.Close()

					wg := sync.WaitGroup{}

					wg.Add(1)
					go acceptFlow(&wg, client1, matchmakertest.PlayerAppTest1.PrivateSeed, tt.gameMode, tt.sessionID)

					client2 := s.newClient(s.app)
					defer client2.Close()

					wg.Add(1)
					go declineFlow(&wg, client2, matchmakertest.PlayerAppTest2.PrivateSeed, tt.gameMode, tt.sessionID)

					wg.Wait()
				})
			}
		})

		s.Run("with a bot and accept", func() {
			tests := []struct {
				gameMode  proto.GameMode
				sessionID string
			}{
				{
					gameMode: proto.GameMode_PRACTICE_PVP,
				},
				{
					gameMode: proto.GameMode_RANKED_CONSTRUCTED,
				},
				{
					gameMode: proto.GameMode_RANKED_DISCOVERY,
				},
			}

			clientFlow := func(wg *sync.WaitGroup, client *websocket.Conn, privateSeed player.PrivateSeed, gameMode proto.GameMode, sessionID string) {
				defer wg.Done()

				s.sendMessage(client, messages.FindMatchMessage{
					Envelope:    messages.Envelope{Type: messages.FindMatchType},
					PrivateSeed: privateSeed,
					Mode:        gameMode,
					VersionHash: s.versionHash,
					SessionID:   sessionID,
				})

				msg1, err := readMessage[messages.MatchFoundMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg1.Mode)

				s.sendMessage(client, messages.AcceptMatchMessage{
					Envelope: messages.Envelope{Type: messages.AcceptMatchType},
					PlayerID: privateSeed.Player.String(),
				})

				// From self
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)
				// From opponent
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				msg5, err := readMessage[messages.MatchMadeMessage](client)
				s.NoError(err)
				s.NotEmpty(msg5.ServerAddress)

				msg6, err := readMessage[messages.MatchReadyToStartMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg6.Mode)
			}

			ctx, cancelFn := context.WithCancel(context.Background())
			defer cancelFn()

			cfg := s.newConfig()
			cfg.Service.Listen = "0.0.0.0:8889"
			cfg.MatchMaker.PlayerBot.EnabledInRankedQueue = true

			app := s.newApp(ctx, cfg)

			for _, tt := range tests {
				s.Run(tt.gameMode.String(), func() {
					client1 := s.newClient(app)
					defer client1.Close()

					wg := sync.WaitGroup{}

					wg.Add(1)
					go clientFlow(&wg, client1, matchmakertest.PlayerAppTest1.PrivateSeed, tt.gameMode, tt.sessionID)

					wg.Wait()
				})
			}
		})

		s.Run("conquest match decline is not permitted and is auto-accepted", func() {
			tests := []proto.GameMode{
				proto.GameMode_CONQUEST_CONSTRUCTED,
			}

			acceptFlow := func(wg *sync.WaitGroup, client *websocket.Conn, privateSeed player.PrivateSeed, gameMode proto.GameMode) {
				defer wg.Done()

				s.sendMessage(client, messages.FindMatchMessage{
					Envelope:    messages.Envelope{Type: messages.FindMatchType},
					PrivateSeed: privateSeed,
					Mode:        gameMode,
					VersionHash: s.versionHash,
				})

				msg1, err := readMessage[messages.MatchFoundMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg1.Mode)

				s.sendMessage(client, messages.AcceptMatchMessage{
					Envelope: messages.Envelope{Type: messages.AcceptMatchType},
					PlayerID: privateSeed.Player.String(),
				})

				// From self
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				// Auto-accepted from opponent
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				msg4, err := readMessage[messages.MatchMadeMessage](client)
				s.NoError(err)
				s.NotEmpty(msg4.ServerAddress)

				msg5, err := readMessage[messages.MatchReadyToStartMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg5.Mode)
			}

			declineFlow := func(wg *sync.WaitGroup, client *websocket.Conn, privateSeed player.PrivateSeed, gameMode proto.GameMode) {
				defer wg.Done()

				s.sendMessage(client, messages.FindMatchMessage{
					Envelope:    messages.Envelope{Type: messages.FindMatchType},
					PrivateSeed: privateSeed,
					Mode:        gameMode,
					VersionHash: s.versionHash,
				})

				msg1, err := readMessage[messages.MatchFoundMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg1.Mode)

				// From opponent
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				s.sendMessage(client, messages.DeclineMatchMessage{
					Envelope: messages.Envelope{Type: messages.DeclineMatchType},
					PlayerID: privateSeed.Player.String(),
				})

				msg3, err := readMessage[messages.ErrorMessage](client)
				s.NoError(err)
				s.Equal(mmerrors.ErrInvalidOperation.Error(), msg3.Reason)
				s.Equal(mmerrors.ErrInvalidOperation.Error(), msg3.Message)

				// Auto-accepted from self
				_, err = readMessage[messages.AcceptMatchMessage](client)
				s.NoError(err)

				msg5, err := readMessage[messages.MatchMadeMessage](client)
				s.NoError(err)
				s.NotEmpty(msg5.ServerAddress)

				msg6, err := readMessage[messages.MatchReadyToStartMessage](client)
				s.NoError(err)
				s.Equal(gameMode, msg6.Mode)
			}

			for _, gameMode := range tests {
				s.Run(gameMode.String(), func() {
					client1 := s.newClient(s.app)
					defer client1.Close()

					wg := sync.WaitGroup{}

					wg.Add(1)
					go acceptFlow(&wg, client1, matchmakertest.PlayerAppTest1.PrivateSeed, gameMode)

					client2 := s.newClient(s.app)
					defer client2.Close()

					wg.Add(1)
					go declineFlow(&wg, client2, matchmakertest.PlayerAppTest2.PrivateSeed, gameMode)

					wg.Wait()
				})
			}
		})
	})
}

func (s *AppSuite) newConfig() *config.Config {
	var configFile config.Config

	err := config.NewFromFile("etc/matchmaker.test.conf", "development", &configFile)
	s.NoError(err)

	return &configFile
}

func (s *AppSuite) newApp(ctx context.Context, cfg *config.Config) *matchmaker.App {
	ctx, cancelFn := context.WithCancel(ctx)

	mocks := mockservices.NewServices(cfg)
	err := mocks.Start(ctx)
	s.NoError(err)

	app, err := matchmaker.New(cfg)
	s.NoError(err)

	err = mocks.AdvertiseGameServers(app.KeyValStore())
	s.NoError(err)

	go func(ctx context.Context) {
		err = app.Start(ctx)
		s.NoError(err)
		cancelFn()
		mocks.Stop()
	}(ctx)

	s.waitUntilAppReady(app)

	return app
}

func (s *AppSuite) waitUntilAppReady(app *matchmaker.App) {
	require.Eventually(s.T(), func() bool {
		if _, err := http.Get("http://" + app.HTTPAddr() + "/ping"); err != nil {
			return false
		}

		return true
	}, 10*time.Second, 100*time.Millisecond)
}

func (s *AppSuite) newClient(app *matchmaker.App) *websocket.Conn {
	websocketURL := "ws://" + app.HTTPAddr() + "?token=AAAA"

	client, _, err := websocket.DefaultDialer.Dial(websocketURL, nil)
	s.NoError(err)
	s.NotNil(client)

	return client
}

func (s *AppSuite) sendMessage(client *websocket.Conn, msg any) {
	var b []byte

	if val, ok := msg.([]byte); ok {
		b = val
	} else {
		var err error
		b, err = json.Marshal(msg)
		s.NoError(err)
	}

	err := client.WriteMessage(websocket.TextMessage, b)
	s.NoError(err)
}

func readMessage[V any](client *websocket.Conn) (msg V, err error) {
	var msgType string

	var v V
	switch any(v).(type) {
	case messages.MatchFoundMessage:
		msgType = "match_found"
	case messages.MatchMadeMessage:
		msgType = "match_made"
	case messages.MatchReadyToStartMessage:
		msgType = "match_ready_to_start"
	case messages.AcceptMatchMessage:
		msgType = "accept_match"
	case messages.DeclineMatchMessage:
		msgType = "decline_match"
	case messages.ErrorMessage:
		msgType = "error"
	default:
		return msg, fmt.Errorf("undefined message type")
	}

	_, b, err := client.ReadMessage()
	if err != nil {
		return msg, fmt.Errorf("read message: %w", err)
	}

	var envelope messages.Envelope
	err = json.Unmarshal(b, &envelope)
	if err != nil {
		return msg, fmt.Errorf("decode envelope: %w", err)
	}

	switch string(envelope.Type) {
	case msgType:
		err = json.Unmarshal(b, &msg)
		if err != nil {
			return msg, fmt.Errorf("decode message: %w", err)
		}
	case "error":
		var errMsg messages.ErrorMessage
		err = json.Unmarshal(b, &errMsg)
		if err != nil {
			return msg, fmt.Errorf("decode error message: %w", err)
		}

		return msg, fmt.Errorf("expected %q, error received: %+v", msgType, errMsg)
	default:
		return msg, fmt.Errorf("expected %q, unexpected message received: %s", msgType, b)
	}

	return msg, nil
}
