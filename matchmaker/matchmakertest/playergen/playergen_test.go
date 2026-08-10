package playergen

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type PlayergenSuite struct {
	suite.Suite
}

func (s *PlayergenSuite) TestNewPlayers() {
	{
		p := MustNew()
		s.NotNil(p)

		s.Equal("127.0.0.1", p.IPAddress)
	}

	{
		p := MustNew(WithIPAddress("192.168.1.1"))
		s.NotNil(p)

		s.Equal("192.168.1.1", p.IPAddress)
	}

	{
		p := MustNew(
			WithMode(proto.GameMode_RANKED_CONSTRUCTED),
			WithScore(5),
			WithRank(proto.PlayerRank_WANDERER),
			WithConquestWins(7),
			WithInitTimestamp(time.Now().Add(time.Hour*-1)),
		)
		s.NotNil(p)

		s.Equal(int32(5), p.Score())
		s.Equal(proto.PlayerRank_WANDERER, p.Rank())
		s.Equal(7, p.CurrentConquestWins())
		s.Greater(p.WaitTime(), time.Hour)
	}

	{
		p := MustNew(
			WithMode(proto.GameMode_RANKED_CONSTRUCTED),
			WithRP(1210),
			WithR(1223),
			WithRank(proto.PlayerRank_WANDERER),
			WithConquestWins(7),
			WithInitTimestamp(time.Now().Add(time.Hour*-1)),
		)
		s.NotNil(p)

		s.Equal(int32(0), p.Score())
		s.Equal(proto.PlayerRank_WANDERER, p.Rank())
		s.Equal(7, p.CurrentConquestWins())
		s.Equal(int32(1210), p.Ranking().RP)
		s.Equal(float64(1223.0), p.Ranking().R)
		s.Greater(p.WaitTime(), time.Hour)
	}

	{
		prisms := []player.Prism{
			player.Prism(proto.CardClass_STR),
			player.Prism(proto.CardClass_AGY),
		}

		p := MustNew(
			WithPrisms(prisms...),
		)
		s.NotNil(p)

		s.Equal(prisms, p.PrivateSeed.Prisms)
		s.Equal(prisms, p.Account.Prisms)

		s.Equal(proto.DeckClass_STA, p.DeckClass)
	}

	{
		prisms := []player.Prism{
			player.Prism(proto.CardClass_STR),
			player.Prism(proto.CardClass_INT),
		}

		p := MustNew(
			WithPrisms(prisms...),
		)
		s.NotNil(p)

		s.Equal(prisms, p.PrivateSeed.Prisms)
		s.Equal(prisms, p.Account.Prisms)

		s.Equal(proto.DeckClass_STI, p.DeckClass)
	}

	{
		p := MustNew(
			WithRandomPrisms(),
			WithRandomCards(20),
		)
		s.NotNil(p)

		s.NotZero(len(p.PrivateSeed.Prisms))
		s.Equal(20, len(p.Account.Cards))
		s.Equal(20, len(p.PrivateSeed.Cards))
		s.NotNil(p.DeckString)
	}

	{
		p := MustNew(
			WithRandomGameMode(),
		)
		s.NotNil(p)
	}
}

func TestPlayergenSuite(t *testing.T) {
	suite.Run(t, new(PlayergenSuite))
}
