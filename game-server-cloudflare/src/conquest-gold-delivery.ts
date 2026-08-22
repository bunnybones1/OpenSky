import {
  type ConquestGoldDeliveryQueueMessage,
  isConquestGoldDeliveryQueueMessage
} from '@opensky/shared/conquest-gold-delivery'

const MAX_QUEUE_DELAY_SECONDS = 24 * 60 * 60

interface MatchRow {
  id: number
  player1_user_id: string | null
  player2_user_id: string | null
}

interface GoldDeliveryRow {
  conquest_id: number
  deliver_at: string
}

const queueDelaySeconds = (deliverAt: string, now: Date) => {
  const deliveryTime = Date.parse(deliverAt)
  const nowTime = now.getTime()
  if (!Number.isFinite(deliveryTime) || !Number.isFinite(nowTime)) {
    throw new Error('Conquest Gold delivery time is invalid')
  }
  return Math.min(
    MAX_QUEUE_DELAY_SECONDS,
    Math.max(0, Math.ceil((deliveryTime - nowTime) / 1_000))
  )
}

/**
 * Publishes transport hints only after D1 owns the complete entitlement.
 * Callers register this promise with DurableObjectState.waitUntil so Queue
 * availability cannot withhold the terminal match signal.
 */
export const publishConquestGoldDeliveriesForMatch = async (
  database: D1Database,
  queue: Queue<ConquestGoldDeliveryQueueMessage>,
  proposalId: string,
  now = new Date()
): Promise<{ published: number }> => {
  const match = await database
    .prepare(
      `SELECT id, player1_user_id, player2_user_id
       FROM multiplayer_matches
       WHERE proposal_id = ? AND status = 'ended'`
    )
    .bind(proposalId)
    .first<MatchRow>()
  if (!match) throw new Error('completed match ledger row was not found')
  if (!match.player1_user_id || !match.player2_user_id) {
    throw new Error('completed Conquest match identities are unavailable')
  }

  const rows = await database
    .prepare(
      `SELECT delivery.conquest_id, delivery.deliver_at
       FROM player_conquest_gold_deliveries delivery
       JOIN player_conquests conquest ON conquest.id = delivery.conquest_id
       WHERE json_extract(conquest.match_progress, ?) IS NOT NULL
         AND delivery.user_id IN (?, ?)
         AND delivery.status IN ('PENDING', 'DISABLED')
         AND delivery.application_status = 'READY'
       ORDER BY delivery.conquest_id`
    )
    .bind('$."' + match.id + '"', match.player1_user_id, match.player2_user_id)
    .all<GoldDeliveryRow>()

  const results = await Promise.allSettled(
    rows.results.map(row => {
      const body: ConquestGoldDeliveryQueueMessage = {
        kind: 'CONQUEST_GOLD',
        version: 1,
        conquestId: row.conquest_id
      }
      if (!isConquestGoldDeliveryQueueMessage(body)) {
        throw new Error('Conquest Gold Queue message is invalid')
      }
      const delaySeconds = queueDelaySeconds(row.deliver_at, now)
      return queue.send(body, {
        contentType: 'json',
        ...(delaySeconds > 0 ? { delaySeconds } : {})
      })
    })
  )
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  )
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(failure => failure.reason),
      'Conquest Gold delayed Queue publication failed'
    )
  }
  return { published: results.length }
}
