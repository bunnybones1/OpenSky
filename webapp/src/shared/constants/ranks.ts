import { PlayerRank, PlayerRankStage } from '@opensky/proto'

export const RANKS_WITH_STAGES = [
  PlayerRank.WANDERER,
  PlayerRank.TRAINEE,
  PlayerRank.APPRENTICE,
  PlayerRank.EXPERT
] as const

export type PlayerRankWithStage = `${(typeof RANKS_WITH_STAGES)[number]}_${
  | PlayerRankStage.STAGE_I
  | PlayerRankStage.STAGE_II
  | PlayerRankStage.STAGE_III}`

export const RANKS_WITHOUT_STAGES = [
  PlayerRank.UNRANKED,
  PlayerRank.MASTER,
  PlayerRank.GRANDWEAVER
] as const

export type PlayerRankWithoutStage =
  `${(typeof RANKS_WITHOUT_STAGES)[number]}_${PlayerRankStage.STAGE_NONE}`

export const RANK_ORDER = [
  PlayerRank.UNRANKED,
  PlayerRank.WANDERER,
  PlayerRank.TRAINEE,
  PlayerRank.APPRENTICE,
  PlayerRank.EXPERT,
  PlayerRank.MASTER,
  PlayerRank.GRANDWEAVER
] as const

export const RANK_AND_STAGE_ORDER: {
  [key in PlayerRankWithStage | PlayerRankWithoutStage]: {
    playerRank: PlayerRank
    playerRankStage: PlayerRankStage
    rankUpAmount: number
    rankUpCurrency: 'XP' | 'RP'
  }
} = {
  UNRANKED_STAGE_NONE: {
    playerRank: PlayerRank.WANDERER,
    playerRankStage: PlayerRankStage.STAGE_I,
    rankUpAmount: 200,
    rankUpCurrency: 'XP'
  },
  WANDERER_STAGE_I: {
    playerRank: PlayerRank.WANDERER,
    playerRankStage: PlayerRankStage.STAGE_II,
    rankUpAmount: 100,
    rankUpCurrency: 'RP'
  },
  WANDERER_STAGE_II: {
    playerRank: PlayerRank.WANDERER,
    playerRankStage: PlayerRankStage.STAGE_III,
    rankUpAmount: 200,
    rankUpCurrency: 'RP'
  },
  WANDERER_STAGE_III: {
    playerRank: PlayerRank.TRAINEE,
    playerRankStage: PlayerRankStage.STAGE_I,
    rankUpAmount: 300,
    rankUpCurrency: 'RP'
  },
  TRAINEE_STAGE_I: {
    playerRank: PlayerRank.TRAINEE,
    playerRankStage: PlayerRankStage.STAGE_II,
    rankUpAmount: 400,
    rankUpCurrency: 'RP'
  },
  TRAINEE_STAGE_II: {
    playerRank: PlayerRank.TRAINEE,
    playerRankStage: PlayerRankStage.STAGE_III,
    rankUpAmount: 500,
    rankUpCurrency: 'RP'
  },
  TRAINEE_STAGE_III: {
    playerRank: PlayerRank.APPRENTICE,
    playerRankStage: PlayerRankStage.STAGE_I,
    rankUpAmount: 600,
    rankUpCurrency: 'RP'
  },
  APPRENTICE_STAGE_I: {
    playerRank: PlayerRank.APPRENTICE,
    playerRankStage: PlayerRankStage.STAGE_II,
    rankUpAmount: 700,
    rankUpCurrency: 'RP'
  },
  APPRENTICE_STAGE_II: {
    playerRank: PlayerRank.APPRENTICE,
    playerRankStage: PlayerRankStage.STAGE_III,
    rankUpAmount: 800,
    rankUpCurrency: 'RP'
  },
  APPRENTICE_STAGE_III: {
    playerRank: PlayerRank.EXPERT,
    playerRankStage: PlayerRankStage.STAGE_I,
    rankUpAmount: 900,
    rankUpCurrency: 'RP'
  },
  EXPERT_STAGE_I: {
    playerRank: PlayerRank.EXPERT,
    playerRankStage: PlayerRankStage.STAGE_II,
    rankUpAmount: 1000,
    rankUpCurrency: 'RP'
  },
  EXPERT_STAGE_II: {
    playerRank: PlayerRank.EXPERT,
    playerRankStage: PlayerRankStage.STAGE_III,
    rankUpAmount: 1100,
    rankUpCurrency: 'RP'
  },
  EXPERT_STAGE_III: {
    playerRank: PlayerRank.MASTER,
    playerRankStage: PlayerRankStage.STAGE_NONE,
    rankUpAmount: 1200,
    rankUpCurrency: 'RP'
  },
  MASTER_STAGE_NONE: {
    playerRank: PlayerRank.GRANDWEAVER,
    playerRankStage: PlayerRankStage.STAGE_NONE,
    rankUpAmount: 100,
    rankUpCurrency: 'RP'
  },
  GRANDWEAVER_STAGE_NONE: {
    playerRank: PlayerRank.GRANDWEAVER,
    playerRankStage: PlayerRankStage.STAGE_NONE,
    rankUpAmount: 0,
    rankUpCurrency: 'RP'
  }
}

export enum GameType {
  CONSTRUCTED = 'CONSTRUCTED',
  DISCOVERY = 'DISCOVERY'
}
