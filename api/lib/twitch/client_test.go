package twitch_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/lib/twitch"
	"github.com/horizon-games/OpenSky/api/lib/twitch/mock"
)

func TestTwitchClient(t *testing.T) {
	ctrl := gomock.NewController(t)

	httpClient := mock.NewMockHTTPClient(ctrl)
	clientID := "abc"

	ctx := context.Background()

	t.Run("get streams", func(t *testing.T) {
		client := twitch.NewClient(httpClient, clientID)

		expectGetTokenCall(t, httpClient)

		httpClient.EXPECT().Do(gomock.Any()).DoAndReturn(func(req *http.Request) (*http.Response, error) {
			require.Equal(t, "https://api.twitch.tv/helix/streams?first=10&game_id=123", req.URL.String())
			require.Equal(t, clientID, req.Header.Get("Client-ID"))
			require.Equal(t, "Bearer aaa", req.Header.Get("Authorization"))

			recorder := httptest.NewRecorder()
			// Example from https://dev.twitch.tv/docs/api/reference#get-streams
			_, err := recorder.WriteString(`
{
  "data": [
    {
      "id": "41375541868",
      "user_id": "459331509",
      "user_login": "auronplay",
      "user_name": "auronplay",
      "game_id": "494131",
      "game_name": "Little Nightmares",
      "type": "live",
      "title": "hablamos y le damos a Little Nightmares 1",
      "viewer_count": 78365,
      "started_at": "2021-03-10T15:04:21Z",
      "language": "es",
      "thumbnail_url": "https://static-cdn.jtvnw.net/previews-ttv/live_user_auronplay-{width}x{height}.jpg",
      "tag_ids": [
        "d4bb9c58-2141-4881-bcdc-3fe0505457d1"
      ],
      "is_mature": false
    }
  ],
  "pagination": {
    "cursor": "eyJiIjp7IkN1cnNvciI6ImV5SnpJam8zT0RNMk5TNDBORFF4TlRjMU1UY3hOU3dpWkNJNlptRnNjMlVzSW5RaU9uUnlkV1Y5In0sImEiOnsiQ3Vyc29yIjoiZXlKeklqb3hOVGs0TkM0MU56RXhNekExTVRZNU1ESXNJbVFpT21aaGJITmxMQ0owSWpwMGNuVmxmUT09In19"
  }
}
`)
			require.NoError(t, err)

			return recorder.Result(), nil
		})

		apiResponse, err := client.GetStreams(ctx, "10", "123")
		require.NoError(t, err)

		expectedData := `
[
    {
      "id": "41375541868",
      "user_id": "459331509",
      "user_login": "auronplay",
      "user_name": "auronplay",
      "game_id": "494131",
      "game_name": "Little Nightmares",
      "type": "live",
      "title": "hablamos y le damos a Little Nightmares 1",
      "viewer_count": 78365,
      "started_at": "2021-03-10T15:04:21Z",
      "language": "es",
      "thumbnail_url": "https://static-cdn.jtvnw.net/previews-ttv/live_user_auronplay-{width}x{height}.jpg",
      "tag_ids": [
        "d4bb9c58-2141-4881-bcdc-3fe0505457d1"
      ],
      "is_mature": false
    }
]`

		assert.JSONEq(t, expectedData, string(apiResponse.Data))
	})

	t.Run("get videos", func(t *testing.T) {
		client := twitch.NewClient(httpClient, clientID)

		expectGetTokenCall(t, httpClient)

		httpClient.EXPECT().Do(gomock.Any()).DoAndReturn(func(req *http.Request) (*http.Response, error) {
			require.Equal(t, "https://api.twitch.tv/helix/videos?game_id=123", req.URL.String())
			require.Equal(t, clientID, req.Header.Get("Client-ID"))
			require.Equal(t, "Bearer aaa", req.Header.Get("Authorization"))

			recorder := httptest.NewRecorder()
			// Example from https://dev.twitch.tv/docs/api/reference#get-videos
			_, err := recorder.WriteString(`
{
  "data": [
    {
      "id": "335921245",
      "stream_id": null,
      "user_id": "141981764",
      "user_login": "twitchdev",
      "user_name": "TwitchDev",
      "title": "Twitch Developers 101",
      "description": "Welcome to Twitch development! Here is a quick overview of our products and information to help you get started.",
      "created_at": "2018-11-14T21:30:18Z",
      "published_at": "2018-11-14T22:04:30Z",
      "url": "https://www.twitch.tv/videos/335921245",
      "thumbnail_url": "https://static-cdn.jtvnw.net/cf_vods/d2nvs31859zcd8/twitchdev/335921245/ce0f3a7f-57a3-4152-bc06-0c6610189fb3/thumb/index-0000000000-%{width}x%{height}.jpg",
      "viewable": "public",
      "view_count": 1863062,
      "language": "en",
      "type": "upload",
      "duration": "3m21s",
      "muted_segments": [
        {
          "duration": 30,
          "offset": 120
        }
      ]
    }
  ],
  "pagination": {}
}
`)
			require.NoError(t, err)

			return recorder.Result(), nil
		})

		apiResponse, err := client.GetVideos(ctx, "123")
		require.NoError(t, err)

		expectedData := `
[
	{
		"id": "335921245",
		"stream_id": null,
		"user_id": "141981764",
		"user_login": "twitchdev",
		"user_name": "TwitchDev",
		"title": "Twitch Developers 101",
		"description": "Welcome to Twitch development! Here is a quick overview of our products and information to help you get started.",
		"created_at": "2018-11-14T21:30:18Z",
		"published_at": "2018-11-14T22:04:30Z",
		"url": "https://www.twitch.tv/videos/335921245",
		"thumbnail_url": "https://static-cdn.jtvnw.net/cf_vods/d2nvs31859zcd8/twitchdev/335921245/ce0f3a7f-57a3-4152-bc06-0c6610189fb3/thumb/index-0000000000-%{width}x%{height}.jpg",
		"viewable": "public",
		"view_count": 1863062,
		"language": "en",
		"type": "upload",
		"duration": "3m21s",
		"muted_segments": [
			{
				"duration": 30,
				"offset": 120
			}
		]
	}
]`

		assert.JSONEq(t, expectedData, string(apiResponse.Data))
	})
}

func expectGetTokenCall(t *testing.T, mock *mock.MockHTTPClient) {
	mock.EXPECT().Do(gomock.Any()).DoAndReturn(func(req *http.Request) (*http.Response, error) {
		require.Equal(t, "https://twitch-access-token.skyweaver.net", req.URL.String())

		recorder := httptest.NewRecorder()
		_, err := recorder.WriteString(`
{
	"access_token": "aaa",
	"expires_in": 4740407,
	"token_type": "bearer"
}
`)
		require.NoError(t, err)

		return recorder.Result(), nil
	})
}
