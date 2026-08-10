package player

import (
	"math/rand"
	"sort"

	"github.com/horizon-games/OpenSky/api/proto"
)

func GenerateRandomPrisms() []Prism {

	var orderedPrisms = []Prism{
		Prism(proto.CardClass_STR),
		Prism(proto.CardClass_HRT),
		Prism(proto.CardClass_AGY),
		Prism(proto.CardClass_INT),
		Prism(proto.CardClass_WIS),
	}

	size := 1
	if rand.Float32() > 0.2 {
		size = 2
	}

	indexes := make([]int, 0, size)
	taken := map[int]bool{}
	for len(indexes) < size {
		prism := rand.Intn(len(orderedPrisms))
		if !taken[prism] {
			indexes = append(indexes, prism)
			taken[prism] = true
		}
	}
	sort.Ints(indexes)

	prisms := []Prism{}
	for _, i := range indexes {
		prisms = append(prisms, orderedPrisms[i])
	}

	return prisms
}
