package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	UpdateMatchStatsQueue = "signals:match stats"
)

type UpdateMatchStats struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	MatchID        uint64          `json:"match_id"`
	Score          int32           `json:"score"`
}

type matchStats struct {
	GameMode           proto.GameMode
	MatchStatus        proto.MatchStatus
	Winner             *int32
	VSBanned           bool
	VSFeeder           bool
	GameCount          int64
	TotalMatchDuration int64
	TotalTurnNonces    int64
}

func (t UpdateMatchStats) Hash() string {
	return fmt.Sprintf("%d-%d-%d", t.AccountID, t.MatchID, t.Score)
}

func updateMatchStats(ctx context.Context, sess db.Session, task *data.Task) error {
	payload := UpdateMatchStats{}
	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		log.Error().Msgf("failed unmarshalling detect short match duration payload with: %v", err)
		return err
	}

	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		log.Err(err).Msgf("get account ID")
		UpdateFailedTasks([]*data.Task{task}, 0, 0)

		return fmt.Errorf("get account ID: %w", err)
	}

	// TODO: modify started_at condition to use last timestamp when user was reviewed and was OK

	var stats []*matchStats

	rows, err := data.DB.Session.SQL().Query(`
		SELECT
			p1_game_mode AS game_mode,
			status,
			winning_player,
			account_actions.is_active IS TRUE AS vs_banned,
			account_signals.account_id IS NOT NULL AS vs_feeder,
			COUNT(1) AS games_played,
			SUM(duration_seconds) AS total_match_duration,
			SUM(turn_nonce) AS total_turn_nonces
		FROM matches
		LEFT JOIN account_actions
			ON matches.p2_id = account_actions.account_id
		LEFT JOIN account_signals
			ON matches.p2_id = account_signals.account_id AND account_signals.signal_type = 'player is feeder'
		WHERE p1_id = ?
			AND p1_game_mode IN (1,5,6,7)
			AND started_at >= '2021-11-25'
			AND status IN (1, 2, 3)
		GROUP BY 1, 2, 3, 4, 5`, accountID)
	if err != nil {
		log.Error().Msgf("failed fetching match stats with: %v", err)
		return err
	}

	for rows.Next() {
		st := &matchStats{}
		err = rows.Scan(&st.GameMode, &st.MatchStatus, &st.Winner, &st.VSBanned, &st.VSFeeder, &st.GameCount, &st.TotalMatchDuration, &st.TotalTurnNonces)
		if err != nil {
			log.Error().Msgf("failed scanning match stats with: %v", err)
			return err
		}
		stats = append(stats, st)
	}

	rows, err = data.DB.Session.SQL().Query(`
		SELECT
			p2_game_mode AS game_mode,
			status,
			CASE WHEN winning_player = 1 THEN 2 WHEN winning_player = 2 THEN 1 ELSE 0 END AS winning_player,
			account_actions.is_active IS TRUE AS vs_banned,
			account_signals.account_id IS NOT NULL AS vs_feeder,
			COUNT(1) AS games_played,
			SUM(duration_seconds) AS total_match_duration,
			SUM(turn_nonce) AS total_turn_nonces
		FROM matches
		LEFT JOIN account_actions
			ON matches.p1_id = account_actions.account_id
		LEFT JOIN account_signals
			ON matches.p1_id = account_signals.account_id AND account_signals.signal_type = 'player is feeder'
		WHERE p2_id = ?
			AND p2_game_mode IN (1,5,6,7)
			AND started_at >= '2021-11-25'
			AND status IN (1, 2, 3)
		GROUP BY 1, 2, 3, 4, 5`, accountID)
	if err != nil {
		log.Error().Msgf("failed fetching match stats with: %v", err)
		return err
	}

	for rows.Next() {
		st := &matchStats{}
		err = rows.Scan(&st.GameMode, &st.MatchStatus, &st.Winner, &st.VSBanned, &st.VSFeeder, &st.GameCount, &st.TotalMatchDuration, &st.TotalTurnNonces)
		if err != nil {
			log.Error().Msgf("failed scanning match stats with: %v", err)
			return err
		}

		stats = append(stats, st)
	}

	if len(stats) == 0 {
		return nil
	}

	var matchesPlayed, matchesPlayedConquest, matchesPlayedConstructed,
		matchesThrown, matchesThrownConquest,
		matchesWon, matchesWonByForfeit,
		matchesVSFeeder, matchesVSBanned,
		matchNonces, matchDuration int64

	for _, st := range stats {
		matchesPlayed += st.GameCount
		matchNonces += st.TotalTurnNonces
		matchDuration += st.TotalMatchDuration

		if st.GameMode == proto.GameMode_CONQUEST_CONSTRUCTED || st.GameMode == proto.GameMode_CONQUEST_DISCOVERY {
			matchesPlayedConquest += st.GameCount
		}

		if st.GameMode == proto.GameMode_CONQUEST_CONSTRUCTED || st.GameMode == proto.GameMode_RANKED_CONSTRUCTED {
			matchesPlayedConstructed += st.GameCount
		}

		if st.VSFeeder {
			matchesVSFeeder += st.GameCount
		}

		if st.VSBanned {
			matchesVSBanned += st.GameCount
		}

		if st.MatchStatus == proto.MatchStatus_ABANDONED || st.MatchStatus == proto.MatchStatus_FORFEITED {
			matchesThrown += st.GameCount

			if st.GameMode == proto.GameMode_CONQUEST_CONSTRUCTED || st.GameMode == proto.GameMode_CONQUEST_DISCOVERY {
				matchesThrownConquest += st.GameCount
			}
		}

		if st.Winner != nil && *st.Winner == 1 {
			matchesWon += st.GameCount

			if st.MatchStatus == proto.MatchStatus_ABANDONED || st.MatchStatus == proto.MatchStatus_FORFEITED {
				matchesWonByForfeit += st.GameCount
			}
		}
	}

	err = cleanupSignals(nil, accountID,
		signals.MATCHES_PLAYED,
		signals.MATCHES_PLAYED_CONQUEST,
		signals.MATCHES_PLAYED_CONSTRUCTED,
		signals.MATCHES_NONCE_AVG,
		signals.MATCHES_DURATION_AVG,
		signals.MATCHES_PLAYED_VS_BANNED_PERC,
		signals.MATCHES_PLAYED_VS_FEEDER_PERC,
		signals.MATCHES_PLAYED_CONQUEST_PERC,
		signals.MATCHES_WON_PERC,
		signals.MATCHES_WON_BY_FORFEIT_PERC,
		signals.MATCHES_PLAYED_FORFEITED_PERC,
		signals.PLAYER_IS_FEEDER,
		signals.USER_REPORTS_PER_GAME,
		signals.USER_REPORT_COUNT,
		signals.AVG_MATCH_MOVES,
		signals.STDDEV_MATCH_MOVES,
	)
	if err != nil {
		log.Error().Msgf("failed cleaning up match signals: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_PLAYED,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: matchesPlayed,
			},
			MLScore: float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_PLAYED_CONQUEST,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: matchesPlayedConquest,
			},
			MLScore: float64(matchesPlayedConquest),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_PLAYED_CONSTRUCTED,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: matchesPlayedConstructed,
			},
			MLScore: float64(matchesPlayedConstructed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_NONCE_AVG,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Average{
				Average: float64(matchNonces) / float64(matchesPlayed),
			},
			MLScore: float64(matchNonces) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_DURATION_AVG,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Average{
				Average: float64(matchDuration) / float64(matchesPlayed),
			},
			MLScore: float64(matchDuration) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_PLAYED_VS_BANNED_PERC,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: float64(matchesVSBanned) / float64(matchesPlayed),
			},
			MLScore: float64(matchesVSBanned) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_PLAYED_VS_FEEDER_PERC,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: float64(matchesVSFeeder) / float64(matchesPlayed),
			},
			MLScore: float64(matchesVSFeeder) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_PLAYED_CONQUEST_PERC,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: float64(matchesPlayedConquest) / float64(matchesPlayed),
			},
			MLScore: float64(matchesPlayedConquest) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_WON_PERC,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: float64(matchesWon) / float64(matchesPlayed),
			},
			MLScore: float64(matchesWon) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_WON_BY_FORFEIT_PERC,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: float64(matchesWonByForfeit) / float64(matchesPlayed),
			},
			MLScore: float64(matchesWonByForfeit) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.MATCHES_PLAYED_FORFEITED_PERC,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: float64(matchesThrown) / float64(matchesPlayed),
			},
			MLScore: float64(matchesThrown) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	if matchesPlayed > 5 && (float64(matchesThrown)/float64(matchesPlayed)) >= 0.5 {
		err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
			AccountSignal: &proto.AccountSignal{
				AccountID:    accountID,
				SignalType:   signals.PLAYER_IS_FEEDER,
				SignalStatus: proto.SignalStatus_PENDING,
				SignalData: signals.Fraction{
					Fraction: float64(matchesThrown) / float64(matchesPlayed),
				},
				MLScore: float64(matchesThrown) / float64(matchesPlayed),
			},
		})
		if err != nil {
			log.Error().Msgf("failed creating account signal with: %v", err)
			return err
		}
	}

	reportCount, err := data.DB.AccountSignals(nil).Find(db.Cond{
		"account_id":  accountID,
		"signal_type": signals.USER_REPORT,
	}).Count()
	if err != nil {
		log.Error().Msgf("failed fetching report count with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.USER_REPORTS_PER_GAME,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: float64(reportCount) / float64(matchesPlayed),
			},
			MLScore: float64(reportCount) / float64(matchesPlayed),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.USER_REPORT_COUNT,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Count{
				Count: int64(reportCount),
			},
			MLScore: float64(reportCount),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	row, err := data.DB.Session.SQL().QueryRow(`
		SELECT
			account_id,
			avg(moves) AS average,
			stddev(moves) AS standard_dev
		FROM (
			SELECT
				p1_id AS account_id,
				p1_moves AS moves
			FROM matches
			WHERE p1_id = ? AND p1_moves > 0
			UNION
			SELECT
				p2_id AS account_id,
				p2_moves AS moves
			FROM matches
			WHERE p2_id = ? AND p2_moves > 0
		) sub group by 1`,
		accountID,
		accountID,
	)
	if err != nil {
		log.Error().Msgf("failed fetching avg and stddev of match moves: %v", err)
		return err
	}

	var accountAddress string
	var average, stddev float64

	err = row.Scan(&accountAddress, &average, &stddev)
	if err != nil {
		log.Error().Msgf("failed scanning avg and stddev of match moves: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.AVG_MATCH_MOVES,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Average{
				Average: average,
			},
			MLScore: average,
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.STDDEV_MATCH_MOVES,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Average{
				Average: stddev,
			},
			MLScore: stddev,
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.Tasks(sess).EnqueueTask(AccountScoreQueue, AccountScoreTask{
		AccountID: accountID,
		Nonce:     task.ID,
	}, nil, &accountID)
	if err != nil {
		log.Error().Msgf("failed updating account score with: %v", err)
		return err
	}

	return nil
}
