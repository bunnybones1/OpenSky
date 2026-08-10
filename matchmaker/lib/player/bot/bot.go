package bot

import (
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/0xsequence/ethkit/ethwallet"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type curatedDeck struct {
	deckstring  string
	class       proto.DeckClass
	prisms      []player.Prism
	cards       []uint64
	heroAbility *string
	minLevel    uint16
	maxLevel    uint16
}

const (
	botMaxDifficultyLevel = 15.0
	botMinDifficulty      = 0.3
)

var heroAbility = []string{"25000", "25001", "25002", "25003", "25004"}

var curatedDecks = []curatedDeck{
	curatedDeck{ // Ada
		deckstring:  data.StarterDeck_STR,
		minLevel:    0,
		maxLevel:    65535,
		class:       proto.DeckClass_STR,
		heroAbility: &heroAbility[0],
		prisms: []player.Prism{
			player.Prism(proto.CardClass_STR),
		},
	},
	curatedDeck{ // Samya
		deckstring:  data.StarterDeck_AGI,
		minLevel:    6,
		maxLevel:    65535,
		class:       proto.DeckClass_AGY,
		heroAbility: &heroAbility[1],
		prisms: []player.Prism{
			player.Prism(proto.CardClass_AGY),
		},
	},
	curatedDeck{ // Lotus
		deckstring:  data.StarterDeck_WIS,
		minLevel:    11,
		maxLevel:    65535,
		class:       proto.DeckClass_WIS,
		heroAbility: &heroAbility[4],
		prisms: []player.Prism{
			player.Prism(proto.CardClass_WIS),
		},
	},
	curatedDeck{ // Bouran
		deckstring:  data.StarterDeck_HRT,
		minLevel:    16,
		maxLevel:    65535,
		class:       proto.DeckClass_HRT,
		heroAbility: &heroAbility[2],
		prisms: []player.Prism{
			player.Prism(proto.CardClass_HRT),
		},
	},
	curatedDeck{ // Ari
		deckstring:  data.StarterDeck_INT,
		minLevel:    21,
		maxLevel:    65535,
		class:       proto.DeckClass_INT,
		heroAbility: &heroAbility[3],
		prisms: []player.Prism{
			player.Prism(proto.CardClass_INT),
		},
	},
}

func init() {
	for i, deck := range curatedDecks {
		cardIDs, _, _, err := deckstring.Decode(deck.deckstring)
		if err != nil {
			continue
		}

		curatedDecks[i].cards = append(curatedDecks[i].cards, cardIDs...)
	}
}

func Difficulty(p *player.Player) float64 {
	if p == nil || p.Mode == proto.GameMode_WARM_UP {
		return 1
	}

	playerLevel := math.Min(botMaxDifficultyLevel, float64(p.Account.Level))

	botDifficultyIncreasePerLevel := (1.0 - botMinDifficulty) / botMaxDifficultyLevel

	botDifficulty := botMinDifficulty + playerLevel*botDifficultyIncreasePerLevel

	return math.Floor(botDifficulty*100) / 100 // 2 decimals max
}

func NewWithKeys(wallet, subkey *ethwallet.Wallet) (*player.Player, error) {
	privateSeed, err := player.NewPrivateSeedWithKeys(wallet, subkey)
	if err != nil {
		return nil, fmt.Errorf("NewPrivateSeedWithKeys: %w", err)
	}

	p := player.Player{PrivateSeed: *privateSeed}

	botSubkey := proto.Hash(subkey.PrivateKeyHex())
	p.BotSubkey = &botSubkey

	return &p, nil
}

func New(mode proto.GameMode, playerLevel uint16, difficulty float64) (*player.Player, error) {
	wallet, err := ethwallet.NewWalletFromRandomEntropy()
	if err != nil {
		return nil, fmt.Errorf("NewWalletFromRandomEntropy: %w", err)
	}

	subkey, err := ethwallet.NewWalletFromRandomEntropy()
	if err != nil {
		return nil, fmt.Errorf("NewWalletFromRandomEntropy: %w", err)
	}

	p, err := NewWithKeys(wallet, subkey)
	if err != nil {
		return nil, err
	}

	deckClass, deckString, prisms, cards, heroAbility := getBotDeck(playerLevel)

	createdAt := time.Date(2020, time.January, 1, 0, 0, 0, 0, time.UTC)

	difficulty = math.Min(1.0, math.Max(botMinDifficulty, difficulty))
	name := NameFromDifficulty(difficulty)

	sessionStartTime := time.Now()

	account := player.NewAccountWithItems(&proto.Account{
		Address:   proto.Hash(wallet.Address().Hex()),
		Name:      name,
		Locale:    "en",
		WarmUps:   0,
		CreatedAt: &createdAt,
		UpdatedAt: &createdAt,
		Level:     12,
		LevelUpXP: 120,
	})
	account.Prisms = prisms

	p.SessionStartTime = &sessionStartTime
	p.DeckClass = deckClass
	p.DeckString = &deckString
	p.Account = account
	p.PrivateSeed.Prisms = prisms
	p.PrivateSeed.Cards = cards
	p.PrivateSeed.HeroAbility = heroAbility
	p.Mode = mode
	p.BotDifficulty = difficulty

	return p, nil
}

var names = []string{
	"Short Circuit", // Reference to movie of same name - Johnny 5
	"Beta",          // Robot from the Last Star Fighter
	"Majordomo",     // Play on domo arigato Mr. Roboto
	"ASTAR",         // from planet danger psa
	"Largefuse",     // Bigweld from Robots
	"Mecha Gygax",   // Gary Gygax - creator of DND
}

func NameFromDifficulty(difficulty float64) string {
	return names[int(math.Round(difficulty*float64(len(names)-1)))]
}

func getBotDeck(playerLevel uint16) (proto.DeckClass, string, []player.Prism, []uint64, *string) {
	deckpool := make([]*curatedDeck, 0, len(curatedDecks))

	for i := range curatedDecks {
		if curatedDecks[i].minLevel <= playerLevel && curatedDecks[i].maxLevel >= playerLevel {
			deckpool = append(deckpool, &curatedDecks[i])
		}
	}
	selectedDeck := deckpool[0]
	if len(deckpool) > 1 {
		selectedDeck = deckpool[rand.Intn(len(deckpool))]
	}

	return selectedDeck.class, selectedDeck.deckstring, selectedDeck.prisms, selectedDeck.cards, selectedDeck.heroAbility
}
