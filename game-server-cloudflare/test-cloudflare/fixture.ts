import { GameMode } from '@opensky/proto'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import { PrivateSeed } from '@skyweaver/state-metadata'

import { hexToBytes } from '../src/encoding'
import { CreateMatchRequest } from '../src/protocol'

export const PRINCIPAL_1 = '0x1111111111111111111111111111111111111111'
export const PRINCIPAL_2 = '0x2222222222222222222222222222222222222222'
export const PROPOSAL_ID = 'proposal-test-1'
export const BOT_SUBKEY_PRIVATE_KEY =
  '0x2222222222222222222222222222222222222222222222222222222222222222'
const BOT_SUBKEY_ADDRESS = '0x1563915e194d8cfba1943570603f7606a3115508'

const seed = (
  principal: string,
  subkey: number | string,
  randomByte: number
) =>
  ({
    player: [...hexToBytes(principal)],
    subkey:
      typeof subkey === 'string'
        ? [...hexToBytes(subkey)]
        : Array(20).fill(subkey),
    signature: Array(65).fill(0),
    prisms: ['str'],
    heroAbility: undefined,
    cards: [],
    randomSeed: Array(16).fill(randomByte),
    cardRarities: new Map()
  }) satisfies PrivateSeed

const account = (id: number, address: string, name: string) =>
  ({
    id,
    address,
    name,
    prisms: ['str'],
    deckEquipment: { stickers: [] }
  }) as unknown as AccountWithPrismsAndCosmeticsInfo

export const createMatchFixture = (
  overrides: Partial<Pick<MatchmakerStartMatchMessage, 'matchID' | 'replayID'>> & {
    botPlayer2?: boolean
    proposalId?: string
  } = {}
): CreateMatchRequest => ({
  proposalId: overrides.proposalId ?? PROPOSAL_ID,
  match: {
    type: 'start_match',
    matchID: overrides.matchID ?? 42,
    replayID: overrides.replayID ?? 'replay-test-42',
    player1: {
      privateSeed: seed(PRINCIPAL_1, 0x31, 1),
      gameMode: overrides.botPlayer2
        ? GameMode.PRACTICE_BOT
        : GameMode.RANKED_CONSTRUCTED,
      account: account(1, PRINCIPAL_1, 'Player One'),
      playerSessionID: 'session-1',
      botSubkey: false,
      spectateCode: 'spectate-1',
      quests: []
    },
    player2: {
      privateSeed: seed(
        PRINCIPAL_2,
        overrides.botPlayer2 ? BOT_SUBKEY_ADDRESS : 0x32,
        2
      ),
      gameMode: overrides.botPlayer2
        ? GameMode.PRACTICE_BOT
        : GameMode.RANKED_CONSTRUCTED,
      account: account(2, PRINCIPAL_2, 'Player Two'),
      playerSessionID: 'session-2',
      botSubkey: overrides.botPlayer2 ? BOT_SUBKEY_PRIVATE_KEY : false,
      spectateCode: 'spectate-2',
      quests: []
    },
    matchSettings: {
      turnTimer: true,
      season: 126,
      matchmakingCode: undefined,
      ...(overrides.botPlayer2 ? { botDifficulty: 0.34 } : {})
    }
  }
})
