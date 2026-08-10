package data

import (
	"crypto/sha1"
	"encoding/binary"
	"errors"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MatchTie        = 0
	MatchPlayer1Won = 1
	MatchPlayer2Won = 2
)

// Represents an entry on the Leaderboard
type Match struct {
	*proto.Match
}

func NewMatch(match *proto.Match) *Match {
	return &Match{
		Match: match,
	}
}

func (m *Match) Store(sess db.Session) db.Store {
	return DB.Matches(sess)
}

func (m *Match) Validate() error {
	if m.Status == proto.MatchStatus_UNKNOWN {
		return errMissingParam("status")
	}

	if m.StartedAt == nil {
		return errMissingParam("started_at")
	}
	if m.Status != proto.MatchStatus_IN_PROGRESS {
		if m.EndedAt == nil {
			return errMissingParam("ended_at")
		}
		if !m.EndedAt.After(*m.StartedAt) {
			return errors.New("ended_at must be greater than started_at")
		}
	}
	if m.WinningPlayer != nil && *m.WinningPlayer == 0 {
		if m.Status != proto.MatchStatus_COMPLETED && m.Status != proto.MatchStatus_CRASHED {
			return errors.New("tied matches must always result in a completed status")
		}
	}

	if !m.Player1ID.IsValid() {
		return errMissingParam("player1ID")
	}
	if !m.Player2ID.IsValid() {
		return errMissingParam("player2ID")
	}
	if m.Status != proto.MatchStatus_IN_PROGRESS && m.Player1DeckString == "" {
		return errMissingParam("player1DeckString")
	}
	if m.Status != proto.MatchStatus_IN_PROGRESS && m.Player2DeckString == "" {
		return errMissingParam("player2DeckString")
	}
	if m.InitPlayer1DeckString == "" {
		return errMissingParam("initPlayer1DeckString")
	}
	if m.InitPlayer2DeckString == "" {
		return errMissingParam("initPlayer2DeckString")
	}

	return nil
}

// GenerateReplayID generates and sets a replay ID.
func (m *Match) GenerateReplayID(salt string) {
	hash := sha1.New()

	hash.Write([]byte(salt))

	matchID := make([]byte, 8)
	binary.LittleEndian.PutUint64(matchID, m.ID)
	hash.Write(matchID)

	m.ReplayID = fmt.Sprintf("%x", hash.Sum(nil))
}

// IsReplayIDValid checks whether the passed replay ID is a valid replay ID of the match.
func (m *Match) IsReplayIDValid(salt string, replayID string) bool {
	if m.ReplayID == "" {
		m.GenerateReplayID(salt)
	}

	return m.ReplayID == replayID
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &Match{}
)
