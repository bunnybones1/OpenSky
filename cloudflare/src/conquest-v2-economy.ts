import type {
  ConquestV2Pool,
  ConquestV2PoolConfig,
  ConquestV2Summary,
  ConquestV2TreasureLevelSummary
} from '@opensky/proto'

import { invalidArgument } from './errors'
import { goFloat32 } from './go-numbers'
import {
  sourceConquestV2PoolConfigWire,
  sourceConquestV2PoolWire,
  sourceConquestV2SummaryWire,
  type SourceConquestV2PoolConfigDataInput
} from './conquest-v2-wire'
import {
  CONQUEST_V2_TREASURE_LEVEL_SQL,
  CONQUEST_V2_TREASURE_TOTAL_WEIGHTS
} from './conquest-v2-treasure'

const EVENT_ID = 2
const MAX_INT32 = 2_147_483_647
const MAX_FLOAT32 = 3.4028234663852886e38

// Exact values from api/etc/opensky-api.conf.sample. The checked-in source
// leaves WeightPerSilverCard and PoolTTLSeconds unset, so both compile to zero.
const DEFAULT_CONFIG: SourceConquestV2PoolConfigDataInput = {
  maxPoolCeiling: 5_000,
  poolCeiling: 2_500,
  poolFloor: 100,
  topWeightUnitPrice: 1,
  bottomWeightUnitPrice: 0.9,
  weightPerSilverCard: 0
}
const POOL_TTL_SECONDS = 0

interface SettingsRow {
  pool_ceiling: number
  pool_floor: number
  top_weight_unit_price: number
  bottom_weight_unit_price: number
  weight_per_silver_card: number
  version: number
}

interface CacheRow {
  amount: number
  total_weight: number
  expires_at: string
}

export interface ConquestV2PoolConfigUpdate {
  poolCeiling?: unknown
  poolFloor?: unknown
  topWeightUnitPrice?: unknown
  bottomWeightUnitPrice?: unknown
  weightPerSilverCard?: unknown
}

const settingsData = (
  row: SettingsRow
): SourceConquestV2PoolConfigDataInput => ({
  maxPoolCeiling: null,
  poolCeiling: row.pool_ceiling,
  poolFloor: row.pool_floor,
  topWeightUnitPrice: row.top_weight_unit_price,
  bottomWeightUnitPrice: row.bottom_weight_unit_price,
  weightPerSilverCard: row.weight_per_silver_card
})

const finalConfig = (
  settings: SourceConquestV2PoolConfigDataInput
): SourceConquestV2PoolConfigDataInput => ({
  ...DEFAULT_CONFIG,
  poolCeiling:
    settings.poolCeiling > 0
      ? settings.poolCeiling
      : DEFAULT_CONFIG.poolCeiling,
  poolFloor:
    settings.poolFloor > 0 ? settings.poolFloor : DEFAULT_CONFIG.poolFloor,
  topWeightUnitPrice:
    settings.topWeightUnitPrice > 0
      ? settings.topWeightUnitPrice
      : DEFAULT_CONFIG.topWeightUnitPrice,
  bottomWeightUnitPrice:
    settings.bottomWeightUnitPrice > 0
      ? settings.bottomWeightUnitPrice
      : DEFAULT_CONFIG.bottomWeightUnitPrice,
  weightPerSilverCard:
    settings.weightPerSilverCard > 0
      ? settings.weightPerSilverCard
      : DEFAULT_CONFIG.weightPerSilverCard
})

const validateUpdate = (
  name: keyof ConquestV2PoolConfigUpdate,
  value: unknown,
  integer: boolean
): number | undefined => {
  if (value === undefined || value === null) return undefined
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (integer && !Number.isInteger(value)) ||
    Math.abs(value) > (integer ? MAX_INT32 : MAX_FLOAT32)
  ) {
    throw invalidArgument(`${name} is invalid`)
  }
  // The Go implementation deliberately ignores negative pointers rather than
  // rejecting the RPC. Preserve that distinction from malformed JSON values.
  if (value < 0) return undefined
  if (integer) return value
  return goFloat32(value)
}

const roundForPool = (value: number) =>
  Math.round(Math.fround(Math.fround(value) / 10)) * 10

const roundWeightUnitPrice = (pool: number, totalWeight: number) =>
  totalWeight > 0
    ? goFloat32(Math.round((pool / totalWeight) * 10_000) / 10_000)
    : 0

export class ConquestV2EconomyRepository {
  constructor(private readonly database: D1Database) {}

  private async settingsRow(): Promise<SettingsRow> {
    const row = await this.database
      .prepare(
        `SELECT pool_ceiling, pool_floor, top_weight_unit_price,
                bottom_weight_unit_price, weight_per_silver_card, version
         FROM conquest_v2_pool_settings WHERE singleton = 1`
      )
      .first<SettingsRow>()
    if (!row) throw new Error('Conquest V2 pool settings are missing')
    return row
  }

  async config(): Promise<ConquestV2PoolConfig> {
    const settings = settingsData(await this.settingsRow())
    return sourceConquestV2PoolConfigWire({
      default: { ...DEFAULT_CONFIG },
      settings,
      final: finalConfig(settings)
    })
  }

  async setConfig(
    actorUserId: string,
    update: ConquestV2PoolConfigUpdate,
    at = new Date()
  ): Promise<boolean> {
    const parsed = {
      poolCeiling: validateUpdate('poolCeiling', update.poolCeiling, true),
      poolFloor: validateUpdate('poolFloor', update.poolFloor, true),
      topWeightUnitPrice: validateUpdate(
        'topWeightUnitPrice',
        update.topWeightUnitPrice,
        false
      ),
      bottomWeightUnitPrice: validateUpdate(
        'bottomWeightUnitPrice',
        update.bottomWeightUnitPrice,
        false
      ),
      weightPerSilverCard: validateUpdate(
        'weightPerSilverCard',
        update.weightPerSilverCard,
        false
      )
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const beforeRow = await this.settingsRow()
      const before = settingsData(beforeRow)
      const after: SourceConquestV2PoolConfigDataInput = {
        maxPoolCeiling: null,
        poolCeiling: parsed.poolCeiling ?? before.poolCeiling,
        poolFloor: parsed.poolFloor ?? before.poolFloor,
        topWeightUnitPrice:
          parsed.topWeightUnitPrice ?? before.topWeightUnitPrice,
        bottomWeightUnitPrice:
          parsed.bottomWeightUnitPrice ?? before.bottomWeightUnitPrice,
        weightPerSilverCard:
          parsed.weightPerSilverCard ?? before.weightPerSilverCard
      }
      const timestamp = at.toISOString()
      const mutationId = crypto.randomUUID()
      const result = await this.database.batch([
        this.database
          .prepare(
            `UPDATE conquest_v2_pool_settings
             SET pool_ceiling = ?, pool_floor = ?, top_weight_unit_price = ?,
                 bottom_weight_unit_price = ?, weight_per_silver_card = ?,
                 version = version + 1, mutation_id = ?,
                 updated_by_user_id = ?, updated_at = ?
             WHERE singleton = 1 AND version = ?`
          )
          .bind(
            after.poolCeiling,
            after.poolFloor,
            after.topWeightUnitPrice,
            after.bottomWeightUnitPrice,
            after.weightPerSilverCard,
            mutationId,
            actorUserId,
            timestamp,
            beforeRow.version
          ),
        this.database
          .prepare(
            `INSERT INTO staff_conquest_config_audit
               (mutation_id, actor_user_id, before_json, after_json, created_at)
             SELECT ?, ?, ?, ?, ?
             FROM conquest_v2_pool_settings
             WHERE singleton = 1 AND mutation_id = ?`
          )
          .bind(
            mutationId,
            actorUserId,
            JSON.stringify(before),
            JSON.stringify(after),
            timestamp,
            mutationId
          )
      ])
      if ((result[0].meta.changes ?? 0) === 1) return true
    }
    throw new Error('set Conquest V2 pool config contention')
  }

  async treasureLevels(): Promise<ConquestV2TreasureLevelSummary[]> {
    const rows = await this.database
      .prepare(
        `SELECT ${CONQUEST_V2_TREASURE_LEVEL_SQL} AS level,
                COUNT(*) AS number_of_players
         FROM player_conquest_points
         WHERE event_id = ? AND current_points >= 250
         GROUP BY level`
      )
      .bind(EVENT_ID)
      .all<{ level: number; number_of_players: number }>()
    const counts = Array.from({ length: 11 }, () => 0)
    for (const row of rows.results) {
      counts[row.level] = row.number_of_players
    }
    return Array.from({ length: 10 }, (_, index) => {
      const level = index + 1
      return {
        level,
        numberOfPlayers: counts[level],
        totalWeight: goFloat32(
          Math.fround(counts[level]) *
            Math.fround(CONQUEST_V2_TREASURE_TOTAL_WEIGHTS[level])
        )
      }
    })
  }

  async poolSnapshot(at = new Date()): Promise<ConquestV2Pool> {
    const cache = await this.database
      .prepare(
        `SELECT amount, total_weight, expires_at
         FROM conquest_v2_pool_cache WHERE singleton = 1`
      )
      .first<CacheRow>()
    if (cache && new Date(cache.expires_at).getTime() > at.getTime()) {
      return sourceConquestV2PoolWire({
        amount: cache.amount,
        totalWeight: cache.total_weight
      })
    }

    const [config, levels] = await Promise.all([
      this.config(),
      this.treasureLevels()
    ])
    let totalWeight = 0
    for (const level of levels) {
      totalWeight = Math.fround(totalWeight + level.totalWeight)
    }
    const topTotalWeightPrice = roundForPool(
      Math.fround(totalWeight * Math.fround(config.final.topWeightUnitPrice))
    )
    const bottomTotalWeightPrice = roundForPool(
      Math.fround(totalWeight * Math.fround(config.final.bottomWeightUnitPrice))
    )
    const poolCeiling = Math.min(
      config.final.poolCeiling,
      config.final.maxPoolCeiling ?? config.final.poolCeiling
    )
    let amount = cache?.amount ?? 0
    if (amount < bottomTotalWeightPrice) amount = topTotalWeightPrice
    if (amount > topTotalWeightPrice) amount = topTotalWeightPrice
    if (amount < config.final.poolFloor) amount = config.final.poolFloor
    if (amount > poolCeiling) amount = poolCeiling
    const expiresAt = new Date(
      at.getTime() + POOL_TTL_SECONDS * 1_000
    ).toISOString()
    await this.database
      .prepare(
        `INSERT INTO conquest_v2_pool_cache
           (singleton, amount, total_weight, expires_at, updated_at)
         VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(singleton) DO UPDATE SET
           amount = excluded.amount,
           total_weight = excluded.total_weight,
           expires_at = excluded.expires_at,
           updated_at = excluded.updated_at`
      )
      .bind(amount, totalWeight, expiresAt, at.toISOString())
      .run()
    return sourceConquestV2PoolWire({ amount, totalWeight })
  }

  async summary(at = new Date()): Promise<ConquestV2Summary> {
    // Source SummaryGetter asks the pool manager first, then obtains a fresh
    // treasure-level snapshot for its response.
    const pool = await this.poolSnapshot(at)
    const treasureLevels = await this.treasureLevels()
    let totalWeight = 0
    for (const level of treasureLevels) {
      totalWeight = Math.fround(totalWeight + level.totalWeight)
    }
    return sourceConquestV2SummaryWire({
      pool: pool.amount,
      totalWeight: goFloat32(totalWeight),
      weightUnitPrice: roundWeightUnitPrice(pool.amount, totalWeight),
      treasureLevels
    })
  }
}
