package discord_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/lib/discord"
	"github.com/horizon-games/OpenSky/api/lib/discord/mock"
)

func TestDiscordClient(t *testing.T) {
	ctrl := gomock.NewController(t)

	httpClient := mock.NewMockHTTPClient(ctrl)

	ctx := context.Background()

	t.Run("get server info", func(t *testing.T) {
		client := discord.NewClient(httpClient, "some-url/")

		httpClient.EXPECT().Do(gomock.Any()).DoAndReturn(func(req *http.Request) (*http.Response, error) {
			require.Equal(t, "some-url/444586810765475860/widget.json", req.URL.String())

			recorder := httptest.NewRecorder()
			_, err := recorder.WriteString(`
{
	"presence_count": 2,
	"instant_invite": "some-invite-url"
}
`)
			require.NoError(t, err)

			return recorder.Result(), nil
		})

		apiResponse, err := client.GetServerInfo(ctx)
		require.NoError(t, err)

		assert.Equal(t, 2, apiResponse.UsersOnline)
		assert.Equal(t, "some-invite-url", apiResponse.InstantInviteURL)
	})
}
