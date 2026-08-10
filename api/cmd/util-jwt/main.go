package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/pkg/errors"
)

func newFromFile(file string, env string, config interface{}) error {
	if file == "" {
		file = env
	}

	_, err := os.Stat(file)
	if os.IsNotExist(err) {
		return errors.Wrap(err, "failed to load config file")
	}

	if _, err := toml.DecodeFile(file, config); err != nil {
		return errors.Wrap(err, "failed to parse config file")
	}

	return nil
}

type Config struct {
	Auth Auth `toml:"auth"`
}

type Auth struct {
	JWTSecret string `toml:"jwt_secret"`
}

var (
	flags      = flag.NewFlagSet("jwt", flag.ExitOnError)
	configFile = flags.String("config", "", "path to config file")
	decode     = flags.String("decode", "", "JWT token to decode and print claims")
	account    = flags.String("account", "", "account wallet address")
	service    = flags.String("service", "", "service id")
)

var services = []string{
	"game-server",
	"opensky-api",
}

func main() {
	if err := flags.Parse(os.Args[1:]); err != nil {
		log.Fatal(fmt.Errorf("parse flags: %w", err))
	}

	if len(os.Args) == 1 {
		fmt.Println(usage)
		os.Exit(1)
	}

	// Parse config file.
	cfg := &Config{}
	err := newFromFile(*configFile, os.Getenv("CONFIG"), cfg)
	if err != nil {
		log.Fatal(err)
	}

	// Check flags
	*service = strings.ToLower(*service)
	if *service != "" && !stringExists(*service, services) {
		log.Fatalf("Invalid service flag '%s', support options: %v", *service, services)
	}

	// Decode given JWT token.
	if *decode != "" {
		token, err := jwt.Parse([]byte(*decode), jwt.WithKey(jwa.HS256, []byte(cfg.Auth.JWTSecret)))
		if err != nil {
			log.Fatal(err)
		}
		if err := jwt.Validate(token); err != nil {
			log.Fatal(err)
		}

		claims, _ := token.AsMap(context.Background())
		fmt.Println()
		for k, v := range claims {
			fmt.Printf("%v: %+v\n", k, v)
		}

		return
	}

	// Encode new JWT token.
	token := jwt.New()
	if *account != "" {
		if err := token.Set("account", *account); err != nil {
			log.Fatal(fmt.Errorf("set account value to the token: %w", err))
		}
	}
	if *service != "" && *service != "web" {
		if err := token.Set("service", *service); err != nil {
			log.Fatal(fmt.Errorf("set service value to the token: %w", err))
		}
	}
	tokenPayload, err := jwt.Sign(token, jwt.WithKey(jwa.HS256, []byte(cfg.Auth.JWTSecret)))
	if err != nil {
		log.Fatal(err)
	}
	tokenStr := string(tokenPayload)

	if _, err := fmt.Fprintln(os.Stderr); err != nil {
		log.Fatal(fmt.Errorf("print std error: %w", err))
	}

	fmt.Println(tokenStr)

	claims, _ := token.AsMap(context.Background())

	if _, err := fmt.Fprintf(os.Stderr, "\nClaims: %#v\n", claims); err != nil {
		log.Fatal(fmt.Errorf("print std error: %w", err))
	}
}

func stringExists(s string, ss []string) bool {
	for _, v := range ss {
		if v == s {
			return true
		}
	}
	return false
}

var usage = `USAGE:

# Decode JWT:
./bin/util-jwt -config=etc/opensky-api.conf -decode "{JWT}"

# Accounts:
./bin/util-jwt -config=etc/opensky-api.conf -account={ACCOUNT_ADDRESS}

# Services:
./bin/util-jwt -config=etc/opensky-api.conf -service={SERVICE_NAME}
`
