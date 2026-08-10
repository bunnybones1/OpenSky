package proto

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"math/big"
	"net/url"
	"regexp"
	"sort"
	"strings"

	"github.com/c2h5oh/hide"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4/adapter/postgresql"

	"github.com/horizon-games/OpenSky/api/lib/ranking"
)

const (
	defaultAccountIDHidePrime int64 = 3
	defaultAccountIDHideXor   int64 = 1
)

var (
	twitchProfileRegexp = regexp.MustCompile(`^[a-zA-Z0-9]{1}[a-zA-Z0-9_]{3,24}$`)

	accountIDHide hide.Hide
)

func init() {
	if err := SetAccountIDHidePrime(defaultAccountIDHidePrime); err != nil {
		panic(err)
	}

	if err := SetAccountIDHideXor(defaultAccountIDHideXor); err != nil {
		panic(err)
	}
}

func SetAccountIDHidePrime(i int64) error {
	return accountIDHide.SetUint64(big.NewInt(i))
}

func SetAccountIDHideXor(i int64) error {
	return accountIDHide.SetXor(big.NewInt(i))
}

func (c DeckClass) CardClasses() []CardClass {
	switch c {
	case DeckClass_STR:
		return []CardClass{CardClass_STR}

	case DeckClass_HRT:
		return []CardClass{CardClass_HRT}

	case DeckClass_AGY:
		return []CardClass{CardClass_AGY}

	case DeckClass_INT:
		return []CardClass{CardClass_INT}

	case DeckClass_WIS:
		return []CardClass{CardClass_WIS}

	case DeckClass_STH:
		return []CardClass{CardClass_STR, CardClass_HRT}

	case DeckClass_STA:
		return []CardClass{CardClass_STR, CardClass_AGY}

	case DeckClass_STI:
		return []CardClass{CardClass_STR, CardClass_INT}

	case DeckClass_STW:
		return []CardClass{CardClass_STR, CardClass_WIS}

	case DeckClass_HRA:
		return []CardClass{CardClass_HRT, CardClass_AGY}

	case DeckClass_HRI:
		return []CardClass{CardClass_HRT, CardClass_INT}

	case DeckClass_HRW:
		return []CardClass{CardClass_HRT, CardClass_WIS}

	case DeckClass_AGI:
		return []CardClass{CardClass_AGY, CardClass_INT}

	case DeckClass_AGW:
		return []CardClass{CardClass_AGY, CardClass_WIS}

	case DeckClass_INW:
		return []CardClass{CardClass_INT, CardClass_WIS}
	}

	return nil
}

type Region string

var (
	_ json.Marshaler   = *new(Region)
	_ json.Unmarshaler = new(Region)
)

func NewRegion(s string) *Region {
	r := new(Region)

	if err := r.UnmarshalText([]byte(s)); err != nil {
		log.Err(err).Msg("decode region")
	}

	return r
}

func (r Region) MarshalText() ([]byte, error) {
	return []byte(r.String()), nil
}

func (r *Region) UnmarshalText(src []byte) error {
	*r = Region(strings.ToUpper(string(src)))
	return nil
}

func (r Region) String() string {
	return strings.ToUpper(string(r))
}

func (r Region) Value() (driver.Value, error) {
	return r.String(), nil
}

func (r *Region) Scan(src interface{}) error {
	return r.UnmarshalText([]byte(src.(string)))
}

func (r Region) MarshalJSON() ([]byte, error) {
	return json.Marshal(r.String())
}

func (r *Region) UnmarshalJSON(src []byte) error {
	var s string
	err := json.Unmarshal(src, &s)
	if err != nil {
		return err
	}
	return r.UnmarshalText([]byte(s))
}

// XXX TODO ....... remove .Hash and .BigInt here
// use the types from protoyp of go-sequence

type Hash string

func HashFromString(s string) Hash {
	return Hash(strings.ToLower(s))
}

func (h Hash) IsValidAddress() bool {
	if len(h) != 42 {
		return false
	}
	if h[0:2] != "0x" {
		return false
	}
	return true
}

func (h Hash) IsValidTxnHash() bool {
	if len(h) != 66 {
		return false
	}
	if h[0:2] != "0x" {
		return false
	}
	return true
}

// UnmarshalText implements encoding.TextMarshaler.
func (h *Hash) MarshalText() ([]byte, error) {
	return []byte(h.String()), nil
}

// UnmarshalText implements encoding.TextUnmarshaler.
func (h *Hash) UnmarshalText(src []byte) error {
	*h = Hash(strings.ToLower(string(src)))

	return nil
}

func (h Hash) String() string {
	return strings.ToLower(string(h))
}

func (h Hash) Value() (driver.Value, error) {
	return h.String(), nil
}

func (h *Hash) ZeroValue() bool {
	if h == nil {
		return true
	}

	if h.String() == "" {
		return true
	}
	return false
}

func (h *Hash) Scan(src interface{}) error {
	*h = Hash(src.(string))
	return nil
}

type AccountID uint64

func (i AccountID) MarshalJSON() ([]byte, error) {
	return json.Marshal(accountIDHide.Uint64Obfuscate(uint64(i)))
}

func (i *AccountID) UnmarshalJSON(data []byte) error {
	var obf uint64

	if err := json.Unmarshal(data, &obf); err != nil {
		*i = AccountID(obf)
		return err
	}

	*i = AccountID(accountIDHide.Uint64Deobfuscate(obf))

	return nil
}

func (i AccountID) UInt64() uint64 {
	return uint64(i)
}

func (i AccountID) IsValid() bool {
	return i > 0
}

type BigInt big.Int

var (
	_ json.Marshaler   = *new(BigInt)
	_ json.Unmarshaler = new(BigInt)
)

// UnmarshalText implements encoding.TextMarshaler.
func (b BigInt) Value() (driver.Value, error) {
	return b.String(), nil
}

func (b *BigInt) Scan(src interface{}) error {
	if src == nil {
		return nil
	}
	i := &big.Int{}
	i, _ = i.SetString(string(src.([]byte)), 10)
	*b = BigInt(*i)
	return nil
}

func (b *BigInt) String() string {
	if b == nil {
		return ""
	}
	return b.Int().String()
}

func (b *BigInt) Int() *big.Int {
	if b == nil {
		return nil
	}
	v := big.Int(*b)

	return &v
}

// UnmarshalText implements encoding.TextMarshaler.
func (b *BigInt) MarshalText() ([]byte, error) {
	if b == nil {
		return nil, nil
	}
	v := big.Int(*b)

	return v.MarshalText()
}

// UnmarshalText implements encoding.TextUnmarshaler.
func (b *BigInt) UnmarshalText(src []byte) error {
	v := big.NewInt(0)
	if err := v.UnmarshalText(src); err != nil {
		return err
	}
	*b = BigInt(*v)

	return nil
}

// UnmarshalJSON implements json.Unmarshaler
func (b *BigInt) UnmarshalJSON(src []byte) error {
	return b.UnmarshalText(src)
}

// MarshalJSON implements json.Marshaler
func (b BigInt) MarshalJSON() ([]byte, error) {
	return b.MarshalText()
}

func ToBigInt(b *big.Int) *BigInt {
	if b == nil {
		return nil
	}

	v := BigInt(*b)
	return &v
}

func ToBigIntFromInt64(n int64) BigInt {
	return *ToBigInt(big.NewInt(n))
}

type AccountSettingsWrapper struct {
	AccountSettings `db:",inline"`
}

func (a AccountSettingsWrapper) Value() (driver.Value, error) {
	return postgresql.JSONBValue(a)
}

func (a *AccountSettingsWrapper) Scan(src interface{}) error {
	return postgresql.ScanJSONB(a, src)
}

// HasValidTwitchProfile validates whether the Twitch profile is alphanumerical only
// and is between 4-25 characters in length.
// It also gets a username from a full URL if provided ("https://www.twitch.tv/ab_12" -> "ab_12").
func (a *AccountSettingsWrapper) HasValidTwitchProfile() bool {
	if a.TwitchProfile == nil {
		return false
	}

	u, _ := url.Parse(*a.TwitchProfile)
	twitchProfile := strings.TrimPrefix(u.Path, "/")

	if !twitchProfileRegexp.MatchString(twitchProfile) {
		return false
	}

	a.TwitchProfile = &twitchProfile

	return true
}

type U64JSONBArray []uint64

func (u U64JSONBArray) Value() (driver.Value, error) {
	return postgresql.JSONBValue(u)
}

func (u *U64JSONBArray) Scan(src interface{}) error {
	return postgresql.ScanJSONB(u, src)
}

type MapStringBoolJSONB map[string]bool

func (m MapStringBoolJSONB) Value() (driver.Value, error) {
	return postgresql.JSONBValue(m)
}

func (m *MapStringBoolJSONB) Scan(src interface{}) error {
	return postgresql.ScanJSONB(m, src)
}

type ConquestMatchResultMap map[uint64]ConquestMatchResult

func (c ConquestMatchResultMap) Value() (driver.Value, error) {
	return postgresql.JSONBValue(c)
}

func (c *ConquestMatchResultMap) Scan(src interface{}) error {
	return postgresql.ScanJSONB(c, src)
}

func (d *Deck) MarshalJSON() ([]byte, error) {
	if d.FavoritedAt != nil {
		// IsFavorite can be inferred from the information we already have in
		// FavoritedAt
		d.IsFavorite = true
	}
	return json.Marshal(*d)
}

func (c *LeaderboardEntry) CursorValue() string {
	if c.AccountStat != nil {
		return c.AccountStat.CursorValue()
	}
	return c.Cursor
}

func (c *AccountAction) CursorValue() string {
	return c.Cursor
}

func (c *AccountStat) CursorValue() string {
	return c.Cursor
}

func (c *AccountSignalSummary) CursorValue() string {
	return c.Cursor
}

func (m *Match) IsRanked() bool {
	switch {
	case m.Player1GameMode == GameMode_RANKED_DISCOVERY && m.Player2GameMode == GameMode_RANKED_DISCOVERY:
		return true
	case m.Player1GameMode == GameMode_RANKED_CONSTRUCTED && m.Player2GameMode == GameMode_RANKED_CONSTRUCTED:
		return true
	case m.Player1GameMode == GameMode_RANKED_CONSTRUCTED || m.Player2GameMode == GameMode_RANKED_CONSTRUCTED:
		return m.Player1GameMode == GameMode_PRACTICE_PVP || m.Player2GameMode == GameMode_PRACTICE_PVP
	}
	return false
}

func (m *Match) IsRankedConstructed() bool {
	switch {
	case m.Player1GameMode == GameMode_RANKED_CONSTRUCTED && m.Player2GameMode == GameMode_RANKED_CONSTRUCTED:
		return true
	case m.Player1GameMode == GameMode_RANKED_CONSTRUCTED || m.Player2GameMode == GameMode_RANKED_CONSTRUCTED:
		return m.Player1GameMode == GameMode_PRACTICE_PVP || m.Player2GameMode == GameMode_PRACTICE_PVP
	}
	return false
}

func (m *Match) IsPracticeBot() bool {
	switch {
	case m.Player1GameMode == GameMode_PRACTICE_BOT || m.Player2GameMode == GameMode_PRACTICE_BOT:
		return true
	}
	return false
}

func (m *Match) IsPracticePVP() bool {
	switch {
	case m.Player1GameMode == GameMode_PRACTICE_PVP || m.Player2GameMode == GameMode_PRACTICE_PVP:
		return true
	}
	return false
}

func (m *Match) IsPractice() bool {
	switch {
	case m.Player1GameMode == GameMode_WARM_UP || m.Player2GameMode == GameMode_WARM_UP:
		return true
	}
	return m.IsPracticePVP() || m.IsPracticeBot()
}

func (m *Match) IsConquest() bool {
	switch {
	case m.Player1GameMode == GameMode_CONQUEST_CONSTRUCTED && m.Player2GameMode == GameMode_CONQUEST_CONSTRUCTED:
		return true
	case m.Player1GameMode == GameMode_CONQUEST_DISCOVERY && m.Player2GameMode == GameMode_CONQUEST_DISCOVERY:
		return true
	}
	return false
}

func (m *Match) IsChallenge() bool {
	switch {
	case m.Player1GameMode == GameMode_CHALLENGE_CONSTRUCTED && m.Player2GameMode == GameMode_CHALLENGE_CONSTRUCTED:
		return true
	case m.Player1GameMode == GameMode_CHALLENGE_DISCOVERY && m.Player2GameMode == GameMode_CHALLENGE_DISCOVERY:
		return true
	}
	return false
}

func (m *Match) Mode() string {
	if m.Player1GameMode.String() == m.Player2GameMode.String() {
		return m.Player1GameMode.String()
	}
	if m.IsPracticeBot() {
		return GameMode_PRACTICE_BOT.String()
	}
	modes := []string{m.Player1GameMode.String(), m.Player2GameMode.String()}
	sort.Strings(modes)
	return strings.Join(modes, "/")
}

func (m *Match) CursorValue() string {
	return m.Cursor
}

func (m *Match) HasPlayer(account *Account) bool {
	if account == nil {
		return false
	}

	if m.Player1ID == account.ID || m.Player2ID == account.ID {
		return true
	}

	return false
}

func (m *Match) HasWinner() bool {
	if m.WinningPlayer == nil {
		return false
	}

	return *m.WinningPlayer > 0
}

func (c *GMMatch) CursorValue() string {
	if c.Match != nil {
		return c.Match.Cursor
	}
	return ""
}

func (c *CardWithBalance) CursorValue() string {
	return c.Cursor
}

func (c *DeckRank) CursorValue() string {
	return c.Cursor
}

func (c *Deck) CursorValue() string {
	return c.Cursor
}

func (c *FeedEvent) CursorValue() string {
	return c.Cursor
}

func (c *Account) CursorValue() string {
	return c.Cursor
}

func (c *Account) IsBurner() bool {
	if c.PrivateSettings != nil && c.PrivateSettings.BurnerAddress != nil && c.PrivateSettings.BurnerAddress.IsValidAddress() {
		return *c.PrivateSettings.BurnerAddress == c.Address
	}

	return false
}

func (c *Account) WasBurner() bool {
	if c.PrivateSettings != nil && c.PrivateSettings.BurnerAddress != nil && c.PrivateSettings.BurnerAddress.IsValidAddress() {
		return *c.PrivateSettings.BurnerAddress != c.Address
	}

	return false
}

func (c *Task) CursorValue() string {
	return c.Cursor
}

func (c *GameModeStatusHistory) CursorValue() string {
	return c.Cursor
}

func (c *ConquestPoints) CursorValue() string {
	return c.Cursor
}

var ErrUnsupportedNotificationType = fmt.Errorf("unsupported notification type")

type NotificationData struct {
	Type              *NotificationType
	LeaderboardReward *NotificationLeaderboardReward `db:"-"`
	ConquestV2Reward  *NotificationConquestV2Reward  `db:"-"`
	OneTime           *NotificationOneTimeWrapper    `db:"-"`
	SeasonStart       *NotificationSeasonStart       `db:"-"`
}

func (d *NotificationData) Value() (driver.Value, error) {
	var data []byte

	var err error

	switch *d.Type {
	case NotificationType_LEADERBOARD_REWARD:
		data, err = json.Marshal(d.LeaderboardReward)
		if err != nil {
			return nil, fmt.Errorf("marshal LeaderboardReward: %w", err)
		}
	case NotificationType_CONQUEST_V2_REWARD:
		data, err = json.Marshal(d.ConquestV2Reward)
		if err != nil {
			return nil, fmt.Errorf("marshal ConquestV2Reward: %w", err)
		}
	case NotificationType_ONE_TIME:
		data, err = json.Marshal(d.OneTime)
		if err != nil {
			return nil, fmt.Errorf("marshal OneTime: %w", err)
		}
	case NotificationType_SEASON_START:
		data, err = json.Marshal(d.SeasonStart)
		if err != nil {
			return nil, fmt.Errorf("marshal SeasonStart: %w", err)
		}
	default:
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedNotificationType, d.Type)
	}

	return postgresql.JSONBValue(notificationDataWrapper{
		Type: d.Type,
		Data: data,
	})
}

func (d *NotificationData) Scan(src interface{}) error {
	var wrapper notificationDataWrapper

	err := postgresql.ScanJSONB(&wrapper, src)
	if err != nil {
		return fmt.Errorf("scan data wrapper: %w", err)
	}

	switch *wrapper.Type {
	case NotificationType_LEADERBOARD_REWARD:
		d.LeaderboardReward = &NotificationLeaderboardReward{}

		return json.Unmarshal(wrapper.Data, d.LeaderboardReward)
	case NotificationType_CONQUEST_V2_REWARD:
		d.ConquestV2Reward = &NotificationConquestV2Reward{}

		return json.Unmarshal(wrapper.Data, d.ConquestV2Reward)
	case NotificationType_ONE_TIME:
		d.OneTime = &NotificationOneTimeWrapper{}

		return json.Unmarshal(wrapper.Data, d.OneTime)
	case NotificationType_SEASON_START:
		d.SeasonStart = &NotificationSeasonStart{}

		return json.Unmarshal(wrapper.Data, d.SeasonStart)
	default:
		return fmt.Errorf("%w: %s", ErrUnsupportedNotificationType, d.Type)
	}
}

type notificationDataWrapper struct {
	Type *NotificationType `json:"type"`
	Data json.RawMessage   `json:"data"`
}

func (a *SkypassRewardAttributes) Value() (driver.Value, error) {
	return postgresql.JSONBValue(a)
}

func (a *SkypassRewardAttributes) Scan(src interface{}) error {
	return postgresql.ScanJSONB(a, src)
}

type NotificationOneTimeData struct {
	json.RawMessage
}

func (d *NotificationOneTimeData) Value() (driver.Value, error) {
	return postgresql.JSONBValue(d)
}

func (d *NotificationOneTimeData) Scan(src interface{}) error {
	return postgresql.ScanJSONB(d, src)
}

type NotificationOneTimeFilter struct {
	json.RawMessage
}

func (f *NotificationOneTimeFilter) Value() (driver.Value, error) {
	return postgresql.JSONBValue(f)
}

func (f *NotificationOneTimeFilter) Scan(src interface{}) error {
	return postgresql.ScanJSONB(f, src)
}

type PaymentLogData struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func (d *PaymentLogData) Value() (driver.Value, error) {
	return postgresql.JSONBValue(d)
}

func (d *PaymentLogData) Scan(src interface{}) error {
	return postgresql.ScanJSONB(d, src)
}

//
// Banner
//

var (
	BannerColorInfo      = "#006A93"
	BannerColorWarning   = "#BC4918"
	BannerColorEmergency = "#A9094C"
)

func (b *Banner) MarshalJSON() ([]byte, error) {
	if b.Color == nil {
		switch *b.Type {
		case BannerType_INFO:
			b.Color = &BannerColorInfo
		case BannerType_WARNING:
			b.Color = &BannerColorWarning
		case BannerType_EMERGENCY:
			b.Color = &BannerColorEmergency
		}
	}
	return json.Marshal(*b)
}

type RankState struct {
	ranking.State `json:"state"`
}

func (p *RankState) Scan(src interface{}) error {
	var f64a postgresql.Float64Array
	if err := f64a.Scan(src); err != nil {
		return err
	}
	var state ranking.State
	switch len(f64a) {
	case 0:
		initialState := ranking.InitialRankState()
		state = *initialState
	case 4:
		state = ranking.State{
			Win: ranking.NewOutcome(f64a[0]),
			R:   f64a[1],
			RD:  f64a[2],
			RP:  int32(f64a[3]),
		}
	default:
		return fmt.Errorf("expecting an array of length 4")
	}
	p.State = state
	return nil
}

func (p RankState) Value() (driver.Value, error) {
	if p.Win != ranking.OutcomeUndefined && p.R > 0 {
		if p.R < 1 {
			p.R = 1.0
		}
		if p.RD < 1 {
			p.RD = 30.0
		}
		data := [4]float64{p.Win.Float64(), p.R, p.RD, float64(p.RP)}
		return driver.Value(data), nil
	}
	return nil, nil
}

func (p *Payment) CursorValue() string {
	return p.Cursor
}

func PaymentStatusPtr(s PaymentStatus) *PaymentStatus {
	return &s
}

func PaymentProviderPtr(p PaymentProvider) *PaymentProvider {
	return &p
}

func ItemTypePtr(t ItemType) *ItemType {
	return &t
}

func NewNotificationEarnedRank(playerRank PlayerRank, playerRankStage PlayerRankStage) *NotificationEarnedRank {
	r := NotificationEarnedRank{
		PlayerRank:      new(PlayerRank),
		PlayerRankStage: new(PlayerRankStage),
	}
	*r.PlayerRank = playerRank
	*r.PlayerRankStage = playerRankStage
	return &r
}

func (r *QuestReward) Value() (driver.Value, error) {
	return postgresql.JSONBValue(r)
}

func (r *QuestReward) Scan(src interface{}) error {
	return postgresql.ScanJSONB(r, src)
}

func (a *AppDevKey) CursorValue() string {
	return a.Cursor
}
