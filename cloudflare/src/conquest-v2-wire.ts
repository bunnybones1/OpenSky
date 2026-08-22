import type {
  ConquestTreasureInfo,
  ConquestV2AccountTreasureProgress,
  ConquestV2Pool,
  ConquestV2PoolConfig,
  ConquestV2PoolConfigData,
  ConquestV2Summary,
  ConquestV2TreasureLevelSummary,
  ConquestV2TreasureProgress
} from '@opensky/proto'

type Nullable<T> = T | null | undefined

export interface SourceConquestV2PoolInput {
  amount: number
  totalWeight: number
}

export interface SourceConquestTreasureInfoInput {
  amountSilver: number
  amountUSDC: number
}

export interface SourceConquestV2PoolConfigDataInput {
  maxPoolCeiling?: Nullable<number>
  poolCeiling: number
  poolFloor: number
  topWeightUnitPrice: number
  bottomWeightUnitPrice: number
  weightPerSilverCard: number
}

export interface SourceConquestV2PoolConfigInput {
  default?: Nullable<SourceConquestV2PoolConfigDataInput>
  settings?: Nullable<SourceConquestV2PoolConfigDataInput>
  final?: Nullable<SourceConquestV2PoolConfigDataInput>
}

export interface SourceConquestV2TreasureLevelSummaryInput {
  level: number
  numberOfPlayers: number
  totalWeight: number
}

export interface SourceConquestV2SummaryInput {
  pool: number
  totalWeight: number
  weightUnitPrice: number
  treasureLevels?: Nullable<
    readonly SourceConquestV2TreasureLevelSummaryInput[]
  >
}

export interface SourceConquestV2TreasureProgressInput {
  treasureLevel: number
  treasurePoints: number
  treasurePointsRequired: number
}

export interface SourceConquestV2AccountTreasureProgressInput {
  accountID: number
  accountName: string
  progress?: Nullable<SourceConquestV2TreasureProgressInput>
}

/** Recreates encoding/json output for the generated Go Conquest V2 structs. */
export const sourceConquestV2PoolWire = (
  value: SourceConquestV2PoolInput
): ConquestV2Pool => ({
  amount: value.amount ?? 0,
  totalWeight: value.totalWeight ?? 0
})

export const sourceConquestTreasureInfoWire = (
  value: SourceConquestTreasureInfoInput
): ConquestTreasureInfo => ({
  amountSilver: value.amountSilver ?? 0,
  amountUSDC: value.amountUSDC ?? 0
})

export const sourceConquestTreasureInfoMapWire = (
  values: Readonly<
    Record<string | number, Nullable<SourceConquestTreasureInfoInput>>
  >
): Record<string, ConquestTreasureInfo> =>
  Object.fromEntries(
    Object.entries(values).map(([level, value]) => [
      level,
      value ? sourceConquestTreasureInfoWire(value) : null
    ])
  ) as unknown as Record<string, ConquestTreasureInfo>

export const sourceConquestV2PoolConfigDataWire = (
  value: SourceConquestV2PoolConfigDataInput
): ConquestV2PoolConfigData =>
  ({
    maxPoolCeiling: value.maxPoolCeiling ?? null,
    poolCeiling: value.poolCeiling ?? 0,
    poolFloor: value.poolFloor ?? 0,
    topWeightUnitPrice: value.topWeightUnitPrice ?? 0,
    bottomWeightUnitPrice: value.bottomWeightUnitPrice ?? 0,
    weightPerSilverCard: value.weightPerSilverCard ?? 0
  }) as unknown as ConquestV2PoolConfigData

export const sourceConquestV2PoolConfigWire = (
  value: SourceConquestV2PoolConfigInput
): ConquestV2PoolConfig =>
  ({
    default: value.default
      ? sourceConquestV2PoolConfigDataWire(value.default)
      : null,
    settings: value.settings
      ? sourceConquestV2PoolConfigDataWire(value.settings)
      : null,
    final: value.final ? sourceConquestV2PoolConfigDataWire(value.final) : null
  }) as unknown as ConquestV2PoolConfig

export const sourceConquestV2TreasureLevelSummaryWire = (
  value: SourceConquestV2TreasureLevelSummaryInput
): ConquestV2TreasureLevelSummary => ({
  level: value.level ?? 0,
  numberOfPlayers: value.numberOfPlayers ?? 0,
  totalWeight: value.totalWeight ?? 0
})

export const sourceNullableConquestV2TreasureLevelSummaryListWire = (
  values: SourceConquestV2SummaryInput['treasureLevels']
): ConquestV2TreasureLevelSummary[] | null =>
  values ? values.map(sourceConquestV2TreasureLevelSummaryWire) : null

export const sourceConquestV2SummaryWire = (
  value: SourceConquestV2SummaryInput
): ConquestV2Summary =>
  ({
    pool: value.pool ?? 0,
    totalWeight: value.totalWeight ?? 0,
    weightUnitPrice: value.weightUnitPrice ?? 0,
    treasureLevels: sourceNullableConquestV2TreasureLevelSummaryListWire(
      value.treasureLevels
    )
  }) as unknown as ConquestV2Summary

export const sourceConquestV2TreasureProgressWire = (
  value: SourceConquestV2TreasureProgressInput
): ConquestV2TreasureProgress => ({
  treasureLevel: value.treasureLevel ?? 0,
  treasurePoints: value.treasurePoints ?? 0,
  treasurePointsRequired: value.treasurePointsRequired ?? 0
})

export const sourceConquestV2AccountTreasureProgressWire = (
  value: SourceConquestV2AccountTreasureProgressInput
): ConquestV2AccountTreasureProgress =>
  ({
    accountID: value.accountID ?? 0,
    accountName: value.accountName ?? '',
    progress: value.progress
      ? sourceConquestV2TreasureProgressWire(value.progress)
      : null
  }) as unknown as ConquestV2AccountTreasureProgress

export const sourceNullableConquestV2AccountTreasureProgressListWire = (
  values: readonly SourceConquestV2AccountTreasureProgressInput[]
): ConquestV2AccountTreasureProgress[] | null =>
  values.length ? values.map(sourceConquestV2AccountTreasureProgressWire) : null
