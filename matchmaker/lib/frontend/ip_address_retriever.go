package frontend

import (
	"fmt"
	"net"
	"net/http"
	"strings"

	"github.com/horizon-games/OpenSky/matchmaker/config"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/ip_address_retriever.go -package mock . IPAddressRetriever
type IPAddressRetriever interface {
	Retrieve(*http.Request) (string, error)
}

type ipAddressRetriever struct {
	serviceMode config.Mode
}

func NewIPAddressRetriever(cfg *config.Config) *ipAddressRetriever {
	return &ipAddressRetriever{
		serviceMode: cfg.Mode,
	}
}

func (r *ipAddressRetriever) Retrieve(req *http.Request) (string, error) {
	clientIP := req.Header.Get("true-client-ip")
	if clientIP != "" {
		return clientIP, nil
	}

	if strings.Contains(req.Header.Get("origin"), "localhost") {
		return "127.0.0.1", nil
	}

	if strings.Contains(req.Header.Get("origin"), "0xhorizon.net") {
		return "127.0.0.1", nil
	}

	if req.RemoteAddr != "" && r.serviceMode == config.DevelopmentMode {
		ip, _, err := net.SplitHostPort(req.RemoteAddr)
		if err == nil {
			return ip, nil
		}
	}

	return "", fmt.Errorf("unable to determine IP address")
}
