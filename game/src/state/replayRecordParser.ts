import { gameStateParse } from '@opensky/shared/gameStateSerializer'
import { MatchLog } from '@opensky/shared/matchLog'

export const parseReplayRecords = (serialized: string): MatchLog[] =>
  gameStateParse(serialized) as MatchLog[]

export const fetchReplayRecords = async (uri: string): Promise<MatchLog[]> => {
  const response = await fetch(uri)
  return parseReplayRecords(await response.text())
}
