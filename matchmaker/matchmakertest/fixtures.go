package matchmakertest

import (
	"github.com/google/uuid"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

var PlayerA = &player.Player{
	PrivateSeed: player.PrivateSeed{
		Player:     player.BinaryAddress("0x0000000000000000000000000000000000000001"),
		Subkey:     player.BinaryAddress("0x000000000000000000000000000000000000000A"),
		RandomSeed: [16]uint8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
		Prisms: []player.Prism{
			player.Prism(proto.CardClass_STR),
		},
	},
	PlayerSessionID:   uuid.New(),
	ClientVersionHash: "dev",
}

var PlayerB = &player.Player{
	PrivateSeed: player.PrivateSeed{
		Player:     player.BinaryAddress("0x0000000000000000000000000000000000000002"),
		Subkey:     player.BinaryAddress("0x000000000000000000000000000000000000000B"),
		RandomSeed: [16]uint8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
		Prisms: []player.Prism{
			player.Prism(proto.CardClass_STR),
		},
	},
	PlayerSessionID:   uuid.New(),
	ClientVersionHash: "dev",
}

var PlayerAppTest1 = &player.Player{
	PrivateSeed: player.PrivateSeed{
		Player:     player.BinaryAddress("0x0000000000000000000000000000000000000009"),
		Subkey:     player.BinaryAddress("0x0000000000000000000000000000000000000013"),
		RandomSeed: [16]uint8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
		Prisms: []player.Prism{
			player.Prism(proto.CardClass_STR),
		},
	},
	PlayerSessionID:   uuid.New(),
	ClientVersionHash: "dev",
}

var PlayerAppTest2 = &player.Player{
	PrivateSeed: player.PrivateSeed{
		Player:     player.BinaryAddress("0x0000000000000000000000000000000000000010"),
		Subkey:     player.BinaryAddress("0x0000000000000000000000000000000000000014"),
		RandomSeed: [16]uint8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
		Prisms: []player.Prism{
			player.Prism(proto.CardClass_STR),
		},
	},
	PlayerSessionID:   uuid.New(),
	ClientVersionHash: "dev",
}

var BotA = &player.Player{
	PrivateSeed: player.PrivateSeed{
		Player:     player.BinaryAddress("0x000000000000000000000000000000000000000A"),
		Subkey:     player.BinaryAddress("0x0000000000000000000000000000000000000100"),
		Signature:  []uint8{},
		Cards:      []uint64{},
		RandomSeed: [16]uint8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
		Prisms: []player.Prism{
			player.Prism(proto.CardClass_INT),
			player.Prism(proto.CardClass_HRT),
		},
	},
}

var BotB = &player.Player{
	PrivateSeed: player.PrivateSeed{
		Player:     player.BinaryAddress("0x000000000000000000000000000000000000000B"),
		Subkey:     player.BinaryAddress("0x0000000000000000000000000000000000000200"),
		Signature:  []uint8{},
		Cards:      []uint64{},
		RandomSeed: [16]uint8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
		Prisms: []player.Prism{
			player.Prism(proto.CardClass_INT),
			player.Prism(proto.CardClass_HRT),
		},
	},
}

var Cards = []proto.Card{
	{
		ID:   3013,
		Name: "Forest Hart",
	},
	{
		ID:   77,
		Name: "Titanic",
	},
	{
		ID:   20056,
		Name: "Sanctuary",
	},
	{
		ID:   24,
		Name: "Grimstone",
	},
	{
		ID:   1039,
		Name: "Rave",
	},
	{
		ID:   3084,
		Name: "Shade",
	},
	{
		ID:   20053,
		Name: "Barrier",
	},
	{
		ID:   1078,
		Name: "Flame Volley",
	},
	{
		ID:   4068,
		Name: "Krakus",
	},
	{
		ID:   1050,
		Name: "Backstab",
	},
	{
		ID:   2011,
		Name: "Prismata",
	},
	{
		ID:   4028,
		Name: "Ghost Duster",
	},
	{
		ID:   2093,
		Name: "Cygnus",
	},
	{
		ID:   4082,
		Name: "Rage Cage",
	},
	{
		ID:   101,
		Name: "Oni Smith",
	},
	{
		ID:   3063,
		Name: "Ancients Rise",
	},
	{
		ID:   4096,
		Name: "Germinate",
	},
	{
		ID:   2023,
		Name: "Spite & Malice",
	},
	{
		ID:   2057,
		Name: "Thought Leader",
	},
	{
		ID:   20049,
		Name: "Fate",
	},
}
