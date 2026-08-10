package rpc

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

// Social media cached response keys.
const (
	TwitchInfoKey  = "twitch_info"
	TwitchTagsKey  = "twitch_tags"
	DiscordInfoKey = "discord_info"
)

// TwitchClient provides data from Twitch.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/twitch_client.go -package mock . TwitchClient
type TwitchClient interface {
	GetStreams(ctx context.Context, first, gameID string) (*TwitchAPIResponse, error)
	GetVideos(ctx context.Context, gameID string) (*TwitchAPIResponse, error)
}

// TwitchAPIResponse contains data of a response from Twitch.
type TwitchAPIResponse struct {
	Data json.RawMessage `json:"data"`
}

// DiscordClient provides data from Discord.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/discord_client.go -package mock . DiscordClient
type DiscordClient interface {
	GetServerInfo(context.Context) (*DiscordAPIResponse, error)
}

// DiscordAPIResponse contains decoded response from Discord.
type DiscordAPIResponse struct {
	UsersOnline      int    `json:"presence_count"`
	InstantInviteURL string `json:"instant_invite"`
}

func (s *Server) GetDiscordInfo(ctx context.Context) (*proto.DiscordInfoResponse, error) {
	oplog := rctx.Logger(ctx)

	resp := &proto.DiscordInfoResponse{}

	// check if response is in cache
	respBytes, err := s.getCachedResponse(ctx, DiscordInfoKey)
	if err == nil {
		err := json.Unmarshal(respBytes, resp)
		if err != nil {
			return resp, proto.WrapError(proto.ErrInternal, err, "json decode failed")
		}

		return resp, nil
	} else {
		oplog.Err(err)
	}

	discordInfo, err := s.DiscordClient.GetServerInfo(ctx)
	if err != nil {
		return nil, err
	}

	resp.UsersOnline = uint32(discordInfo.UsersOnline)
	resp.InstantInviteURL = discordInfo.InstantInviteURL

	respBytes, err = json.Marshal(resp)
	if err != nil {
		return resp, proto.WrapError(proto.ErrInternal, err, "json encode failed")
	}

	// cache response
	err = s.cacheResponse(ctx, DiscordInfoKey, respBytes)
	if err != nil {
		oplog.Err(err)
	}

	return resp, nil
}

func (s *Server) GetTwitchInfo(ctx context.Context) (*proto.TwitchInfoResponse, error) {
	oplog := rctx.Logger(ctx)

	resp := &proto.TwitchInfoResponse{}

	// check if response is in cache
	respBytes, err := s.getCachedResponse(ctx, TwitchInfoKey)
	if err == nil {
		err := json.Unmarshal(respBytes, resp)
		if err != nil {
			return resp, proto.WrapError(proto.ErrInternal, err, "json decode failed")
		}

		return resp, nil
	} else {
		oplog.Err(err)
	}

	// get streamers online
	{
		apiResponse, err := s.TwitchClient.GetStreams(ctx, "20", "512913")
		if err != nil {
			return resp, proto.WrapError(proto.ErrInternal, err, "twitch client get streams")
		}

		err = json.Unmarshal(apiResponse.Data, &resp.Streams)
		if err != nil {
			return resp, proto.WrapError(proto.ErrInternal, err, "json decode failed")
		}

		resp.StreamersOnline = uint32(len(resp.Streams))
	}

	// get vods (video on demand) available
	{
		apiResponse, err := s.TwitchClient.GetVideos(ctx, "512913")
		if err != nil {
			return resp, proto.WrapError(proto.ErrInternal, err, "twitch client get tags")
		}

		var vods []map[string]interface{}

		err = json.Unmarshal(apiResponse.Data, &vods)
		if err != nil {
			return resp, proto.WrapError(proto.ErrInternal, err, "json decode failed")
		}

		resp.VodsAvailable = uint32(len(vods))
	}

	respBytes, err = json.Marshal(resp)
	if err != nil {
		return resp, proto.WrapError(proto.ErrInternal, err, "json encode failed")
	}

	// cache response
	err = s.cacheResponse(ctx, TwitchInfoKey, respBytes)
	if err != nil {
		oplog.Err(err)
	}

	return resp, nil
}

func (s *Server) GetFeaturedStreamers(ctx context.Context) ([]*proto.TwitchFeaturedStreamer, error) {
	repo := rctx.DBContext(ctx)
	// get all streamers from database
	featuredStreamers, err := repo.TwitchFeaturedStreamers().AllFeaturedStreamers()
	if err != nil {
		return nil, proto.WrapError(proto.ErrInternal, err, "failed to get featured streamers")
	}

	return featuredStreamers, nil
}

func (s *Server) GMAddFeaturedStreamer(ctx context.Context, streamer *proto.TwitchFeaturedStreamer) (bool, error) {
	repo := rctx.DBContext(ctx)

	// add streamer to database
	if streamer.Username == "" {
		return false, proto.ErrorInvalidArgument("streamer.Username", "missing username")
	}

	_, err := repo.TwitchFeaturedStreamers().Insert(streamer)
	if err != nil {
		return false, proto.WrapError(proto.ErrInternal, err, "failed to add featured streamer")
	}

	return true, nil
}

func (s *Server) GMRemoveFeaturedStreamer(ctx context.Context, streamer *proto.TwitchFeaturedStreamer) (bool, error) {
	repo := rctx.DBContext(ctx)

	// remove streamer from database
	if streamer.Username == "" {
		return false, proto.ErrorInvalidArgument("streamer.Username", "missing username")
	}

	err := repo.TwitchFeaturedStreamers().Find(db.Cond{
		"username": streamer.Username,
	}).Delete()
	if err != nil {
		return false, proto.WrapError(proto.ErrInternal, err, "failed to remove featured streamer")
	}

	return true, nil
}

func (s *Server) getCachedResponse(ctx context.Context, key string) ([]byte, error) {
	// check if response is in cache
	cachedResponseBytes, _, err := s.CacheStore.Get(ctx, key)
	if err != nil {
		return nil, err
	}

	cachedSocialResponse := &cachedSocialResponse{}

	err = json.Unmarshal(cachedResponseBytes, cachedSocialResponse)
	if err != nil {
		return nil, errors.Errorf("error unmarshalling cached response: %s", err.Error())
	}

	unixTime, err := strconv.Atoi(cachedSocialResponse.Time)
	if err != nil {
		return nil, errors.Errorf("error converting timestamp to int: %s", err.Error())
	}

	if time.Since(time.Unix(int64(unixTime), 0)) > time.Second*60 {
		return nil, errors.Errorf("cached response is too old")
	}

	return cachedSocialResponse.Response, nil
}

func (s *Server) cacheResponse(ctx context.Context, key string, resp []byte) error {
	cachedSocialResponse := cachedSocialResponse{
		// store time, convert to string since json.Marshal doesn't support int and converts to float
		// which causes decimal precision issues
		Time:     strconv.Itoa(int(time.Now().Unix())),
		Response: resp,
	}
	// convert response to bytes and cache
	respBytes, err := json.Marshal(cachedSocialResponse)
	if err != nil {
		return errors.Errorf("error marshalling response: %s", err.Error())
	}
	// cache response
	err = s.CacheStore.SetEx(ctx, key, respBytes, time.Second*60)
	if err != nil {
		return errors.Errorf("error caching response: %s", err.Error())
	}

	return nil
}

type cachedSocialResponse struct {
	Time     string `json:"time"`
	Response []byte `json:"response"`
}
