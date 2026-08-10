package jobqueue_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestDeckRankUpdateRunner(t *testing.T) {
	var deckRankUpdater *mock.MockDeckRankUpdater

	var task *data.Task

	var matchID uint64

	season := data.CurrentSeason()

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			deckRankUpdater = mock.NewMockDeckRankUpdater(ctrl)
		}

		// Matches
		{
			startedAt := data.TimeNowUTC().Add(-10 * time.Second)
			match := &data.Match{Match: &proto.Match{
				Player1ID:             apitest.RandomAccountID(),
				Player2ID:             apitest.RandomAccountID(),
				InitPlayer1DeckString: "STR",
				Player1DeckString:     "STR",
				InitPlayer2DeckString: "STR",
				Player2DeckString:     "STR",
				Status:                proto.MatchStatus_COMPLETED,
				StartedAt:             &startedAt,
				EndedAt:               data.TimeNowUTCPtr(),
			}}

			err := data.DB.Save(match)
			require.NoError(t, err)

			matchID = match.ID
		}

		// Task
		{
			taskPayload := jobqueue.DeckRankUpdateTask{
				MatchID: matchID,
				Season:  season,
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Status:    proto.TaskStatus_PENDING,
					Payload:   payloadJSON,
					CreatedAt: data.TimeNowUTCPtr(),
					RunAt:     data.TimeNowUTCPtr(),
				},
			}
		}
	}

	runner := jobqueue.NewDeckRankUpdateRunner(deckRankUpdater)

	deckRankUpdater.EXPECT().UpdateFromMatch(data.DB, gomock.Any(), season).
		DoAndReturn(func(_ db.Session, match *data.Match, _ uint16) error {
			assert.Equal(t, matchID, match.ID)

			return nil
		})

	err := runner.RunTasks(context.Background(), data.DB, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)
}
