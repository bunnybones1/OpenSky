import { PlayerRank } from '~/lib/proto'

export enum PlayerRankNum {
  UNKNOWN = 0,
  UNRANKED = 1,
  WANDERER = 2,
  TRAINEE = 3,
  APPRENTICE = 4,
  EXPERT = 5,
  MASTER = 6,
  GRANDWEAVER = 7
}

export const PlayerRankMap = {
  [PlayerRank.UNKNOWN]: PlayerRankNum.UNKNOWN,
  [PlayerRank.UNRANKED]: PlayerRankNum.UNRANKED,
  [PlayerRank.WANDERER]: PlayerRankNum.WANDERER,
  [PlayerRank.TRAINEE]: PlayerRankNum.TRAINEE,
  [PlayerRank.APPRENTICE]: PlayerRankNum.APPRENTICE,
  [PlayerRank.EXPERT]: PlayerRankNum.EXPERT,
  [PlayerRank.MASTER]: PlayerRankNum.MASTER,
  [PlayerRank.GRANDWEAVER]: PlayerRankNum.GRANDWEAVER
}

export const isConquestLocked = (playerRank: PlayerRank) =>
  PlayerRankMap[playerRank] < PlayerRankNum.TRAINEE

const _isIOSUpdateNeeded = () => {
  //#TODO: Temporary due to WASM bug see https://github.com/horizon-games/issue-tracker/issues/7552\
  const ua = navigator.userAgent
  return ua.includes('iPhone OS 15_4_1') || ua.includes('iPhone OS 15_4_0')
}

export const isIOSUpdateNeeded = _isIOSUpdateNeeded()

export const MATCH_FOUND_DIALOG_ID = 'MATCH_FOUND_DIALOG_ID'
