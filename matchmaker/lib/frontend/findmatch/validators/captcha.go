package validators

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	defaultCaptchaEndpoint       = "https://hcaptcha.com/siteverify"
	captchaMinScore              = 0.8
	captchaStoreIDPassedFmt      = "player_interactive_validation_passed:%s"
	captchaValidationGracePeriod = time.Minute * 60
)

type CaptchaValidator struct {
	cfg                  config.HCaptchaConfig
	logger               zerolog.Logger
	keyValStore          store.Store
	httpClient           *http.Client
	captchaBypassEnabled bool
	captchaEndpoint      string
	minScore             float64
}

func NewCaptchaValidator(
	cfg *config.Config,
	logger zerolog.Logger,
	keyValStore store.Store,
	httpClient *http.Client,
) *CaptchaValidator {
	captchaEndpoint := defaultCaptchaEndpoint

	if len(cfg.HCaptcha.URL) > 0 {
		captchaEndpoint = cfg.HCaptcha.URL
	}

	minScore := captchaMinScore

	if cfg.HCaptcha.Local {
		minScore = 0.9
	}

	return &CaptchaValidator{
		cfg:                  cfg.HCaptcha,
		logger:               logger.With().Str("fn", "validators.CaptchaValidator").Logger(),
		keyValStore:          keyValStore,
		httpClient:           httpClient,
		captchaBypassEnabled: cfg.Testing.CaptchaBypassEnabled,
		captchaEndpoint:      captchaEndpoint,
		minScore:             minScore,
	}
}

func (v *CaptchaValidator) IsValid(_ context.Context, client *frontend.Client, msg *messages.FindMatchMessage) (bool, error) {
	if v.cfg.Disabled {
		return true, nil
	}

	passed, err := v.isPassed(client.Player())
	if err != nil {
		v.logger.Err(err).Msg("check cached validation")
	}

	if passed {
		return true, nil
	}

	isValid, err := v.captchaVerifyToken(client.Player(), msg.VerifyToken)
	if err != nil {
		v.logger.Err(err).Msg("captcha provider error")
	}

	if isValid {
		if err := v.recordPassed(client.Player()); err != nil {
			v.logger.Err(err).Msg("record validation passed")
		}

		return true, nil
	}

	if err == nil {
		client.Player().SetShadowBan()
	}

	return false, nil
}

func (v *CaptchaValidator) captchaVerifyToken(p *player.Player, verifyToken messages.HCaptchaVerifyToken) (bool, error) {
	if v.captchaBypassEnabled {
		return true, nil
	}

	logger := v.logger.With().
		Str("fn", "captchaVerifyToken").
		Stringer("player", p.Address()).
		Str("ipAddress", p.IPAddress).
		Logger()

	if verifyToken.Response == "" {
		return false, fmt.Errorf("missing verifyToken")
	}

	if len(verifyToken.Response) > 4000 {
		return false, fmt.Errorf("verifyToken response is too long, considering false. playerID: %q, playerIP: %q", p.Address(), p.IPAddress)
	}

	if v.cfg.Local && p.IPAddress == "" {
		p.IPAddress = "127.0.0.1"
	}

	params := url.Values{}
	params.Set("sitekey", v.cfg.Sitekey)
	params.Set("secret", v.cfg.Secret)
	params.Set("response", verifyToken.Response)
	params.Set("remoteip", p.IPAddress)

	if v.cfg.Local {
		params.Set("host", "0xhorizon.net")
	} else {
		params.Set("host", "skyweaver.net")
	}

	var res *http.Response

	var err error

	var attempts int

	for attempts = 1; attempts <= 3; attempts++ {
		res, err = v.httpClient.PostForm(v.captchaEndpoint, params)
		if err == nil {
			break
		}
	}

	if err != nil {
		// not user's fault
		return true, fmt.Errorf("failed HCaptcha request: %w, attempt: %d", err, attempts)
	}

	if res == nil {
		// not user's fault
		return true, fmt.Errorf("giving up HCaptcha verification after too many tries")
	}

	if res.StatusCode != http.StatusOK {
		// not user's fault
		return true, fmt.Errorf("failed to query HCaptcha endpoint for player: %q, ip: %q", p.Address(), p.IPAddress)
	}
	defer res.Body.Close()

	var message HCaptchaResponse

	decoder := json.NewDecoder(res.Body)
	if err := decoder.Decode(&message); err != nil {
		// not user's fault
		return true, fmt.Errorf("failed to decode HCaptcha response: %w", err)
	}

	if len(message.ErrorCodes) > 0 {
		return false, fmt.Errorf("server error: %v", message.ErrorCodes[0])
	}

	if !message.Success {
		logger.Debug().Msgf("validation failed")
		return false, nil
	}

	if message.Sitekey != v.cfg.Sitekey {
		return false, fmt.Errorf("captcha failed. got invalid site key")
	}

	challengeTimestamp := message.ChallengeTimestamp

	if challengeTimestamp.IsZero() {
		return false, fmt.Errorf("captcha failed. got zero timestamp")
	}

	if time.Now().Add(120 * time.Second).Before(challengeTimestamp) {
		return false, fmt.Errorf("captcha failed. challenge timestamp is expired (%v)", challengeTimestamp)
	}

	if message.Score < v.minScore {
		return true, nil
	}

	logger.Info().Msgf("failed to met minimum score (%v < %v)", message.Score, v.minScore)

	return false, nil
}

func (v *CaptchaValidator) recordPassed(p *player.Player) error {
	err := v.keyValStore.StoreTTL(v.storeIDPassed(p.Address()), true, captchaValidationGracePeriod)
	if err != nil {
		return fmt.Errorf("store: %w", err)
	}

	return nil
}

func (v *CaptchaValidator) isPassed(p *player.Player) (bool, error) {
	ttl, err := v.keyValStore.TTL(v.storeIDPassed(p.Address()))
	if err != nil {
		if errors.Is(err, store.ErrNoSuchItem) {
			return false, nil
		}

		return false, fmt.Errorf("ttl: %w", err)
	}

	if ttl > 0 {
		return true, nil
	}

	return false, nil
}

func (v *CaptchaValidator) storeIDPassed(address proto.Hash) string {
	return fmt.Sprintf(captchaStoreIDPassedFmt, address)
}

type HCaptchaResponse struct {
	Success            bool      `json:"success"`
	ChallengeTimestamp time.Time `json:"challenge_ts"`
	ErrorCodes         []string  `json:"error-codes"`
	Hostname           string    `json:"hostname"`
	Credit             bool      `json:"credit"`
	Sitekey            string    `json:"sitekey"`
	Score              float64   `json:"score"`
	ScoreReason        []string  `json:"score_reason"`
	ScopeUID0          string    `json:"scope_uid_0"`
	ScopeUID1          string    `json:"scope_uid_1"`
}
