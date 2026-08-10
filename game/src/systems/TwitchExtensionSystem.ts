import { i18n, translate } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import { BaseCard, Rarity } from '@skyweaver/state-metadata'
import { Entity, System } from 'gg'

import { getCardCache } from '~/cardCache'
import { Components } from '~/components'
import env from '~/env'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { store } from '~/state'

import {
  sortEntitiesByOrder,
  sortEntitiesByReverseOrder
} from './cardPositioning/ecsUtils'

const cblServerURL: null | string = null

// ms to wait before attempting reconnection if we've never successfully connected.
// This might seem a bit long, but if the user didn't have the Twitch ext open,
// they can always toggle the checkbox to get it picked up right away
// or wait just 30 seconds (and since they're in-game and streaming, that's not long)
const FIRST_CONNECT_DELAY = 30000

// ms to wait before attempting reconnection if we've connected once already.
// If the twitch ext disconnects mid-game, we can assume the user does want to use it
// and we can reconnect more aggressively.
const RECONNECT_DELAY = 5000

const logTwitchExtConnection = false

const log = (...args: any[]) => {
  if (logTwitchExtConnection) {
    console.log('[twitch]', ...args)
  }
}

const useCBLTwitchExtension = new NiceBooleanParameter(
  'use-twitch-ext',
  () => i18n.t('common:options.gameOptions.twitchIntegration'),
  true,
  device.isMobile ? 'never' : 'game',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export default class TwitchExtensionSystem extends System<Components> {
  private dirty = false
  private connection: WebSocket | null = null
  private reconnectOnClose = true
  private wsID = 0
  private reconnectionTimeout: NodeJS.Timeout | null = null
  private hasEverConnected: boolean = false
  constructor() {
    super()
    log('Twitch ext checkbox checked? ', useCBLTwitchExtension.value)
    // Listen gives you "first one for free"
    useCBLTwitchExtension.listen(buttonChecked => {
      const enabled = buttonChecked && !device.isMobile
      if (enabled) {
        this.reconnectOnClose = true
        this.connect()
        log('Checkbox checked, starting to connect to CBL server...')
      } else {
        log('Cancelling connections to CBL server...')
        this.reconnectOnClose = false
        if (this.connection) {
          this.connection.close(CLOSE_WITHOUT_RECONNECT)
        }
        if (this.reconnectionTimeout) {
          clearTimeout(this.reconnectionTimeout)
        }
      }
    })
    getCardCache().subscribe(() => {
      this.signalNeedsUpdate()
    })
  }

  signalNeedsUpdate() {
    this.dirty = true
  }

  update() {
    if (this.dirty && this.connection && this.connection.readyState === 1) {
      const state = this.makeGameState()
      this.connection.send(JSON.stringify(state, undefined, 2))
      this.dirty = false
    }
  }

  connect() {
    if (!cblServerURL) {
      return
    }

    const i = this.wsID++
    log(i, 'Connecting to CBL server...')
    this.connection = new WebSocket(cblServerURL)

    this.connection.addEventListener('open', () => {
      log(i, 'Connected to CBL server!')
      this.hasEverConnected = true
      this.signalNeedsUpdate()
    })

    const close = (evt: any) => {
      log(
        i,
        'Got close. Reason: ',
        evt,
        'reconnectOnClose:',
        this.reconnectOnClose
      )
      if (evt !== CLOSE_WITHOUT_RECONNECT) {
        reconnect()
      }
    }
    this.connection.addEventListener('close', close)
    const error = (e: any) => {
      log(i, 'Got error:', e)
      reconnect()
    }
    this.connection.addEventListener('error', error)

    const reconnect = () => {
      if (!this.reconnectOnClose) {
        log(i, 'Not reconnecting.')
        return
      }
      if (this.connection) {
        this.connection.removeEventListener('close', close)
        this.connection.removeEventListener('error', error)
        this.connection.close(CLOSE_WITHOUT_RECONNECT)
        this.connection = null
        log(i, 'killed old WS')
      }
      const reconnectDelay = this.hasEverConnected
        ? RECONNECT_DELAY
        : FIRST_CONNECT_DELAY
      log(i, 'Reconnecting in ', reconnectDelay, 'ms')
      this.reconnectionTimeout = setTimeout(() => {
        log(i, 'Reconnecting...')
        this.connect()
      }, reconnectDelay)
    }
  }
  private makeGameState(): CBLOpenSkyGameState {
    const zones = ownedZoneCollections
    const cblGameState: CBLOpenSkyGameState = {
      gameVersion: env.GITCOMMIT,
      player: {
        deck: zones.Player_Deck.items
          .sort(sortByCostThenName)
          .map(e => cardFromEntity(e) as Card),
        field: zones.Player_Field.items
          .sort(sortEntitiesByOrder)
          .map(e => cardFromEntity(e) as Card | HeroCard),
        graveyard: zones.Player_Graveyard.items
          .sort(sortEntitiesByReverseOrder)
          .map(e => cardFromEntity(e) as Card),
        hand: zones.Player_Hand.items
          .sort(sortEntitiesByOrder)
          .map(e => cardFromEntity(e) as Card)
      },
      enemy: {
        field: zones.Opponent_Field.items
          .sort(sortEntitiesByOrder)
          .map(e => cardFromEntity(e) as Card | HeroCard),
        graveyard: zones.Opponent_Graveyard.items
          .sort(sortEntitiesByReverseOrder)
          .map(e => cardFromEntity(e) as Card),
        hand: zones.Opponent_Hand.items
          .sort(sortEntitiesByOrder)
          .map(e => cardFromEntity(e) as Card | null)
      },
      matchEnded: store.isGameOver
    }
    return cblGameState
  }
}

function cardFromEntity(entity: Entity<Components>): Card | HeroCard | null {
  if (!entity.has('cardInstance')) {
    return null
  }
  const id = entity.get('cardInstance').base
  const attachment = entity.get('cardInstance').attachment
  const attachmentId = getCardCache().getInstance(attachment)?.base
  if (id === 'Hero') {
    const prisms =
      store.state?.state.players[getCardCache().cardOwner(entity)].prisms
    if (!prisms) {
      console.error('No valid prisms for hero card!')
      return null
    }
    return {
      id,
      rarity: 'base',
      prism: prismsToDeckClass(prisms),
      attachmentId
    }
  }
  return {
    id,
    rarity: cardEntityRarity(entity),
    attachmentId
  }
}

function cardEntityRarity(card: Entity<Components>): Rarity {
  return card.get('cardInstance').state.view.rarity
}

interface Card {
  id: BaseCard
  rarity: Rarity
  attachmentId?: BaseCard
}

// Reference: https://gist.github.com/arilotter/8afa85ace339fb4deef3112255166661
// We currently don't have images for heroes, but during a game they may get different attachments.
// When mousing over a hero, you should only show the attachment , if there is any.
interface HeroCard {
  id: 'Hero'
  rarity: Rarity // currently unused
  prism: string // currently unused
  attachmentId?: BaseCard
}

interface CBLOpenSkyGameState {
  gameVersion: string
  player: {
    hand: Card[] // Hand is ordered left-to-right.
    field: Array<Card | HeroCard> // Field is ordered left-to-right
    graveyard: Card[] // Graveyard is ordered bottom-to-top
    deck: Card[] // Deck is unordered.
  }
  enemy: {
    hand: Array<Card | null> // Hand is ordered left-to-right. Some cards in your enemy's hand may be visible to you.
    field: Array<Card | HeroCard> // Field is ordered left-to-right
    graveyard: Card[] // Graveyard is ordered bottom-to-top
  }
  matchEnded: boolean
}

const CLOSE_WITHOUT_RECONNECT = 4001

function sortByCostThenName(a: Entity<Components>, b: Entity<Components>) {
  const aInstance = a.get('cardInstance')
  const bInstance = b.get('cardInstance')
  const aCost = aInstance.state.view.cost
  const bCost = bInstance.state.view.cost
  const aName = translate.card.name(aInstance.base)
  const bName = translate.card.name(bInstance.base)

  const costCompare =
    typeof aCost === 'number' && typeof bCost === 'number'
      ? aCost - bCost
      : typeof aCost === 'number'
      ? 1
      : -1
  return costCompare * 100 + aName.localeCompare(bName) / 100
}
