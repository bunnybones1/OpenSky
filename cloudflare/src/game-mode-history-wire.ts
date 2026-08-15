import type { GameMode, GameModeStatusHistory } from '@opensky/proto'

type Nullable<T> = T | null | undefined

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
