//go:build integration

package rpc_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/rpc"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestGetTwitchInfo(t *testing.T) {
	var twitchClient *mock.MockTwitchClient

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			twitchClient = mock.NewMockTwitchClient(ctrl)

			apiService := apitest.APIService()

			originalTwitchClient := apiService.RPC.TwitchClient

			apiService.RPC.TwitchClient = twitchClient

			t.Cleanup(func() {
				apiService.RPC.TwitchClient = originalTwitchClient
			})
		}
	}

	// Example from https://dev.twitch.tv/docs/api/reference#get-streams
	dataStreams := []byte(`
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
]`)

	// Example from https://dev.twitch.tv/docs/api/reference#get-videos
	dataVideos := []byte(`
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
]`)

	streamsAPIResponse := &rpc.TwitchAPIResponse{Data: dataStreams}
	videosAPIResponse := &rpc.TwitchAPIResponse{Data: dataVideos}

	ctx := context.Background()

	twitchClient.EXPECT().GetStreams(gomock.Any(), "20", "512913").Return(streamsAPIResponse, nil)
	twitchClient.EXPECT().GetVideos(gomock.Any(), "512913").Return(videosAPIResponse, nil)

	resp, err := apitest.Client().GetTwitchInfo(ctx)
	require.NoError(t, err)

	assert.Equal(t, 1, int(resp.StreamersOnline))
	assert.Equal(t, 1, int(resp.VodsAvailable))
	assert.Len(t, resp.Streams, 1)
	assert.Equal(t, "41375541868", resp.Streams[0].ID)
	assert.Equal(t, "459331509", resp.Streams[0].UserID)
	assert.Equal(t, "auronplay", resp.Streams[0].UserLogin)
	assert.Equal(t, "auronplay", resp.Streams[0].UserName)
	assert.Equal(t, "494131", resp.Streams[0].GameID)
	assert.Equal(t, "Little Nightmares", resp.Streams[0].GameName)
	assert.Equal(t, "live", resp.Streams[0].Type)
	assert.Equal(t, "hablamos y le damos a Little Nightmares 1", resp.Streams[0].Title)
	assert.Equal(t, 78365, int(resp.Streams[0].ViewerCount))
	assert.Equal(t, "2021-03-10T15:04:21Z", resp.Streams[0].StartedAt)
	assert.Equal(t, "es", resp.Streams[0].Language)
	assert.Equal(t, "https://static-cdn.jtvnw.net/previews-ttv/live_user_auronplay-{width}x{height}.jpg", resp.Streams[0].ThumbnailURL)
	assert.Len(t, resp.Streams[0].TagIDs, 1)
	assert.Equal(t, "d4bb9c58-2141-4881-bcdc-3fe0505457d1", resp.Streams[0].TagIDs[0])
	assert.False(t, resp.Streams[0].IsMature)

	// Returns the same cached data
	resp2, err := apitest.Client().GetTwitchInfo(ctx)
	require.NoError(t, err)

	assert.Equal(t, resp, resp2)
}

func TestGetDiscordInfo(t *testing.T) {
	var discordClient *mock.MockDiscordClient

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			discordClient = mock.NewMockDiscordClient(ctrl)

			apiService := apitest.APIService()

			originalDiscordClient := apiService.RPC.DiscordClient

			apiService.RPC.DiscordClient = discordClient

			t.Cleanup(func() {
				apiService.RPC.DiscordClient = originalDiscordClient
			})
		}
	}

	ctx := context.Background()

	apiResponse := &rpc.DiscordAPIResponse{
		UsersOnline:      10,
		InstantInviteURL: "abc",
	}

	discordClient.EXPECT().GetServerInfo(gomock.Any()).Return(apiResponse, nil)

	resp, err := apitest.Client().GetDiscordInfo(ctx)
	require.NoError(t, err)

	assert.Equal(t, 10, int(resp.UsersOnline))
	assert.Equal(t, "abc", resp.InstantInviteURL)

	// Returns the same cached data
	resp2, err := apitest.Client().GetDiscordInfo(ctx)
	require.NoError(t, err)

	assert.Equal(t, resp, resp2)
}
