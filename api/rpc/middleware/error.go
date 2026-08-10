package middleware

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	ErrUnauthorized   = proto.WrapError(proto.ErrUnauthenticated, nil, "unauthorized")
	ErrSessionExpired = proto.WrapError(proto.ErrPermissionDenied, nil, "session expired")
)

func middlewareError(w http.ResponseWriter, rpcErr proto.Error) {
	statusCode := proto.HTTPStatusFromErrorCode(rpcErr.Code())
	respBody, err := json.Marshal(rpcErr.Payload())
	if err != nil {
		panic(err.Error())
	}

	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json")

	if _, err := w.Write(respBody); err != nil {
		log.Err(err).Msg("write error response body")
	}
}
