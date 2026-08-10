import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'

export const OrangeStatus: MatchMakerStatus[] = [
  MatchMakerStatus.SEARCH_ERRORED,
  MatchMakerStatus.OPPONENT_DECLINED,
  MatchMakerStatus.TIMED_OUT
]

export const BlueStatus: MatchMakerStatus[] = [
  MatchMakerStatus.JOINING_QUEUE,
  MatchMakerStatus.SEARCHING,
  MatchMakerStatus.WAITING_OPPONENT
]

export const GreenSatus: MatchMakerStatus[] = [
  MatchMakerStatus.MATCH_FOUND,
  MatchMakerStatus.IN_PROGRESS_MATCH
]
