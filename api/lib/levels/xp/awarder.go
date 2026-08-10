package xp

import (
	"fmt"
	"math"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	challengeModeCutoffMultiplier = float64(0.0)
	winXP                         = float64(20)
	playXP                        = float64(30)
	tutorialXP                    = uint64(0)
	minHeroesForMatchXP           = 3
	minTurnNonceForLoserReward    = 6
)

type Awarder struct {
	cfg config.OpenSkyConfig
}

func NewAwarder(cfg config.OpenSkyConfig) *Awarder {
	return &Awarder{
		cfg: cfg,
	}
}

func (a *Awarder) AwardFromMatch(sess db.Session, match *data.Match, p1, p2 *data.Account) ([]*proto.Reward, error) {
	var rewards []*proto.Reward

	if match == nil {
		return nil, nil
	}

	isEligibleForLoserRewards := a.isEligibleForLoserRewards(match)

	var players []awardFromMatchPlayer

	isDraw := true

	for _, account := range []*data.Account{p1, p2} {
		if account == nil {
			continue
		}

		if !match.HasPlayer(account.Account) {
			continue
		}

		var gameMode proto.GameMode

		var isWinner bool

		if account.ID == match.Player1ID {
			if match.HasWinner() && *match.WinningPlayer == 1 {
				isWinner = true
				isDraw = false
			}

			gameMode = match.Player1GameMode
		}

		if account.ID == match.Player2ID {
			if match.HasWinner() && *match.WinningPlayer == 2 {
				isWinner = true
				isDraw = false
			}

			gameMode = match.Player2GameMode
		}

		players = append(players, awardFromMatchPlayer{
			account:  account,
			gameMode: gameMode,
			isWinner: isWinner,
		})
	}

	for _, player := range players {
		seasonStat, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(player.account.ID, data.CurrentSeason())
		if err != nil {
			return nil, fmt.Errorf("find season stats for account %d: %w", player.account.ID, err)
		}

		if player.gameMode == proto.GameMode_TUTORIAL && player.isWinner {
			tutorialRewards, err := a.awardTutorialXP(sess, match, player.account, seasonStat)
			if err != nil {
				return nil, fmt.Errorf("award tutorial XP for account %d: %w", player.account.ID, err)
			}

			rewards = append(rewards, tutorialRewards...)
		}

		var isPractice bool

		switch player.gameMode {
		case proto.GameMode_PRACTICE_PVP, proto.GameMode_PRACTICE_BOT, proto.GameMode_WARM_UP:
			isPractice = true
		}

		xpMultiplier := a.cfg.ExpMultiplier

		switch {
		case match.IsPractice():
			if player.account.Level >= a.practiceXPCutoffLevel(player.account.Address) && isPractice {
				xpMultiplier = 0
			}
		case match.IsChallenge():
			if player.account.Level >= a.practiceXPCutoffLevel(player.account.Address) {
				xpMultiplier *= challengeModeCutoffMultiplier
			}
		default:
		}

		if xpMultiplier <= 0 {
			continue
		}

		// Players do not receive match complete XP and victory bonus XP until they have unlocked the first 3 mono Heroes.
		heroesCount, err := data.DB.Items(sess).Find(db.Cond{
			"account_id": player.account.ID,
			"item_type":  proto.ItemType_SW_HERO,
		}).Count()
		if err != nil {
			return nil, fmt.Errorf("find heroes for account %d: %w", player.account.ID, err)
		}

		if heroesCount < minHeroesForMatchXP {
			continue
		}

		if player.isWinner || isEligibleForLoserRewards {
			rewards = append(rewards, &proto.Reward{
				AccountID: player.account.ID,
				Type:      proto.RewardType_EXP,
				Exp: &proto.RewardExp{
					Amount:         uint64(math.Ceil(playXP * xpMultiplier)),
					Reason:         proto.RewardExpReason_MatchPlayed,
					CurrentLevel:   seasonStat.LevelProgress(),
					RequiredExp:    levels.LevelUpXP(player.account.Level),
					BeforeMatchExp: player.account.Experience,
				},
			})
		}

		if isDraw {
			rewards = append(rewards, &proto.Reward{
				AccountID: player.account.ID,
				Type:      proto.RewardType_EXP,
				Exp: &proto.RewardExp{
					Amount:         uint64(math.Ceil(winXP * xpMultiplier)),
					Reason:         proto.RewardExpReason_Draw,
					CurrentLevel:   seasonStat.LevelProgress(),
					RequiredExp:    levels.LevelUpXP(player.account.Level),
					BeforeMatchExp: player.account.Experience,
				},
			})
		} else if player.isWinner && (!match.IsChallenge() || player.account.Level < a.practiceXPCutoffLevel(player.account.Address)) {
			rewards = append(rewards, &proto.Reward{
				AccountID: player.account.ID,
				Type:      proto.RewardType_EXP,
				Exp: &proto.RewardExp{
					Amount:         uint64(math.Ceil(winXP * xpMultiplier)),
					Reason:         proto.RewardExpReason_Victory,
					CurrentLevel:   seasonStat.LevelProgress(),
					RequiredExp:    levels.LevelUpXP(player.account.Level),
					BeforeMatchExp: player.account.Experience,
				},
			})
		}
	}

	return rewards, nil
}

func (a *Awarder) isEligibleForLoserRewards(match *data.Match) bool {
	if match.Status == proto.MatchStatus_FORFEITED || match.Status == proto.MatchStatus_ABANDONED {
		if match.TurnNonce < minTurnNonceForLoserReward {
			return false
		}
	}

	return true
}

func (a *Awarder) awardTutorialXP(sess db.Session, match *data.Match, account *data.Account, seasonStat *data.SkypassSeasonStat) ([]*proto.Reward, error) {
	var rewards []*proto.Reward

	if match.TutorialLevel == nil || *match.TutorialLevel == proto.TutorialLevel_UNKNOWN {
		return nil, nil
	}

	wasCompleted, err := data.DB.TutorialProgress(sess).IsCompleted(account.ID, *match.TutorialLevel)
	if err != nil {
		return nil, fmt.Errorf("check tutorial completion: %w", err)
	}

	if wasCompleted {
		return nil, nil
	}

	rewards = append(rewards, &proto.Reward{
		AccountID: account.ID,
		Type:      proto.RewardType_EXP,
		Exp: &proto.RewardExp{
			Amount:         tutorialXP,
			Reason:         proto.RewardExpReason_TutorialCompleted,
			CurrentLevel:   seasonStat.LevelProgress(),
			RequiredExp:    levels.LevelUpXP(account.Level),
			BeforeMatchExp: account.Experience,
		},
	})

	err = data.DB.TutorialProgress(sess).RecordProgress(account.ID, *match.TutorialLevel)
	if err != nil {
		return nil, fmt.Errorf("record tutorial completion: %w", err)
	}

	return rewards, nil
}

// practiceXPCutoffLevel is a TEMPORARY A/B TESTING FOR XP IN PRACTICE PACING.
func (a *Awarder) practiceXPCutoffLevel(address proto.Hash) uint16 {
	// Check if first characters is between 0-7 (group A) or 8-f (group B)
	if len(address) < 2 || address.String()[2] < byte(56) {
		return 15
	} else {
		return 35
	}
}

type awardFromMatchPlayer struct {
	account  *data.Account
	gameMode proto.GameMode
	isWinner bool
}
