import { GameMode, ItemType, QuestPeriodicity, QuestType } from '@opensky/proto'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import { PrivateSeed } from '@skyweaver/state-metadata'

import { hexToBytes } from '../src/encoding'
import { CreateMatchRequest } from '../src/protocol'

export const PRINCIPAL_1 = '0x1111111111111111111111111111111111111111'
export const PRINCIPAL_2 = '0x2222222222222222222222222222222222222222'
export const PROPOSAL_ID = 'proposal-test-1'
export const PLAYER_SESSION_ID_1 = 'fcea164c-7449-449c-9718-27b98bd18c64'
export const PLAYER_SESSION_ID_2 = 'a51d9958-b28c-4f0a-812f-4e622f387f31'
export const BOT_SUBKEY_PRIVATE_KEY =
  '0x2222222222222222222222222222222222222222222222222222222222222222'
const BOT_SUBKEY_ADDRESS = '0x1563915e194d8cfba1943570603f7606a3115508'
const PLAYER_1_BOT_SUBKEY_PRIVATE_KEY =
  '0x3333333333333333333333333333333333333333333333333333333333333333'
const PLAYER_1_BOT_SUBKEY_ADDRESS =
  '0x5cbdd86a2fa8dc4bddd8a8f69dba48572eec07fb'

const seed = (principal: string, subkey: number | string, randomByte: number) =>
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
    deckEquipment: { stickers: [5] }
  }) as unknown as AccountWithPrismsAndCosmeticsInfo

export const createMatchFixture = (
  overrides: Partial<
    Pick<MatchmakerStartMatchMessage, 'matchID' | 'replayID'>
  > & {
    botPlayer1?: boolean
    botPlayer2?: boolean
    gameMode?: GameMode
    proposalId?: string
    releaseVersion?: string
  } = {}
): CreateMatchRequest => ({
  proposalId: overrides.proposalId ?? PROPOSAL_ID,
  releaseVersion: overrides.releaseVersion ?? 'test-release',
  match: {
    type: 'start_match',
    matchID: overrides.matchID ?? 42,
    replayID: overrides.replayID ?? 'replay-test-42',
    player1: {
      privateSeed: seed(
        PRINCIPAL_1,
        overrides.botPlayer1 ? PLAYER_1_BOT_SUBKEY_ADDRESS : 0x31,
        1
      ),
      gameMode:
        overrides.gameMode ??
        (overrides.botPlayer1 || overrides.botPlayer2
          ? GameMode.PRACTICE_BOT
          : GameMode.RANKED_CONSTRUCTED),
      account: account(1, PRINCIPAL_1, 'Player One'),
      playerSessionID: PLAYER_SESSION_ID_1,
      botSubkey: overrides.botPlayer1
        ? PLAYER_1_BOT_SUBKEY_PRIVATE_KEY
        : false,
      spectateCode: 'spectate-1',
      quests: overrides.botPlayer1
        ? []
        : [
            {
              id: 7001,
              position: 1,
              questType: QuestType.Strengthweaver,
              progress: 0,
              endProgress: 1,
              reward: { itemType: ItemType.SW_XP, amount: 100 },
              periodicity: QuestPeriodicity.DAILY,
              isRerollable: false,
              isClaimable: false,
              isClaimed: false,
              isNew: true
            }
          ]
    },
    player2: {
      privateSeed: seed(
        PRINCIPAL_2,
        overrides.botPlayer2 ? BOT_SUBKEY_ADDRESS : 0x32,
        2
      ),
      gameMode:
        overrides.gameMode ??
        (overrides.botPlayer1 || overrides.botPlayer2
          ? GameMode.PRACTICE_BOT
          : GameMode.RANKED_CONSTRUCTED),
      account: account(2, PRINCIPAL_2, 'Player Two'),
      playerSessionID: PLAYER_SESSION_ID_2,
      botSubkey: overrides.botPlayer2 ? BOT_SUBKEY_PRIVATE_KEY : false,
      spectateCode: 'spectate-2',
      quests: !overrides.botPlayer2
        ? [
            {
              id: 7002,
              position: 1,
              questType: QuestType.Strengthweaver,
              progress: 0,
              endProgress: 1,
              reward: { itemType: ItemType.SW_XP, amount: 100 },
              periodicity: QuestPeriodicity.DAILY,
              isRerollable: false,
              isClaimable: false,
              isClaimed: false,
              isNew: true
            }
          ]
        : []
    },
    matchSettings: {
      turnTimer: true,
      season: 126,
      matchmakingCode: undefined,
      ...(overrides.botPlayer1 || overrides.botPlayer2
        ? { botDifficulty: 0.34 }
        : {})
    }
  }
})
