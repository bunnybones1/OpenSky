//go:build integration

package apitest

import (
	"context"
	"fmt"
	"log"
	mrand "math/rand"
	"net"
	"net/http"
	"os"
	"path"
	"runtime"
	"strings"
	"time"

	seqAPI "github.com/0xsequence/go-sequence/api"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/seborama/govcr"

	"github.com/horizon-games/OpenSky/api"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	testSequence = false

	testConfig                = &config.Config{}
	testServerTimeout         = time.Second * 600 // Max time the test server is allowed to run.
	testServerStartupTimeout  = time.Second       // Max time to wait for the test server to start up.
	testClientResponseTimeout = time.Second * 5   // Max time a client is going to wait for the server to respond.

	apiService *api.API

	client proto.SkyWeaverAPI
)

func init() {
	mrand.Seed(time.Now().UnixNano())

	_, currentFile, _, _ := runtime.Caller(0)
	currentDir := path.Dir(currentFile)

	// Parse config
	err := config.NewFromFile(os.Getenv("CONFIG"), fmt.Sprintf("%s/../etc/opensky-api.test.conf", currentDir), testConfig)
	if err != nil {
		log.Fatal(err)
	}

	middleware.IsTTY = true

	// Test mode flag, if we should include sequence in our test-run
	testSequence = os.Getenv("TEST_SEQUENCE") != ""
	if !testSequence {
		// nullify the rewards wallet so app code doesn't use it when
		// sequence tests are disabled.
		testConfig.Wallet.PrivateMnemonic = ""
	}

	// Get next available port, and setup config
	{
		var listener net.Listener
		cfgPort := strings.Split(testConfig.Service.Listen, ":")
		if len(cfgPort) > 2 {
			log.Fatal("config error: RPC.Listen is invalid")
		}
		if len(cfgPort) == 2 {
			listener, err = net.Listen("tcp", ":"+cfgPort[1])
		} else {
			listener, err = net.Listen("tcp", ":0")
		}
		if err != nil {
			log.Fatal(err)
		}
		port := listener.Addr().(*net.TCPAddr).Port
		testConfig.Service.Listen = fmt.Sprintf("%s:%d", cfgPort[0], port)
		listener.Close()
		time.Sleep(time.Duration(250))
	}

	data.ActiveClasses = []proto.CardClass{
		proto.CardClass_AGY,
		proto.CardClass_HRT,
		proto.CardClass_STR,
		proto.CardClass_WIS,
		proto.CardClass_INT,
	}

	apiService, err = api.New(testConfig)
	if err != nil {
		log.Fatal(err)
	}

	vcr := govcr.NewVCR("sequence-api", &govcr.VCRConfig{
		DisableRecording: false,
	})
	apiService.RPC.SequenceAPI = seqAPI.NewAPIClient(testConfig.Sequence.APIURL, vcr.Client)

	go func() {
		ticker := time.NewTicker(testServerTimeout)
		defer ticker.Stop()

		errCh := make(chan error)

		go func() {
			errCh <- apiService.Start()
		}()

		for {
			select {
			case err := <-errCh:
				log.Fatal("api server: ", err)
			case <-ticker.C:
				apiService.Stop()
				log.Fatal("api server has been running for too long")
			}
		}
	}()

	client = proto.NewSkyWeaverAPIClient("http://"+testConfig.Service.Listen, &http.Client{
		Timeout: testClientResponseTimeout,
	})

	ticker := time.NewTicker(testServerStartupTimeout)
	start := time.Now()

	for {
		_, err := client.Ping(context.Background())
		if err == nil {
			break
		}

		select {
		case <-ticker.C:
			log.Fatalf("api server has failed to start within a reasonable time (giving up after waiting %v): %v", time.Since(start), err)
		default:
			continue
		}
	}

	TruncateAll()
}

func Client() proto.SkyWeaverAPI {
	return client
}

func APIService() *api.API {
	return apiService
}
