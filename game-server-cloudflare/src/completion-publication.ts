import type { GameMode } from '@opensky/proto'

export interface MatchCompletionRequirements {
  rankedStats: boolean
  deckRankJob: boolean
  warmUpProgress: boolean
  conquestMode?: GameMode
  abandonPenalty: boolean
}

export interface MatchCompletionPublication {
  proposalId: string
  winner?: 0 | 1
  result: Record<string, unknown>
  endedAt: string
  requirements: MatchCompletionRequirements
}

/**
 * Publishes the player-visible match row only after every applicable durable
 * settlement receipt exists. The Go API performs these mutations in one SQL
 * transaction; Workers use individually atomic, idempotent stages so an alarm
 * can retry across Durable Object or D1 failures. This last statement is the
 * fail-closed publication barrier between those stages and match history.
 */
export const publishMatchCompletion = async (
  database: D1Database,
  publication: MatchCompletionPublication
) => {
  const resultJson = JSON.stringify(publication.result)
  const conquestMode = publication.requirements.conquestMode
  const result = await database
    .prepare(
      `UPDATE multiplayer_matches AS ledger
       SET status = 'ended', winner_player = ?, result_json = ?,
           ended_at = ?, updated_at = ?
       WHERE ledger.proposal_id = ?
         AND (
           ledger.status = 'active'
           OR (
             ledger.status = 'ended'
             AND ledger.winner_player IS ?
             AND ledger.result_json = ?
             AND ledger.ended_at = ?
           )
         )
         AND 2 = (
           SELECT COUNT(*)
           FROM multiplayer_match_authoritative_decks deck
           WHERE deck.proposal_id = ledger.proposal_id
             AND deck.captured_at = ?
         )
         AND EXISTS (
           SELECT 1 FROM multiplayer_match_progression progression
           WHERE progression.proposal_id = ledger.proposal_id
             AND progression.processed_at = ?
         )
         AND EXISTS (
           SELECT 1 FROM multiplayer_match_experience experience
           WHERE experience.proposal_id = ledger.proposal_id
             AND experience.processed_at = ?
         )
         AND (
           ? = 0 OR EXISTS (
             SELECT 1 FROM multiplayer_match_stats_applied stats
             WHERE stats.proposal_id = ledger.proposal_id
               AND stats.processed_at = ?
           )
         )
         AND (
           ? = 0 OR EXISTS (
             SELECT 1 FROM multiplayer_match_deck_rank_jobs job
             WHERE job.proposal_id = ledger.proposal_id
               AND job.created_at = ?
               AND (
                 ledger.status = 'ended'
                 OR (
                   job.status = 'PENDING'
                   AND job.attempt_count = 0
                 )
               )
           )
         )
         AND (
           ? = 0 OR EXISTS (
             SELECT 1 FROM multiplayer_match_warmups_applied warmup
             WHERE warmup.proposal_id = ledger.proposal_id
               AND warmup.processed_at = ?
           )
         )
         AND (
           ? = 0 OR (
             EXISTS (
               SELECT 1 FROM multiplayer_match_conquest_points points
               WHERE points.proposal_id = ledger.proposal_id
                 AND points.processed_at = ?
             )
             AND EXISTS (
               SELECT 1 FROM multiplayer_match_conquest_progress progress
               WHERE progress.proposal_id = ledger.proposal_id
                 AND progress.processed_at = ?
             )
             AND NOT EXISTS (
               SELECT 1 FROM player_conquests conquest
               WHERE conquest.user_id IN (
                 ledger.player1_user_id, ledger.player2_user_id
               )
                 AND conquest.mode = ?
                 AND conquest.status = 'REWARDS_PENDING'
                 AND json_extract(
                   conquest.match_progress,
                   '$."' || CAST(ledger.id AS TEXT) || '"'
                 ) IS NOT NULL
             )
           )
         )
         AND (
           ? = 0 OR EXISTS (
             SELECT 1 FROM multiplayer_abandon_penalties_applied penalty
             WHERE penalty.proposal_id = ledger.proposal_id
           )
         )`
    )
    .bind(
      publication.winner ?? null,
      resultJson,
      publication.endedAt,
      publication.endedAt,
      publication.proposalId,
      publication.winner ?? null,
      resultJson,
      publication.endedAt,
      publication.endedAt,
      publication.endedAt,
      publication.endedAt,
      publication.requirements.rankedStats ? 1 : 0,
      publication.endedAt,
      publication.requirements.deckRankJob ? 1 : 0,
      publication.endedAt,
      publication.requirements.warmUpProgress ? 1 : 0,
      publication.endedAt,
      conquestMode === undefined ? 0 : 1,
      publication.endedAt,
      publication.endedAt,
      conquestMode ?? '',
      publication.requirements.abandonPenalty ? 1 : 0
    )
    .run()
  if ((result.meta.changes ?? 0) < 1) {
    throw new Error('match completion publication requirements are incomplete')
  }
}
