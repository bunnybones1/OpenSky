import {
  CardClass,
  DeckClass,
  GameMode,
  Hero,
  PlayerRank
} from '@opensky/proto'

export const BOT_PLAYER_ADDRESS = '0x0000000000000000000000000000000000000000'

export type Rarity = 'base' | 'silver' | 'gold'

export interface PlayerMatchStat {
  opponentId: string
}

export interface MatchmakerPlayer {
  address: string
  mode: GameMode
  prisms: CardClass[]
  sessionId: string
  playerSessionId: string
  clientVersionHash: string
  ipAddress: string
  initTimestampMs: number
  score: number
  rank: PlayerRank
  lostLastMatch: boolean
  cards?: Map<number, Rarity>
  conquestProgress: Array<'UNKNOWN' | 'WIN' | 'LOSS' | 'DRAW'>
  recentMatches: PlayerMatchStat[]
  shadowBannedUntilMs?: number
  matchProposalId?: string
}

export const createPlayer = (
  overrides: Partial<MatchmakerPlayer> & Pick<MatchmakerPlayer, 'address'>
): MatchmakerPlayer => ({
  mode: GameMode.RANKED_CONSTRUCTED,
  prisms: [CardClass.STR],
  sessionId: '',
  playerSessionId: '',
  clientVersionHash: '',
  ipAddress: '',
  initTimestampMs: 0,
  score: 0,
  rank: PlayerRank.UNKNOWN,
  lostLastMatch: false,
  cards: new Map(),
  conquestProgress: [],
  recentMatches: [],
  ...overrides,
  address: overrides.address.toLowerCase()
})

export const createBotPlayer = (
  mode: GameMode,
  overrides: Partial<MatchmakerPlayer> = {}
) => createPlayer({ address: BOT_PLAYER_ADDRESS, mode, ...overrides })

export const isBot = (player: MatchmakerPlayer) =>
  player.address === BOT_PLAYER_ADDRESS

export const waitTimeMs = (player: MatchmakerPlayer, nowMs = Date.now()) =>
  player.initTimestampMs > 0 ? Math.max(0, nowMs - player.initTimestampMs) : 0

export const matchmakingScore = (player: MatchmakerPlayer) =>
  Math.min(1600, player.score)

export const currentConquestWins = (player: MatchmakerPlayer) =>
  player.conquestProgress.filter(result => result === 'WIN').length

export const isRankedMatch = (player: MatchmakerPlayer) =>
  player.mode === GameMode.RANKED_CONSTRUCTED ||
  player.mode === GameMode.RANKED_DISCOVERY

export const isPracticePvpMatch = (player: MatchmakerPlayer) =>
  player.mode === GameMode.PRACTICE_PVP

export const isChallengeMatch = (player: MatchmakerPlayer) =>
  player.mode === GameMode.CHALLENGE_CONSTRUCTED ||
  player.mode === GameMode.CHALLENGE_DISCOVERY

export const isConquestMatch = (player: MatchmakerPlayer) =>
  player.mode === GameMode.CONQUEST_CONSTRUCTED ||
  player.mode === GameMode.CONQUEST_DISCOVERY

const dualDeckClasses: Record<string, DeckClass> = {
  'STR:HRT': DeckClass.STH,
  'STR:AGY': DeckClass.STA,
  'STR:INT': DeckClass.STI,
  'STR:WIS': DeckClass.STW,
  'HRT:AGY': DeckClass.HRA,
  'HRT:INT': DeckClass.HRI,
  'HRT:WIS': DeckClass.HRW,
  'AGY:INT': DeckClass.AGI,
  'AGY:WIS': DeckClass.AGW,
  'INT:WIS': DeckClass.INW
}

export const prismsToDeckClass = (prisms: CardClass[]): DeckClass => {
  if (prisms.length === 1 && prisms[0] !== CardClass.TOK) {
    return prisms[0] as unknown as DeckClass
  }
  if (prisms.length === 2) {
    return (
      dualDeckClasses[`${prisms[0]}:${prisms[1]}`] ?? DeckClass.UNKNOWN_CLASS
    )
  }
  return DeckClass.UNKNOWN_CLASS
}

const deckClassHeroes: Record<DeckClass, Hero> = {
  [DeckClass.UNKNOWN_CLASS]: Hero.UNKNOWN,
  [DeckClass.STR]: Hero.ADA,
  [DeckClass.AGY]: Hero.SAMYA,
  [DeckClass.STA]: Hero.FOX,
  [DeckClass.WIS]: Hero.LOTUS,
  [DeckClass.STW]: Hero.TITUS,
  [DeckClass.AGW]: Hero.IRIS,
  [DeckClass.HRT]: Hero.BOURAN,
  [DeckClass.STH]: Hero.HORIK,
  [DeckClass.HRA]: Hero.ZOEY,
  [DeckClass.HRW]: Hero.AXEL,
  [DeckClass.INT]: Hero.ARI,
  [DeckClass.STI]: Hero.MIRA,
  [DeckClass.AGI]: Hero.MAI,
  [DeckClass.INW]: Hero.BANJO,
  [DeckClass.HRI]: Hero.SITTI
}

export const playerHero = (player: MatchmakerPlayer) =>
  deckClassHeroes[prismsToDeckClass(player.prisms)]

const rankOrder: Record<PlayerRank, number> = {
  [PlayerRank.UNKNOWN]: 0,
  [PlayerRank.UNRANKED]: 1,
  [PlayerRank.WANDERER]: 2,
  [PlayerRank.TRAINEE]: 3,
  [PlayerRank.APPRENTICE]: 4,
  [PlayerRank.EXPERT]: 5,
  [PlayerRank.MASTER]: 6,
  [PlayerRank.GRANDWEAVER]: 7
}

export const compareRanks = (left: PlayerRank, right: PlayerRank) =>
  rankOrder[left] - rankOrder[right]
