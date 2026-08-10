package bot_test

import (
	"encoding/json"
	"testing"

	"github.com/0xsequence/ethkit/ethwallet"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player/bot"

	"github.com/stretchr/testify/suite"
)

var botJSON = []byte(`
    {
        "id": "0xf2B339F5594242505c6Ef55F9DFD5Ac7914e6485",
        "sessionStartTime": "2022-02-11T20:53:28.153Z",
        "account": {
            "address": "0xf2B339F5594242505c6Ef55F9DFD5Ac7914e6485",
            "name": "ASTAR",
            "locale": "en",
            "warmUps": 0,
            "experience": 0,
            "level": 12,
            "levelUpXP": 120,
            "prisms": [
                "str",
                "hrt"
            ]
        },
        "deckClass": "STH",
        "deckString": "SWxSTH02",
        "mode": "PRACTICE_BOT",
        "privateSeed": {
            "player": [
                242,
                179,
                57,
                245,
                89,
                66,
                66,
                80,
                92,
                110,
                245,
                95,
                157,
                253,
                90,
                199,
                145,
                78,
                100,
                133
            ],
            "subkey": [
                112,
                229,
                53,
                57,
                42,
                107,
                208,
                220,
                179,
                200,
                228,
                143,
                10,
                116,
                54,
                143,
                237,
                211,
                246,
                130
            ],
            "signature": [
                231,
                44,
                199,
                133,
                1,
                76,
                94,
                226,
                18,
                13,
                238,
                232,
                161,
                142,
                55,
                213,
                253,
                79,
                135,
                127,
                56,
                224,
                39,
                26,
                127,
                50,
                228,
                85,
                66,
                12,
                86,
                80,
                54,
                21,
                218,
                25,
                176,
                169,
                194,
                213,
                246,
                145,
                82,
                55,
                140,
                23,
                103,
                77,
                183,
                215,
                57,
                9,
                27,
                77,
                44,
                170,
                135,
                230,
                27,
                9,
                124,
                129,
                160,
                112,
                28
            ],
            "randomSeed": [
                120,
                181,
                198,
                153,
                67,
                222,
                71,
                36,
                201,
                106,
                34,
                212,
                168,
                163,
                180,
                180
            ],
            "cardRarities": {
                "dataType": "Map",
                "values": []
            },
            "prisms": [
                "str",
                "hrt"
            ],
            "cards": []
        },
        "botSubkey": "0xc61bb132da9b7916debba7ccd096422757c55a7588e856da94905724cf3201d3"
    }
`)

type BotSuite struct {
	suite.Suite
}

func (s *BotSuite) TestCreateBotPlayer() {
	botPlayer, err := bot.New(proto.GameMode_PRACTICE_BOT, 22, 2)
	s.NoError(err)
	s.NotNil(botPlayer)

	s.Equal(1.0, botPlayer.BotDifficulty)
}

func (s *BotSuite) TestBotNameFromDifficulty() {
	s.Equal("Short Circuit", bot.NameFromDifficulty(0))
	s.Equal("Majordomo", bot.NameFromDifficulty(0.4))
	s.Equal("ASTAR", bot.NameFromDifficulty(0.5))
	s.Equal("Mecha Gygax", bot.NameFromDifficulty(1))
}

func (s *BotSuite) TestCalculateDifficulty() {
	playerWithLevel := func(level uint16) *player.Player {
		return &player.Player{
			Account: player.NewAccountWithItems(&proto.Account{Level: level}),
		}
	}

	// these values consider botMinDifficulty = 0.3
	// and botMaxDifficultyLevel = 30

	s.Equal(1.0, bot.Difficulty(nil))
	s.Equal(1.0, bot.Difficulty(&player.Player{Mode: proto.GameMode_WARM_UP}))
	s.Equal(0.3, bot.Difficulty(playerWithLevel(0)))
	s.Equal(0.34, bot.Difficulty(playerWithLevel(1)))
	s.Equal(0.95, bot.Difficulty(playerWithLevel(14)))
	s.Equal(1.0, bot.Difficulty(playerWithLevel(15)))
	s.Equal(1.0, bot.Difficulty(playerWithLevel(16)))
	s.Equal(1.0, bot.Difficulty(playerWithLevel(29)))
	s.Equal(1.0, bot.Difficulty(playerWithLevel(30)))
	s.Equal(1.0, bot.Difficulty(playerWithLevel(31)))
	s.Equal(1.0, bot.Difficulty(playerWithLevel(50)))
	s.Equal(1.0, bot.Difficulty(playerWithLevel(500)))
}

func (s *BotSuite) TestEncodeDecode() {
	decoded := player.Player{}

	err := json.Unmarshal(botJSON, &decoded)
	s.NoError(err)
	s.NotNil(decoded)

	encoded, err := json.Marshal(decoded)
	s.NoError(err)

	decoded2 := player.Player{}
	err = json.Unmarshal(encoded, &decoded2)
	s.NoError(err)
	s.NotNil(decoded2)

	s.Equal(decoded, decoded2)
}

func (s *BotSuite) TestContextFromKeys() {
	wallet, err := ethwallet.NewWalletFromMnemonic("buzz ridge actual discover fortune ball pigeon all spin card apology tree")
	s.NoError(err)
	s.NotNil(wallet)
	s.Equal("0xe45d6933368ae02da4885cba2d4c76422ce8143b97028d5d947464b2a4f3c4ed", wallet.PrivateKeyHex())

	subkey, err := ethwallet.NewWalletFromMnemonic("stool guess cupboard repeat fan life kangaroo price nest review snack thank")
	s.NoError(err)
	s.NotNil(subkey)
	s.Equal("0xe00f25f951896c4f3711300d194f882b3d6326ef1a46bf27513bc543f21a1408", subkey.PrivateKeyHex())

	botContext, err := bot.NewWithKeys(wallet, subkey)
	s.NoError(err)
	s.NotNil(botContext)

	s.Equal("0xf5ac53b64c0c5bdeada11458a533d3cf63eccae4", botContext.PrivateSeed.Player.String())
	s.Equal("0xbc9a1196b8675accb775626a9c9cca707740df56", botContext.PrivateSeed.Subkey.String())
	s.Equal("0xe00f25f951896c4f3711300d194f882b3d6326ef1a46bf27513bc543f21a1408", botContext.BotSubkey.String())

	s.Equal(
		"0x61e8bd856ebfe8006eea28b988b22b8ce0bc9866a669a814f3851b849af2356a6f1dbeafd1519f491c974d5669a8de5452c806f4bf85cd8367cf71310d5c32ae1b",
		hexutil.Encode(botContext.PrivateSeed.Signature),
	)
	s.NoError(err)
}

func TestBotSuite(t *testing.T) {
	suite.Run(t, new(BotSuite))
}
