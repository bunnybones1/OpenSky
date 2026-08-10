package pushnotification

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
)

// NullClient is a client implementing null object pattern.
type NullClient struct {
}

// NewNullClient instantiates a new NullClient.
func NewNullClient() *NullClient {
	return &NullClient{}
}

func (n NullClient) Send(ctx context.Context, hashes []proto.AccountID, s string) error {
	return nil
}
