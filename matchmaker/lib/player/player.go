package player

import (
	"errors"
	"math"
	"math/rand"
	"time"

	"github.com/google/uuid"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue"
)

const (
	shadowBanSecondsMin = 150
	shadowBanSecondsMax = shadowBanSecondsMin + 180
)

var botPlayerAddress = BinaryAddress("0x0000000000000000000000000000000000000000")

type Player struct {
	PrivateSeed PrivateSeed     `json:"privateSeed"`
	DeckString  *string         `json:"deckString,omitempty"`
	DeckClass   proto.DeckClass `json:"deckClass,omitempty"`

	Account *AccountWithItems `json:"account,omitempty"`

	Quests []*proto.Quest `json:"quests"`

	SessionID         string         `json:"sessionID"`
	PlayerSessionID   uuid.UUID      `json:"playerSessionID"`
	Mode              proto.GameMode `json:"mode"`
	IsRandomDeck      bool           `json:"isRandomDeck,omitempty"`
	SessionStartTime  *time.Time     `json:"sessionStartTime,omitempty"`
	ClientVersionHash string         `json:"clientVersionHash,omitempty"`

	IPAddress string `json:"ipAddress,omitempty"`

	ConquestInfo *proto.Conquest `json:"conquestInfo,omitempty"`

	ShadowBanned   *bool      `json:"shadowbanned,omitempty"`
	ShadowBanUntil *time.Time `json:"shadowbannedUntil,omitempty"`

	InitTimestamp *time.Time `json:"initTimestamp,omitempty"`

	BotSubkey     *proto.Hash `json:"botSubkey,omitempty"`
	BotDifficulty float64     `json:"botDifficulty,omitempty"`

	MatchProposalID string `json:"match_proposal_id,omitempty"`
}

type PlayerStatus uint8

const (
	PlayerStatus_CONNECTED PlayerStatus = iota

	PlayerStatus_LOOKING_FOR_MATCH
	PlayerStatus_MATCH_FOUND
	PlayerStatus_MATCH_ACCEPTED
	PlayerStatus_MATCH_ABORTED
	PlayerStatus_MATCH_TIMED_OUT
	PlayerStatus_MATCH_DISPATCHED

	PlayerStatus_DISCONNECTED

	PlayerStatus_ERROR
)

func New(privateSeed *PrivateSeed, mode proto.GameMode) (*Player, error) {
	p := &Player{
		InitTimestamp: data.TimeNowUTCPtr(),
	}
	if err := p.setPrivateSeed(privateSeed, mode); err != nil {
		return nil, err
	}
	return p, nil
}

func NewBotPlayer(mode proto.GameMode) *Player {
	now := time.Now()
	return &Player{
		PrivateSeed: PrivateSeed{
			Player: botPlayerAddress,
		},
		SessionStartTime: &now,
		Mode:             mode,
	}
}

func NewWithAddressAndMode(address proto.Hash, mode proto.GameMode) *Player {
	return &Player{
		PrivateSeed: PrivateSeed{
			Player: BinaryAddress(address),
		},
		Mode: mode,
	}
}

func (c *Player) IsBot() bool {
	return c.PrivateSeed.Player == botPlayerAddress
}

func NewWithAddress(address proto.Hash) *Player {
	return &Player{
		PrivateSeed: PrivateSeed{
			Player: BinaryAddress(address),
		},
	}
}

func (c *Player) SetPrisms(prisms []Prism) {
	c.PrivateSeed.Prisms = prisms
	c.DeckClass = PrismsToDeckClass(c.PrivateSeed.Prisms)
	c.Account.Prisms = prisms
}

func (c *Player) setPrivateSeed(privateSeed *PrivateSeed, mode proto.GameMode) error {
	if privateSeed == nil {
		return errors.New("invalid private seed")
	}

	c.PrivateSeed = *privateSeed
	if len(c.PrivateSeed.Cards) < 1 {
		c.PrivateSeed.Cards = []uint64{}
	}

	// we can never trust card rarities from the client
	c.PrivateSeed.CardRarities = map[uint64]Rarity{}

	c.Account = NewAccountWithItems(&proto.Account{})
	c.Account.Prisms = c.PrivateSeed.Prisms

	c.DeckClass = PrismsToDeckClass(c.PrivateSeed.Prisms)

	deckString, err := deckstring.Encode(c.PrivateSeed.Cards, c.DeckClass.String())
	if err != nil {
		return err
	}

	c.DeckString = &deckString
	c.IsRandomDeck = isRandomDeckString(c.DeckString)

	c.Account.DeckString = deckString

	c.Mode = mode

	return nil
}

// ID is there to satisfy store.Item interface.
func (c *Player) ID() string {
	return c.Address().String()
}

// Address returns the player's address
func (c *Player) Address() proto.Hash {
	if c.Account != nil && c.Account.Address.IsValidAddress() {
		// This value won't match c.PrivateSeed.Player in the bot-player case (bots
		// with actual accounts), that's why it takes precedence over PrivateSeed
		return c.Account.Address
	}
	return proto.Hash(c.PrivateSeed.Player)
}

func (c *Player) Rank() proto.PlayerRank {
	if c.Account == nil || c.Account.Stats == nil {
		return proto.PlayerRank_UNKNOWN
	}

	if (c.Mode == proto.GameMode_RANKED_CONSTRUCTED || c.Mode == proto.GameMode_PRACTICE_PVP) && c.Account.Stats.RankedConstructed != nil {
		return c.Account.Stats.RankedConstructed.PlayerRank
	}

	if c.Mode == proto.GameMode_RANKED_DISCOVERY && c.Account.Stats.RankedDiscovery != nil {
		return c.Account.Stats.RankedDiscovery.PlayerRank
	}

	return proto.PlayerRank_UNKNOWN
}

func (c *Player) Ranking() ranking.State {
	defaultRankingState := ranking.InitialRankState()

	if c.Account == nil || c.Account.Stats == nil {
		return *defaultRankingState
	}

	if c.Mode == proto.GameMode_RANKED_CONSTRUCTED || c.Mode == proto.GameMode_PRACTICE_PVP {
		if c.Account.Stats.RankedConstructed == nil || c.Account.Stats.RankedConstructed.InternalPlayerRankState == nil {
			return *defaultRankingState
		}
		return c.Account.Stats.RankedConstructed.InternalPlayerRankState.State
	}

	if c.Mode == proto.GameMode_RANKED_DISCOVERY {
		if c.Account.Stats.RankedDiscovery == nil || c.Account.Stats.RankedDiscovery.InternalPlayerRankState == nil {
			return *defaultRankingState
		}
		return c.Account.Stats.RankedDiscovery.InternalPlayerRankState.State
	}

	return *defaultRankingState
}

func (c *Player) Score() int32 {
	var score int32

	if c.Account == nil || c.Account.Stats == nil {
		return 0
	}

	if (c.Mode == proto.GameMode_RANKED_CONSTRUCTED || c.Mode == proto.GameMode_PRACTICE_PVP) && c.Account.Stats.RankedConstructed != nil && c.Account.Stats.RankedConstructed.Score != nil {
		score = *c.Account.Stats.RankedConstructed.Score
	}

	if c.Mode == proto.GameMode_RANKED_DISCOVERY && c.Account.Stats.RankedDiscovery != nil && c.Account.Stats.RankedDiscovery.Score != nil {
		score = *c.Account.Stats.RankedDiscovery.Score
	}

	if c.Mode == proto.GameMode_CONQUEST_CONSTRUCTED && c.Account.Stats.ConquestConstructed != nil && c.Account.Stats.ConquestConstructed.Score != nil {
		score = *c.Account.Stats.ConquestConstructed.Score
	}

	if c.Mode == proto.GameMode_CONQUEST_DISCOVERY && c.Account.Stats.ConquestDiscovery != nil && c.Account.Stats.ConquestDiscovery.Score != nil {
		score = *c.Account.Stats.ConquestDiscovery.Score
	}

	// cap scores to 1600 so that people with really high scores can continue
	// matching with grandweavers
	return int32(math.Min(1600, float64(score)))
}

func (c *Player) Queue() queue.Queue {
	return queue.NewGameModeQueue(c.Mode)
}

func (c *Player) ClearShadowBan() {
	c.ShadowBanned = new(bool)
	c.ShadowBanUntil = &time.Time{}
}

func (c *Player) SetShadowBan() {
	// Set shadowban until a given time, after this time, the matchmaker will
	// either disconnect with an error message or will let them pass and match
	// against someone.
	c.ShadowBanned = new(bool)
	*c.ShadowBanned = true

	banSeconds := shadowBanSecondsMin + rand.Intn(shadowBanSecondsMax-shadowBanSecondsMin) // random time between 2.5 to 5.5 min

	shadowBanUntil := time.Now().Add(time.Duration(banSeconds) * time.Second)
	c.ShadowBanUntil = &shadowBanUntil
}

func (c *Player) IsBotMatch() bool {
	switch c.Mode {
	case proto.GameMode_WARM_UP, proto.GameMode_PRACTICE_BOT:
		return true
	}
	return false
}

func (c *Player) IsPracticePVCMatch() bool {
	switch c.Mode {
	case proto.GameMode_PRACTICE_BOT:
		return true
	}
	return false
}

func (c *Player) IsPracticePVPMatch() bool {
	switch c.Mode {
	case proto.GameMode_PRACTICE_PVP:
		return true
	}
	return false
}

func (c *Player) IsChallengeMatch() bool {
	switch c.Mode {
	case proto.GameMode_CHALLENGE_CONSTRUCTED, proto.GameMode_CHALLENGE_DISCOVERY:
		return true
	}
	return false
}

func (c *Player) IsConquestMatch() bool {
	switch c.Mode {
	case proto.GameMode_CONQUEST_CONSTRUCTED, proto.GameMode_CONQUEST_DISCOVERY:
		return true
	}
	return false
}

func (c *Player) WaitTime() time.Duration {
	if c.InitTimestamp == nil || c.InitTimestamp.IsZero() {
		return 0
	}
	since := time.Since(*c.InitTimestamp)
	if since > 0 {
		return since
	}
	return 0
}

func (c *Player) RemoveUnownedCardsFromDeck() error {
	// Filter-out cards that are not owned by the user
	filteredCards := make([]uint64, 0, len(c.PrivateSeed.Cards))
	for _, card := range c.PrivateSeed.Cards {
		if _, ok := c.Account.Cards[card]; !ok {
			continue
		}
		filteredCards = append(filteredCards, card)
	}

	// Re-encode deck string
	deckString, err := deckstring.Encode(filteredCards, c.DeckClass.String())
	if err != nil {
		return err
	}

	c.PrivateSeed.Cards = filteredCards
	c.DeckString = &deckString

	// Set card rarities
	c.PrivateSeed.CardRarities = map[uint64]Rarity{}
	for k := range c.Account.Cards {
		c.PrivateSeed.CardRarities[k] = c.Account.Cards[k]
	}

	return nil
}

func (c *Player) IsRankedMatch() bool {
	switch c.Mode {
	case proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY:
		return true
	}
	return false
}

func (c *Player) CurrentConquestWins() int {
	if c.ConquestInfo == nil {
		return 0
	}

	var wins int
	for _, p := range c.ConquestInfo.MatchProgress {
		if p == proto.ConquestMatchResult_WIN {
			wins++
		}
	}
	return wins
}

func (c *Player) SetMatchProposalID(id string) {
	c.MatchProposalID = id
}

func (c *Player) HasMatchProposalID() bool {
	return len(c.MatchProposalID) > 0
}

func (c *Player) GetMatchProposalID() string {
	return c.MatchProposalID
}
