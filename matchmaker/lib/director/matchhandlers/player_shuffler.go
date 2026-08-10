package matchhandlers

import (
	"math/rand"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_shuffler.go -package mock . PlayerShuffler
type PlayerShuffler interface {
	Shuffle([]*player.Player) []*player.Player
}

type playerShuffler struct {
}

func NewPlayerShuffler() *playerShuffler {
	return &playerShuffler{}
}

func (s *playerShuffler) Shuffle(players []*player.Player) []*player.Player {
	shuffled := append([]*player.Player{}, players...)

	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	return shuffled
}
