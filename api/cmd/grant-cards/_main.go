package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/jwtauth/v5"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/cardcontract"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	flags      = flag.NewFlagSet("cards", flag.ExitOnError)
	address    = flags.String("address", "", "account address to send cards to")
	prism      = flags.String("prism", "all", "which prism to send")
	singleMint = flags.Bool("single", false, "use Mint instead of MintBatch")
	updateOnly = flags.Bool("update", false, "don't mint, update balances only")

	configFile = flags.String("config", "", "path to config file")

	big1 = big.NewInt(1)
)

func main() {
	flags.Parse(os.Args[1:])

	cfg := &config.Config{}
	err := config.NewFromFile(*configFile, os.Getenv("CONFIG"), cfg)
	if err != nil {
		log.Fatal(err)
	}
	config.Instance = cfg

	err = cardcontract.SetupContract()
	if err != nil {
		log.Fatalf("failed to initialize card contract")
	}

	// Database
	if _, err := data.NewDBSession(cfg.DB); err != nil {
		log.Fatalf("failed to connect to main DB %v", err)
	}
	err = data.DB.Ping()
	if err != nil {
		log.Fatalf("failed to connect to main DB %v", err)
	}

	// Cards index
	if err := data.CardIndex.Sync(); err != nil {
		log.Fatalf("failed to sync cards index from the DB %v", err)
	}

	if address == nil || len(*address) != 42 || (*address)[0:2] != "0x" {
		log.Fatal("invalid address")
	}

	addr := proto.HashFromString(*address)

	var cards []data.Card

	switch strings.ToLower(*prism) {
	case "all", "":
		cards = data.CardIndex.AllCards()

	case "agy", "agility":
		cards = data.CardIndex.CardsByClasses(proto.CardClass_AGY)

	case "hrt", "heart":
		cards = data.CardIndex.CardsByClasses(proto.CardClass_HRT)

	case "int", "intelect":
		cards = data.CardIndex.CardsByClasses(proto.CardClass_INT)

	case "str", "strength":
		cards = data.CardIndex.CardsByClasses(proto.CardClass_STR)

	case "wis", "wisdom":
		cards = data.CardIndex.CardsByClasses(proto.CardClass_WIS)

	default:
		log.Fatal("invalid prism")
	}

	txnHashes := []proto.Hash{}

	if updateOnly == nil || *updateOnly == false {
		if singleMint != nil && *singleMint == true {
			for _, card := range cards {
				tx, err := cardcontract.Mint(addr, big.NewInt(int64(card.ID)), big1)
				if err != nil {
					log.Fatalf("minting of %s (card id: %d) failed with %v", card.Name, card.ID, err)
				}
				log.Printf("Minted %s - tx %v", card.Name, tx.Hash())
				txnHashes = append(txnHashes, proto.HashFromString(tx.Hash().Hex()))
			}
		} else {
			ids := make([]*big.Int, len(cards))
			amounts := make([]*big.Int, len(cards))

			for i, card := range cards {
				ids[i] = big.NewInt(int64(card.ID))
				amounts[i] = big.NewInt(1)
			}

			tx, err := cardcontract.BatchMint(addr, ids, amounts)
			if err != nil {
				log.Fatalf("minting of %d cards failed with %v", len(cards), err)
			}
			log.Printf("minted %d cards - tx %v", len(cards), tx.Hash().Hex())
			txnHashes = append(txnHashes, proto.HashFromString(tx.Hash().Hex()))
		}
	}

	apiClient := proto.NewSkyWeaverAPIClient(cfg.ApiAddr, http.DefaultClient)
	apiReq := &proto.BalanceSyncRequest{
		AccountAddress: addr,
		CheckTxnHashes: txnHashes,
	}

	for i := 0; i < 60; i++ {
		time.Sleep(10 * time.Second)

		_, err := apiClient.InternalForceBalanceSync(serviceTokenContext(), apiReq)
		if err == nil {
			break
		}
		log.Printf("checking minting status, try %d of 60, current error/status: %v\n", i+1, err)
	}
}

func serviceTokenContext() context.Context {
	return authTokenContext(map[string]interface{}{"service": "x"})
}

func authTokenContext(claims map[string]interface{}) context.Context {
	jwtauth.SetExpiryIn(claims, time.Hour)
	tokenAuth := jwtauth.New("HS256", []byte(config.Instance.Auth.JWTSecret), nil)

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
