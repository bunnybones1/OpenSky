package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/jwtauth/v5"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	flags        = flag.NewFlagSet("util-stress-api", flag.ExitOnError)
	fConfigFile  = flags.String("config", "", "path to config file")
	fRun         = flags.String("run", "", "Stress test to run")
	fNumRequests = flags.Int64("n", 200, "Number of requests to send")
	fConcurrency = flags.Int64("c", 20, "Number of parallel connections")

	cfg       *config.Config
	tokenAuth *jwtauth.JWTAuth
)

func main() {
	if err := flags.Parse(os.Args[1:]); err != nil {
		log.Fatal(fmt.Errorf("parse flags: %w", err))
	}

	if len(os.Args) < 2 {
		flags.Usage()
		return
	}
	if *fRun == "" {
		fmt.Println("Oops, you must pass -run flag.")
		return
	}

	// Config
	cfg = &config.Config{}
	err := config.NewFromFile(*fConfigFile, os.Getenv("CONFIG"), cfg)
	if err != nil {
		log.Fatal(err)
	}

	tokenAuth = jwtauth.New("HS256", []byte(cfg.Auth.JWTSecret), nil)
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}

	// Stress
	fmt.Println()
	fmt.Println("=> STRESS TEST:", *fRun)
	fmt.Println()

	switch *fRun {

	case "ping":
		stressPing()

	case "matchrecords":
		stressMatchRecords()

	default:
		fmt.Printf("Oops, the '%s' stress test doesn't exist.\n", *fRun)

	}

	fmt.Println()
}

func apiClient() proto.SkyWeaverAPI {
	scheme := "http"
	if cfg.SSL.Cert != "" {
		scheme = "https"
	}

	client := proto.NewSkyWeaverAPIClient(fmt.Sprintf("%s://%s", scheme, cfg.Service.Listen), &http.Client{
		// Timeout: testClientResponseTimeout,
	})

	return client
}

func report(numRequests uint64, elapsed int64) {
	reqPerSec := float64(numRequests) / float64(elapsed) * 1000

	fmt.Printf("\nDone. Sent %d total requests at rate of %.2f requests/sec with %d clients in %d ms\n", numRequests, reqPerSec, *fConcurrency, elapsed)
}

func randomData(numBytes int) []byte {
	rand.Seed(time.Now().UnixNano())
	charset := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	data := make([]byte, numBytes)
	for i := 0; i < numBytes; i++ {
		data[i] = charset[rand.Intn(len(charset))]
	}
	return data
}

func serviceTokenContext() context.Context {
	return authTokenContext(map[string]interface{}{"service": "x"})
}

func authTokenContext(claims map[string]interface{}) context.Context {
	jwtauth.SetExpiryIn(claims, time.Hour)

	_, tokenString, err := tokenAuth.Encode(claims)
	if err != nil {
		panic(err.Error())
	}

	ctx := context.Background()
	headers := http.Header{}
	headers.Set("Authorization", fmt.Sprintf("BEARER %s", tokenString))
	ctx, err = proto.WithHTTPRequestHeaders(ctx, headers)
	if err != nil {
		panic(err.Error())
	}

	return ctx
}
