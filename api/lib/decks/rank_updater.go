package decks

import (
	"fmt"

	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
)

const minimumPlayerRankForDeckRanking = proto.PlayerRank_APPRENTICE

type SyncRankUpdater struct {
}

func NewSyncRankUpdater() *SyncRankUpdater {
	return &SyncRankUpdater{}
}

func (u *SyncRankUpdater) UpdateFromMatch(sess db.Session, match *data.Match, season uint16) error {
	if !match.IsRankedConstructed() {
		return nil
	}

	if match.WinningPlayer == nil {
		return fmt.Errorf("winning player cannot be nil")
	}

	p1Deck, err := data.DeckFromDeckString(match.Player1DeckString)
	if err != nil {
		return fmt.Errorf("deck from string for player 1: %w", err)
	}

	p1Stats, err := data.DB.AccountStats(sess).FindOrCreateByAccountIDAndMode(match.Player1ID, match.Player1GameMode, season)
	if err != nil {
		return fmt.Errorf("find account stats for player 1: %w", err)
	}

	p2Deck, err := data.DeckFromDeckString(match.Player2DeckString)
	if err != nil {
		return fmt.Errorf("deck from string for player 2: %w", err)
	}

	p2Stats, err := data.DB.AccountStats(sess).FindOrCreateByAccountIDAndMode(match.Player2ID, match.Player2GameMode, season)
	if err != nil {
		return fmt.Errorf("find account stats for player 1: %w", err)
	}

	var winnerDeck, loserDeck *data.Deck

	var winnerStats, loserStats *data.AccountStat

	switch *match.WinningPlayer {
	case 1, 0:
		winnerDeck, loserDeck = p1Deck, p2Deck
		winnerStats, loserStats = p1Stats, p2Stats
	case 2:
		winnerDeck, loserDeck = p2Deck, p1Deck
		winnerStats, loserStats = p2Stats, p1Stats
	default:
		return fmt.Errorf("invalid winnig player")
	}

	saveWinnerStats := winnerStats.PlayerRank >= minimumPlayerRankForDeckRanking
	saveLoserStats := loserStats.PlayerRank >= minimumPlayerRankForDeckRanking

	var winnerDeckRank, loserDeckRank *data.DeckRank

	// make sure that ranks for both decks exist.
	// search, and if not found, create a new deck rank for the deck string if deck is complete
	if winnerDeck != nil && winnerDeck.IsComplete() {
		winnerDeckRank, err = data.DB.DeckRanks(sess).FindCurrentStatsByDeckstring(
			winnerDeck.DeckString,
		)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return fmt.Errorf("find deck stats for winner: %w", err)
		}

		if errors.Is(err, db.ErrNoMoreRows) {
			winnerDeckRank = &data.DeckRank{DeckRank: &proto.DeckRank{
				DeckString:      winnerDeck.DeckString,
				Class:           winnerDeck.Class,
				CardIDs:         winnerDeck.CardIDs,
				HighestPlayerID: winnerStats.AccountID,
			}}

			err := sess.Save(winnerDeckRank)
			if err != nil {
				return fmt.Errorf("save new deck rank for winner: %w", err)
			}
		}
	}

	if loserDeck != nil && loserDeck.IsComplete() {
		loserDeckRank, err = data.DB.DeckRanks(sess).FindCurrentStatsByDeckstring(
			loserDeck.DeckString,
		)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return fmt.Errorf("find deck stats for loser: %w", err)
		}

		if errors.Is(err, db.ErrNoMoreRows) {
			loserDeckRank = &data.DeckRank{DeckRank: &proto.DeckRank{
				DeckString:      loserDeck.DeckString,
				Class:           loserDeck.Class,
				CardIDs:         loserDeck.CardIDs,
				HighestPlayerID: loserStats.AccountID,
			}}

			err = sess.Save(loserDeckRank)
			if err != nil {
				return fmt.Errorf("save new deck rank for loser: %w", err)
			}
		}
	}

	// both decks are partial - do nothing
	if winnerDeckRank == nil && loserDeckRank == nil {
		return nil
	}

	// no winning player (tie)
	if !match.HasWinner() {
		if winnerDeckRank != nil {
			winnerDeckRank.TieCount++
		}

		if loserDeckRank != nil {
			loserDeckRank.TieCount++
		}
	}

	if match.HasWinner() {
		// both players were using the same deck, no score update
		if winnerDeckRank != nil && loserDeckRank != nil && winnerDeckRank.DeckString == loserDeckRank.DeckString {
			winnerDeckRank = loserDeckRank
		}

		if winnerDeckRank != nil {
			winnerDeckRank.WinCount++
		}

		if loserDeckRank != nil {
			switch match.Status {
			case proto.MatchStatus_COMPLETED:
				loserDeckRank.LossCount++

			case proto.MatchStatus_ABANDONED:
				loserDeckRank.LossCount++
				loserDeckRank.AbandonCount++

			case proto.MatchStatus_FORFEITED:
				loserDeckRank.LossCount++
				loserDeckRank.ForfeitCount++
			}
		}
	}

	// persist changes
	if winnerDeckRank != nil {
		outcome := ranking.Draw
		if match.HasWinner() {
			outcome = ranking.Win
		}

		if loserDeckRank != nil {
			rankState, err := ranking.UpdateRankState(
				outcome,
				&winnerDeckRank.RankState.State,
				&loserDeckRank.RankState.State,
			)
			if err != nil {
				return fmt.Errorf("update rank state for winner: %w", err)
			}

			winnerDeckRank.RankState = proto.RankState{State: *rankState}
			winnerDeckRank.Score = &rankState.RP
		}

		if saveWinnerStats {
			winnerDeckRank.HighestPlayerID, err = u.getHighestPlayerID(sess, winnerDeckRank.DeckString, season)
			if err != nil {
				return fmt.Errorf("get highest player ID for winner: %w", err)
			}

			if err := sess.Save(winnerDeckRank); err != nil {
				return fmt.Errorf("save deck rank for winner: %w", err)
			}
		}
	}

	if loserDeckRank != nil {
		outcome := ranking.Draw
		if match.HasWinner() {
			outcome = ranking.Loss
		}

		if winnerDeckRank != nil {
			rankState, err := ranking.UpdateRankState(
				outcome,
				&loserDeckRank.RankState.State,
				&winnerDeckRank.RankState.State,
			)
			if err != nil {
				return fmt.Errorf("update rank state for loser: %w", err)
			}

			loserDeckRank.RankState = proto.RankState{State: *rankState}
			loserDeckRank.Score = &rankState.RP
		}

		if saveLoserStats {
			loserDeckRank.HighestPlayerID, err = u.getHighestPlayerID(sess, loserDeckRank.DeckString, season)
			if err != nil {
				return fmt.Errorf("get highest player ID for loser: %w", err)
			}

			if err := sess.Save(loserDeckRank); err != nil {
				return fmt.Errorf("save deck rank for loser: %w", err)
			}
		}
	}

	return nil
}

func (u *SyncRankUpdater) getHighestPlayerID(sess db.Session, ds string, season uint16) (proto.AccountID, error) {
	seasonStartTime := data.SeasonStartTime(season)

	iter := sess.SQL().Iterator(`
		SELECT
			UNNEST(ARRAY_REMOVE(ARRAY[(CASE WHEN p1_has_deck_string THEN p1_id END), (CASE WHEN p2_has_deck_string THEN p2_id END)], NULL)) AS account_id,
			COUNT(1) AS times
		FROM (
			SELECT
				p1_id,
				p1_deck_string = ? AS p1_has_deck_string,
				p2_id,
				p2_deck_string = ? AS p2_has_deck_string
			FROM
				matches
			WHERE
				status = ?
				AND ended_at >= ?
				AND
				(
					(
						p1_game_mode = 1
						AND p1_deck_string = ?
						AND winning_player = 1
					)
						OR
					(
						p2_game_mode = 1
						AND p2_deck_string = ?
						AND winning_player = 2
					)
				)
			)
		AS deck_stats
		GROUP BY account_id
		ORDER BY times DESC
		LIMIT 1
	`, ds, ds, proto.MatchStatus_COMPLETED, seasonStartTime, ds, ds)
	defer iter.Close()

	result := struct {
		AccountID proto.AccountID `db:"account_id"`
	}{}

	err := iter.One(&result)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return 0, err
	}

	return result.AccountID, nil
}

type AsyncRankUpdater struct {
}

func NewAsyncRankUpdater() *AsyncRankUpdater {
	return &AsyncRankUpdater{}
}

func (u *AsyncRankUpdater) UpdateFromMatch(sess db.Session, match *data.Match, season uint16) error {
	if match == nil || match.ID == 0 {
		return nil
	}

	if !match.IsRankedConstructed() {
		return nil
	}

	err := data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(jobqueue.DeckRankUpdateWorkGroup, jobqueue.DeckRankUpdateTask{
		MatchID: match.ID,
		Season:  season,
	}, nil, nil)
	if err != nil {
		return fmt.Errorf("schedule DeckRankUpdateTask: %w", err)
	}

	return nil
}
