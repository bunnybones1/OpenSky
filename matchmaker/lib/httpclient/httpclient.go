package httpclient

import (
	"crypto/tls"
	"net/http"
	"time"
)

func New() *http.Client {
	return &http.Client{
		Timeout: 5 * time.Second,
	}
}

func NewWithInsecure(allowInsecure bool) *http.Client {
	client := New()
	tlsConfig := tls.Config{}

	if allowInsecure {
		tlsConfig.InsecureSkipVerify = true
	}

	client.Transport = &http.Transport{
		TLSClientConfig: &tlsConfig,
	}

	return client
}
