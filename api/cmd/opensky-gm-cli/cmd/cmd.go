package cmd

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	envPrefix      = "SW"
	defaultApiHost = "https://api.skyweaver.net"
)

var (
	rootCmd = &cobra.Command{
		Use: "opensky-gm-cli",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return initializeConfig(cmd)
		},
	}

	swAPIClient  proto.SkyWeaverAPI
	swAPIAuthCtx context.Context

	// flags
	authToken string
	apiHost   string
)

func initializeConfig(cmd *cobra.Command) error {
	v := viper.New()
	v.SetEnvPrefix(envPrefix)
	v.AutomaticEnv()

	cmd.Flags().VisitAll(func(f *pflag.Flag) {
		// Environment variables can't have dashes in them, so bind them to their equivalent
		// keys with underscores, e.g. --favorite-color to STING_FAVORITE_COLOR
		if strings.Contains(f.Name, "-") {
			envVarSuffix := strings.ToUpper(strings.ReplaceAll(f.Name, "-", "_"))

			if err := v.BindEnv(f.Name, fmt.Sprintf("%s_%s", envPrefix, envVarSuffix)); err != nil {
				panic(fmt.Errorf("bind env variable: %w", err))
			}
		}

		// Apply the viper config value to the flag when the flag is not set and viper has a value
		if !f.Changed && v.IsSet(f.Name) {
			val := v.Get(f.Name)
			if err := cmd.Flags().Set(f.Name, fmt.Sprintf("%v", val)); err != nil {
				panic(fmt.Errorf("set flags: %w", err))
			}
		}
	})

	swAPIClient = proto.NewSkyWeaverAPIClient(apiHost, http.DefaultClient)
	headers := http.Header{}
	headers.Set("Authorization", fmt.Sprintf("BEARER %s", authToken))
	swAPIAuthCtx, _ = proto.WithHTTPRequestHeaders(context.Background(), headers)

	return nil
}

func init() {
	rootCmd.PersistentFlags().StringVar(&authToken, "auth-token", "", "Game master jwt token. Can also be set as SW_AUTH_TOKEN env variable")
	rootCmd.PersistentFlags().StringVar(&apiHost, "api-host", defaultApiHost, "OpenSky API URL. Can also be set as SW_API_HOST env variable")

	rootCmd.AddCommand(accountCmd())
}

func Execute() error {
	return rootCmd.Execute()
}

func parseErr(err error) error {
	if err == nil {
		return nil
	}

	msg := strings.TrimPrefix(err.Error(), "webrpc ")
	switch {
	case strings.HasPrefix(msg, string(proto.ErrUnauthenticated)):
		return errors.New("authentication failed. Check your auth token")

	case strings.HasPrefix(msg, string(proto.ErrPermissionDenied)):
		return errors.New("permission denied. Your account doesn't have permissions required to perform action")

	case strings.HasPrefix(msg, string(proto.ErrNotFound)):
		return errors.New(strings.TrimPrefix(msg, fmt.Sprintf("%s error: ", proto.ErrNotFound)))

	default:
		return errors.New(msg)
	}
}
