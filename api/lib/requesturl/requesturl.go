package requesturl

import (
	"fmt"
	"net/http"
	"strings"
)

var forceTLS bool

func ForceTLS() {
	forceTLS = true
}

func HostURL(r *http.Request) string {
	scheme := RequestScheme(r)
	host := RequestHost(r)

	return fmt.Sprintf("%s://%s", scheme, host)
}

func RequestHost(r *http.Request) string {
	// not standard, but most popular
	host := r.Header.Get("X-Forwarded-Host")
	if host != "" {
		return host
	}

	// RFC 7239
	host = r.Header.Get("Forwarded")
	_, _, host = parseForwarded(host)
	if host != "" {
		return host
	}

	// if all else fails fall back to request host
	return r.Host
}

func ForceURLScheme(URL string) string {
	if strings.HasPrefix(URL, "//") {
		// Any scheme, eg. "//example.com/file.png". Force http.
		return "http:" + URL
	}
	if !strings.Contains(URL, "://") {
		// Missing scheme, eg. "example.com/file.png". Force http.
		return "http://" + URL
	}
	return URL
}

func RequestScheme(r *http.Request) string {
	// running tls terminated by Go
	if forceTLS {
		return "https"
	}

	// X-Forwarded-Proto is being overwritten somewhere in the chain, Cf-Visitor returns back the correct scheme
	if r.Header.Get("Cf-Visitor") != "" {
		if strings.Index(r.Header.Get("Cf-Visitor"), "https") > 0 {
			return "https"
		} else if strings.Index(r.Header.Get("Cf-Visitor"), "http") > 0 {
			return "http"
		}
	}

	// not standard, but most popular
	if scheme := r.Header.Get("X-Forwarded-Proto"); validProto(scheme) {
		return scheme
	}

	// RFC 7239
	scheme := r.Header.Get("Forwarded")
	if _, forwardedScheme, _ := parseForwarded(scheme); validProto(forwardedScheme) {
		return forwardedScheme
	}

	if r.Header.Get("X-Edge-Ssl") != "" {
		return "https"
	}

	// will always be false with goji/graceful: https://github.com/zenazn/goji/issues/178#issuecomment-182571146
	if r.TLS != nil {
		return "https"
	}

	// if all else fails default to safe http
	return "http"
}

func parseForwarded(forwarded string) (addr, proto, host string) {
	if forwarded == "" {
		return
	}
	for _, forwardedPair := range strings.Split(forwarded, ";") {
		if tv := strings.SplitN(forwardedPair, "=", 2); len(tv) == 2 {
			token, value := tv[0], tv[1]
			token = strings.TrimSpace(token)
			value = strings.TrimSpace(strings.Trim(value, `"`))
			switch strings.ToLower(token) {
			case "for":
				addr = value

			case "proto":
				proto = value

			case "host":
				host = value
			}

		}
	}
	return
}

func validProto(p string) bool {
	p = strings.ToLower(p)
	return p == "http" || p == "https"
}
