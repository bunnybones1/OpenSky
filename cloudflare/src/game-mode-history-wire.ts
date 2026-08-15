import type {
  GameMode,
  GameModeStatusHistory,
  GameModesStatus
} from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourceGameModesStatusInput = Partial<GameModesStatus>

/** Recreates encoding/json output for the generated Go game-mode switches. */
export const sourceGameModesStatusWire = (
  status: SourceGameModesStatusInput
): GameModesStatus => ({
  tutorial: status.tutorial ?? false,
  practicePVP: status.practicePVP ?? false,
  practiceBot: status.practiceBot ?? false,
  warmUp: status.warmUp ?? false,
  rankedConstructed: status.rankedConstructed ?? false,
  rankedDiscovery: status.rankedDiscovery ?? false,
  conquestConstructed: status.conquestConstructed ?? false,
  conquestDiscovery: status.conquestDiscovery ?? false,
  challengeConstructed: status.challengeConstructed ?? false,
  challengeDiscovery: status.challengeDiscovery ?? false
})

export type SourceGameModeStatusHistoryInput = {
  id?: number
  gameMode?: Nullable<GameMode>
  enabled?: boolean
  createdAt?: Nullable<string>
}

/** Recreates encoding/json output for generated Go game-mode history rows. */
export const sourceGameModeStatusHistoryWire = (
  history: SourceGameModeStatusHistoryInput
): GameModeStatusHistory =>
  ({
    id: history.id ?? 0,
    gameMode: history.gameMode ?? null,
    enabled: history.enabled ?? false,
    createdAt: history.createdAt ?? null
  }) as unknown as GameModeStatusHistory

export const sourceNullableGameModeStatusHistoryListWire = (
  history: readonly SourceGameModeStatusHistoryInput[]
): GameModeStatusHistory[] | null =>
  history.length ? history.map(sourceGameModeStatusHistoryWire) : null
