package messages

import (
	"math"
	"time"

	"github.com/google/uuid"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type MessageType string

const EmptyMessageType MessageType = ""

// Messages received from client
const (
	FindMatchType    MessageType = "find_match"
	AcceptMatchType  MessageType = "accept_match"
	DeclineMatchType MessageType = "decline_match"
	PingType         MessageType = "ping"
)

// Messages sent to client
const (
	matchFoundType           MessageType = "match_found"
	matchMadeType            MessageType = "match_made"
	matchReadyToStartType    MessageType = "match_ready_to_start"
	inProgressMatchInfoType  MessageType = "in_progress_match_info"
	matchRefusalCooldownType MessageType = "match_refusal_cooldown"
	nomatchFoundType         MessageType = "no_match_found"
	timedOutType             MessageType = "timed_out"
)

type Envelope struct {
	Type MessageType `json:"type"`
}

type FindMatchMessage struct {
	Envelope
	PrivateSeed     player.PrivateSeed  `json:"privateSeed"`
	SessionID       string              `json:"sessionID"`
	Mode            proto.GameMode      `json:"mode"`
	VersionHash     string              `json:"versionHash"`
	AuthToken       string              `json:"authToken"`
	VerifyToken     HCaptchaVerifyToken `json:"verifyToken"`
	PlayerSessionID uuid.UUID           `json:"playerSessionID"`
}

type HCaptchaVerifyToken struct {
	Key      string `json:"key"`
	Response string `json:"response"`
}

type AcceptMatchMessage struct {
	Envelope
	PlayerID string `json:"playerID"`
}

func NewAcceptedMatchMessage(playerID proto.Hash) *AcceptMatchMessage {
	return &AcceptMatchMessage{
		Envelope: Envelope{
			Type: AcceptMatchType,
		},
		PlayerID: playerID.String(),
	}
}

type DeclineMatchMessage struct {
	Envelope
	PlayerID string `json:"playerID"`
}

func NewDeclinedMatchMessage(playerID proto.Hash) *DeclineMatchMessage {
	return &DeclineMatchMessage{
		Envelope: Envelope{
			Type: DeclineMatchType,
		},
		PlayerID: playerID.String(),
	}
}

type MatchFoundMessage struct {
	Envelope
	Mode      proto.GameMode `json:"mode"`
	TimeoutMs uint64         `json:"timeoutMs"`
	PlayerIDs []string       `json:"playerIDs"`
}

func NewMatchFoundMessage(mode proto.GameMode, timeoutMs time.Duration, playerIDs []string) *MatchFoundMessage {
	return &MatchFoundMessage{
		Envelope: Envelope{
			Type: matchFoundType,
		},
		Mode:      mode,
		TimeoutMs: uint64(math.Floor(float64(timeoutMs) / float64(time.Millisecond))),
		PlayerIDs: playerIDs,
	}
}

type MatchMadeMessage struct {
	Envelope
	ServerAddress string `json:"serverAddress"`
}

func NewMatchMadeMessage(serverAddress string) *MatchMadeMessage {
	return &MatchMadeMessage{
		Envelope: Envelope{
			Type: matchMadeType,
		},
		ServerAddress: serverAddress,
	}
}

type InProgressMatchInfo struct {
	Envelope
	MatchInfo         MatchInfo                  `json:"matchInfo"`
	ServerInfo        gameservers.GameServerInfo `json:"serverInfo"`
	DisconnectTimeout uint64                     `json:"disconnectTimeout"`
}

func InProgressMatchInfoMessage(matchInfo MatchInfo, serverInfo gameservers.GameServerInfo, disconnectTimeout time.Duration) *InProgressMatchInfo {
	return &InProgressMatchInfo{
		Envelope: Envelope{
			Type: inProgressMatchInfoType,
		},
		MatchInfo:         matchInfo,
		ServerInfo:        serverInfo,
		DisconnectTimeout: uint64(math.Floor(float64(disconnectTimeout) / float64(time.Second))),
	}
}

type MatchInfo struct {
	ID                int            `json:"id"`
	Mode              proto.GameMode `json:"mode"`
	PlayerIDs         []string       `json:"playerIDs"`
	ServerLocationKey string         `json:"serverLocationKey"`
	Version           string         `json:"version"`
	Initialized       bool           `json:"initialized"`
}

type RecentMatchInfo struct {
	Envelope
	PlayerID     string                     `json:"playerID"`
	GameMode     proto.GameMode             `json:"gameMode"`
	MatchID      int                        `json:"matchID"`
	ReplayID     string                     `json:"replayID"`
	Accounts     [2]player.AccountWithItems `json:"accounts"`
	ConquestInfo [2]proto.Conquest          `json:"conquestInfo"`
	Store        string                     `json:"store"`
	Rewards      []proto.Reward             `json:"rewards"`
}

type MatchRefusalCooldown struct {
	Envelope
	DurationSeconds int `json:"durationSeconds"`
}

func NewCooldownPenaltyMessage(durationSeconds time.Duration) *MatchRefusalCooldown {
	return &MatchRefusalCooldown{
		Envelope: Envelope{
			Type: matchRefusalCooldownType,
		},
		DurationSeconds: int(durationSeconds / time.Second),
	}
}

type MatchReadyToStartMessage struct {
	Envelope
	Mode proto.GameMode `json:"mode"`
}

func NewMatchReadyToStartMessage(mode proto.GameMode) *MatchReadyToStartMessage {
	return &MatchReadyToStartMessage{
		Envelope: Envelope{
			Type: matchReadyToStartType,
		},
		Mode: mode,
	}
}

type ErrorMessage struct {
	Type    string `json:"type"`
	Reason  string `json:"reason"`
	Message string `json:"message"`
	Level   string `json:"level"`
}

func NewErrorMessage(reason string) *ErrorMessage {
	return &ErrorMessage{
		Type:    "error",
		Reason:  reason,
		Message: reason,
		Level:   "server",
	}
}

func NewTimedOutMessage() *Envelope {
	return &Envelope{
		Type: timedOutType,
	}
}

func NoMatchFoundMessage() *Envelope {
	return &Envelope{
		Type: nomatchFoundType,
	}
}
