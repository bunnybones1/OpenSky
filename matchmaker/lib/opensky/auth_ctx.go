package opensky

import (
	"context"
	"fmt"
	"net/http"

	"github.com/horizon-games/OpenSky/api/proto"
)

func AuthHeaderContext(jwtToken string, ctx context.Context) context.Context {
	headers := http.Header{}
	headers.Set("Authorization", fmt.Sprintf("BEARER %s", jwtToken))

	ctx, err := proto.WithHTTPRequestHeaders(ctx, headers)
	if err != nil {
		panic(err.Error())
	}

	return ctx
}
