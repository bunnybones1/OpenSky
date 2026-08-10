import { RewardCard, RewardExp, RewardRank, RewardType } from '@opensky/proto'

export enum PlayerStatus {
  CONNECTED = 'CONNECTED',
  LOOKING_FOR_MATCH = 'LOOKING_FOR_MATCH',
  IN_MATCH = 'IN_MATCH',
  DISCONNECTED_MID_MATCH = 'DISCONNECTED_MID_MATCH',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

export interface RewardsMessage {
  type: 'rewards'
  data: Array<{
    type: RewardType
    rank: RewardRank
    exp: RewardExp
    card: RewardCard
  }>
}
