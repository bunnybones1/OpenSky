package events_test

import (
	"bytes"
	"encoding/gob"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
)

func TestGobEncodeDecodeMessages(t *testing.T) {
	messages := []events.Event{
		events.EventAcceptedMessage{},
		events.EventAcceptedMessage{
			PlayerID: matchmakertest.PlayerA.Address(),
		},
		events.EventDeclinedMessage{},
		events.EventDeclinedMessage{
			PlayerID: matchmakertest.PlayerA.Address(),
		},
		events.EventEvictedMessage{},
		events.EventEvictedMessage{
			Error: events.NewError("a"),
		},
		events.EventFoundMessage{},
		events.EventFoundMessage{
			PlayerID:   matchmakertest.PlayerA.Address(),
			OpponentID: matchmakertest.PlayerB.Address(),
		},
		events.EventMadeMessage{
			ServerAddress: "A",
			Mode:          proto.GameMode_RANKED_CONSTRUCTED,
		},
	}

	for _, message := range messages {
		var payload bytes.Buffer
		enc := gob.NewEncoder(&payload)
		err := enc.Encode(&message)
		assert.NoError(t, err)
		assert.NotNil(t, payload.Bytes())

		var ev events.Event
		encoded := payload.Bytes()
		dec := gob.NewDecoder(bytes.NewBuffer(encoded))
		err = dec.Decode(&ev)
		assert.NoError(t, err)
		assert.NotEmpty(t, ev.Type())

		assert.Equal(t, message.Type(), ev.Type())
		assert.Equal(t, message, ev)
	}
}
