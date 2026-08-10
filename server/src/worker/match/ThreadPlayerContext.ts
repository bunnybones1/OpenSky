import {
  CLASS_LEN,
  encode,
  SW_PREFIX,
  VERSION
} from '@opensky/deck-string-codec'
import {
  Conquest,
  DeckClass,
  GameMode,
  PlayerRank,
  Quest
} from '@opensky/proto'
import {
  AccountWithPrismsAndCosmeticsInfo,
  GameServerMessage
} from '@opensky/shared/game-server-message-types'
import { PrivateSeed } from '@skyweaver/state-node-sys'
import { ethers, Wallet } from 'ethers'

import { PlayerStatus } from '../../model'
import { prismsToDeckClass } from '../../utils/helpers'
import { logger } from '../../utils/logger'
import { post } from './utils'

const randomDeckStringCheck = new RegExp(
  `^${SW_PREFIX}[A-Z]{${CLASS_LEN}}${VERSION}$`,
  'g'
)

export class ThreadPlayerContext {
  status: PlayerStatus
  privateSeed?: PrivateSeed
  deckString?: string
  realDeckString?: string
  account: AccountWithPrismsAndCosmeticsInfo
  name: string
  mode: GameMode
  isRandomDeck: boolean
  sessionStartTime: string
  playerSessionID: string
  finishedLoadingAssets: boolean
  opponentMuted: boolean

  botState: false | { subkeyWallet: Wallet; ggSent: boolean } = false

  activeQuests: Quest[]
  conquestInfo: Conquest | undefined

  inactiveTurns = 0
  moveCount = 0

  matchID: number

  constructor(
    matchID: number,
    privateSeed: PrivateSeed,
    mode: GameMode,
    account: AccountWithPrismsAndCosmeticsInfo,
    playerSessionID: string,
    botSubkey: false | string,
    activeQuests: Quest[] | undefined,
    conquestInfo?: Conquest
  ) {
    this.matchID = matchID
    this.privateSeed = privateSeed
    this.mode = mode
    this.account = account
    this.name = account?.name
    this.playerSessionID = playerSessionID
    this.opponentMuted = false
    this.activeQuests = activeQuests ?? []
    if (botSubkey) {
      const subkeyWallet = new Wallet(botSubkey)
      this.botState = { subkeyWallet, ggSent: false }
    }

    this.conquestInfo = conquestInfo
    // bots are always done loading assets
    this.finishedLoadingAssets = !!this.botState

    this.deckString =
      encode(
        VERSION,
        privateSeed.cards,
        prismsToDeckClass(privateSeed.prisms) ?? DeckClass.UNKNOWN_CLASS
      ) ?? ''

    this.isRandomDeck =
      !!this.deckString && !!this.deckString.match(randomDeckStringCheck)
  }

  get id(): string | null {
    return this.account
      ? this.account.address.toLowerCase()
      : this.privateSeed
      ? ethers.utils
          .getAddress(ethers.utils.hexlify(this.privateSeed.player))
          .toLowerCase()
      : null
  }

  get accountID(): number {
    return this.account ? this.account.id : 0
  }

  get rank(): PlayerRank {
    return (
      (this.mode === GameMode.RANKED_CONSTRUCTED
        ? this.account?.stats?.rankedConstructed?.playerRank
        : this.account?.stats?.rankedDiscovery?.playerRank) ??
      PlayerRank.UNKNOWN
    )
  }

  send(message: GameServerMessage): void {
    if (this.botState) {
      return
    }
    if (this.status !== PlayerStatus.CONNECTED) {
      logger.warn('PLAYER NOT CONNECTED MSG SKIPPED', { message })
      return
    }

    try {
      post({
        type: 'relay',
        matchID: this.matchID,
        playerID: this.id!,
        message
      })
    } catch (error) {
      logger.error('THREAD MESSAGE SENDING ERROR', error)
    }
  }
}
