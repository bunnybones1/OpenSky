package playergen

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/0xsequence/ethkit/ethwallet"
	"github.com/google/uuid"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

type Option func(*player.Player) error

func newPlayer(options ...Option) (*player.Player, error) {
	wallet, err := ethwallet.NewWalletFromRandomEntropy()
	if err != nil {
		return nil, fmt.Errorf("NewWalletFromRandomEntropy: %w", err)
	}

	subkey, err := ethwallet.NewWalletFromRandomEntropy()
	if err != nil {
		return nil, fmt.Errorf("NewWalletFromRandomEntropy: %w", err)
	}

	privateSeed, err := player.NewPrivateSeedWithKeys(wallet, subkey)
	if err != nil {
		return nil, err
	}

	p := player.Player{
		PrivateSeed: *privateSeed,
	}

	createdAt := time.Date(2020, time.January, 1, 0, 0, 0, 0, time.UTC)

	sessionStartTime := time.Now()

	account := player.NewAccountWithItems(&proto.Account{
		Address:   proto.HashFromString(wallet.Address().Hex()),
		Name:      fmt.Sprintf("playergen-%s", wallet.Address().Hex()[0:8]),
		Locale:    "en",
		WarmUps:   0,
		CreatedAt: &createdAt,
		UpdatedAt: &createdAt,
		Level:     12,
		LevelUpXP: 120,
		Stats: &proto.AccountStats{
			RankedConstructed:   &proto.AccountStat{},
			RankedDiscovery:     &proto.AccountStat{},
			ConquestConstructed: &proto.AccountStat{},
			ConquestDiscovery:   &proto.AccountStat{},
		},
	})

	p.ConquestInfo = &proto.Conquest{}

	p.SessionStartTime = &sessionStartTime
	p.PlayerSessionID = uuid.New()
	p.Account = account

	p.ClientVersionHash = config.GITCOMMIT
	p.IPAddress = "127.0.0.1"

	for i := range options {
		if err := options[i](&p); err != nil {
			return nil, fmt.Errorf("failed to apply option: %w", err)
		}
	}

	return &p, nil
}

func MustNew(options ...Option) *player.Player {
	p, err := newPlayer(options...)
	if err != nil {
		panic(err)
	}

	return p
}

func WithIPAddress(ip string) Option {
	return func(p *player.Player) error {
		p.IPAddress = ip
		return nil
	}
}

func WithMode(mode proto.GameMode) Option {
	return func(p *player.Player) error {
		p.Mode = mode
		return nil
	}
}

func WithRank(rank proto.PlayerRank) Option {
	return func(p *player.Player) error {
		if p.Mode == proto.GameMode_RANKED_CONSTRUCTED {
			p.Account.Stats.RankedConstructed.PlayerRank = rank
		} else {
			p.Account.Stats.RankedDiscovery.PlayerRank = rank
		}
		return nil
	}
}

func WithWin(b bool) Option {
	return func(p *player.Player) error {
		var state **proto.RankState
		switch p.Mode {
		case proto.GameMode_PRACTICE_PVP,
			proto.GameMode_RANKED_CONSTRUCTED:
			state = &p.Account.Stats.RankedConstructed.InternalPlayerRankState
		case proto.GameMode_RANKED_DISCOVERY:
			state = &p.Account.Stats.RankedDiscovery.InternalPlayerRankState
		}

		if *state == nil {
			*state = &proto.RankState{}
		}

		(*state).Win = 3

		if b {
			(*state).Win = 1
		}

		return nil
	}
}

func WithR(r float64) Option {
	return func(p *player.Player) error {
		var state **proto.RankState
		switch p.Mode {
		case proto.GameMode_RANKED_CONSTRUCTED:
			state = &p.Account.Stats.RankedConstructed.InternalPlayerRankState
		case proto.GameMode_RANKED_DISCOVERY:
			state = &p.Account.Stats.RankedDiscovery.InternalPlayerRankState
		}
		if *state == nil {
			*state = &proto.RankState{}
		}
		(*state).R = r
		return nil
	}
}

func WithRP(rp int32) Option {
	return func(p *player.Player) error {
		var state **proto.RankState
		switch p.Mode {
		case proto.GameMode_RANKED_CONSTRUCTED:
			state = &p.Account.Stats.RankedConstructed.InternalPlayerRankState
		case proto.GameMode_RANKED_DISCOVERY:
			state = &p.Account.Stats.RankedDiscovery.InternalPlayerRankState
		}
		if *state == nil {
			*state = &proto.RankState{}
		}
		(*state).RP = rp
		return nil
	}
}

func WithSessionID(sessionID string) Option {
	return func(p *player.Player) error {
		p.SessionID = sessionID
		return nil
	}
}

func WithScore(score int32) Option {
	return func(p *player.Player) error {
		switch p.Mode {
		case proto.GameMode_RANKED_CONSTRUCTED:
			p.Account.Stats.RankedConstructed.Score = &score
		case proto.GameMode_RANKED_DISCOVERY:
			p.Account.Stats.RankedDiscovery.Score = &score
		case proto.GameMode_CONQUEST_CONSTRUCTED:
			p.Account.Stats.ConquestConstructed.Score = &score
		case proto.GameMode_CONQUEST_DISCOVERY:
			p.Account.Stats.ConquestDiscovery.Score = &score
		case proto.GameMode_PRACTICE_PVP:
			p.Account.Stats.RankedConstructed.Score = &score
			p.Account.Stats.RankedDiscovery.Score = &score
		}

		return nil
	}
}

func WithInitTimestamp(ts time.Time) Option {
	return func(p *player.Player) error {
		p.InitTimestamp = &ts
		return nil
	}
}

func WithConquestWins(wins int) Option {
	return func(p *player.Player) error {
		conquestInfo := proto.Conquest{
			MatchProgress: proto.ConquestMatchResultMap{},
		}

		for i := 0; i < wins; i++ {
			conquestInfo.MatchProgress[uint64(i)] = proto.ConquestMatchResult_WIN
		}

		p.ConquestInfo = &conquestInfo
		return nil
	}
}

func WithRandomPrisms() Option {
	return func(p *player.Player) error {
		prisms := player.GenerateRandomPrisms()
		return WithPrisms(prisms...)(p)
	}
}

func WithPrisms(prisms ...player.Prism) Option {
	return func(p *player.Player) error {
		p.SetPrisms(prisms)
		return nil
	}
}

func WithGoldCards(cards ...uint64) Option {
	return withCardsRarity(player.Rarity_GOLD, cards...)
}

func WithSilverCards(cards ...uint64) Option {
	return withCardsRarity(player.Rarity_SILVER, cards...)
}

func WithBaseCards(cards ...uint64) Option {
	return withCardsRarity(player.Rarity_BASE, cards...)
}

func withCardsRarity(rarity player.Rarity, cards ...uint64) Option {
	return func(p *player.Player) error {
		// set cards
		p.PrivateSeed.Cards = cards
		// set owned cards
		ownedCards := player.CardRarities{}
		for _, cardID := range p.PrivateSeed.Cards {
			ownedCards[cardID] = rarity
		}
		p.Account.Cards = ownedCards
		if err := p.RemoveUnownedCardsFromDeck(); err != nil {
			return err
		}
		return nil
	}
}

func WithCards(cards ...uint64) Option {
	return func(p *player.Player) error {
		// set cards
		p.PrivateSeed.Cards = cards
		// set owned cards
		ownedCards := player.CardRarities{}
		for _, cardID := range p.PrivateSeed.Cards {
			ownedCards[cardID] = getRandomRarity()
		}
		p.Account.Cards = ownedCards
		if err := p.RemoveUnownedCardsFromDeck(); err != nil {
			return err
		}
		return nil
	}
}

func WithRandomGameMode() Option {
	return func(p *player.Player) error {
		modes := []proto.GameMode{
			proto.GameMode_RANKED_DISCOVERY,
			proto.GameMode_CONQUEST_DISCOVERY,
			proto.GameMode_RANKED_CONSTRUCTED,
			proto.GameMode_CONQUEST_CONSTRUCTED,
			proto.GameMode_WARM_UP,
			proto.GameMode_PRACTICE_BOT,
			proto.GameMode_CHALLENGE_CONSTRUCTED,
			proto.GameMode_CHALLENGE_DISCOVERY,
		}
		mode := modes[rand.Intn(len(modes))]
		switch mode {
		case
			proto.GameMode_RANKED_DISCOVERY,
			proto.GameMode_CONQUEST_DISCOVERY:
			p.IsRandomDeck = true
		case proto.GameMode_CHALLENGE_CONSTRUCTED:
			p.SessionID = "10101"
		case proto.GameMode_CHALLENGE_DISCOVERY:
			p.SessionID = "20202"
			p.IsRandomDeck = true
		}
		p.Mode = mode
		return nil
	}
}

func WithRandomCards(n int) Option {
	return func(p *player.Player) error {
		cards := generateUniqueCards(n)
		return WithCards(cards...)(p)
	}
}

func getRandomRarity() player.Rarity {
	r := rand.Float32()
	switch {
	case r < 0.1:
		return player.Rarity_GOLD
	case r < 0.3:
		return player.Rarity_SILVER
	}
	return player.Rarity_BASE
}

func generateUniqueCards(n int) []uint64 {
	cards := map[uint64]bool{}
	pool := n * 3
	for len(cards) < n {
		cardID := uint64(1 + rand.Intn(pool))
		if cards[cardID] {
			continue
		}
		cards[cardID] = true
	}
	cardIDs := []uint64{}
	for cardID := range cards {
		cardIDs = append(cardIDs, cardID)
	}
	return cardIDs
}

func WithMatchProposalID(id string) Option {
	return func(p *player.Player) error {
		p.SetMatchProposalID(id)

		return nil
	}
}

func WithClientVersion(clientVersion string) Option {
	return func(p *player.Player) error {
		p.ClientVersionHash = clientVersion
		return nil
	}
}

func WithShadowBan(until time.Time) Option {
	return func(p *player.Player) error {
		b := true

		p.ShadowBanned = &b
		p.ShadowBanUntil = &until

		return nil
	}
}

func WithAddress(address proto.Hash) Option {
	return func(p *player.Player) error {
		p.PrivateSeed.Player = player.BinaryAddress(address.String())

		if p.Account != nil {
			p.Account.Address = address
		}

		return nil
	}
}
