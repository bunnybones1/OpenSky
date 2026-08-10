package rpc

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
	"github.com/upper/db/v4"
)

func (s *Server) GetBanners(ctx context.Context) ([]*proto.Banner, error) {
	repo := rctx.DBContext(ctx)
	banners, err := repo.Banners().AllValidBanners()
	if err != nil {
		return nil, proto.WrapError(proto.ErrInternal, err, "failed to get banners")
	}
	return banners, nil
}

func (s *Server) GMListBanners(ctx context.Context) ([]*proto.Banner, error) {
	repo := rctx.DBContext(ctx)
	banners, err := repo.Banners().AllBanners()
	if err != nil {
		return nil, proto.WrapError(proto.ErrInternal, err, "failed to get banners")
	}
	return banners, nil
}

func (s *Server) GMAddBanner(ctx context.Context, bannersRequest *proto.BannersRequest) (bool, error) {

	if bannersRequest == nil {
		return false, proto.ErrorInvalidArgument("bannerRequest", "bannerRequest cannot be empty")
	}

	repo := rctx.DBContext(ctx)

	banner := &proto.Banner{
		Order:       bannersRequest.Order,
		Type:        bannersRequest.BannerType,
		Msg:         bannersRequest.Msg,
		Dismissable: bannersRequest.Dismissable,
		Link:        bannersRequest.Link,
		StartAt:     bannersRequest.StartAt,
		EndAt:       bannersRequest.EndAt,
		Color:       bannersRequest.Color,
	}

	_, err := repo.Banners().Insert(banner)
	if err != nil {
		return false, proto.WrapError(proto.ErrInternal, err, "failed to add banner")
	}
	return true, nil
}

func (s *Server) GMModifyBanner(ctx context.Context, banner *proto.Banner) (bool, error) {
	repo := rctx.DBContext(ctx)

	err := repo.Banners().Find(
		db.Cond{
			"id": banner.ID,
		},
	).Update(banner)

	if err != nil {
		return false, proto.WrapError(proto.ErrInternal, err, "failed to modify banner")
	}

	return true, nil
}

func (s *Server) GMRemoveBanner(ctx context.Context, id int64) (bool, error) {
	repo := rctx.DBContext(ctx)

	err := repo.Banners().Find(db.Cond{
		"id": id,
	}).Delete()

	if err != nil {
		return false, proto.WrapError(proto.ErrInternal, err, "failed to remove banner")
	}

	return true, nil
}
