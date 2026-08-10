import { translate } from '@opensky/language-manager'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { isOnlineGame } from '@opensky/shared/gameModes'
import {
  CardInstance,
  findInstanceID,
  SkyWeaver
} from '@skyweaver/state-metadata'

import { USE_WORKER } from '~/constants'
import { debugPlayerStates } from '~/debugAccounts'
import { abort } from '~/helpers/abortError'
import { gameMode } from '~/helpers/envGameModeHelpers'
import { MatchEndType } from '~/helpers/typeHelpers'
import queryParams from '~/queryParams'
import keyboard from '~/systems/input/keyboard'

import { accountsStore } from './AccountStore'
import { ActionHistory, ActionHistoryEvent } from './ActionHistory'
import Worker from './state.worker?worker'
import FakeWorker from './state.workerless'
import WorkerProxyStore, { PlayerStatus } from './WorkerProxyStore'
const stateWorker = USE_WORKER ? new Worker() : new FakeWorker()
if ('onerror' in stateWorker) {
  stateWorker.onerror = err => abort(err)
}

export const store = new WorkerProxyStore(stateWorker as unknown as Worker)

if (queryParams.playOnSpace) {
  keyboard.listenToKey(' ', () => {
    store.dispatch(store.validActions[0])
  })
}
export const actionHistory = new ActionHistory(store)

function logActionHistory(event: ActionHistoryEvent) {
  const players = accountsStore.accounts!.map(account => account.name)

  const name = (card?: CardInstance<SkyWeaver>) => {
    if (card === undefined) {
      return 'Unknown Card'
    } else if (card.state.view.type === 'hero') {
      return players[findInstanceID(card.id, store.state!).player]
    } else {
      return translate.card.name(card.base)
    }
  }

  switch (event.type) {
    case 'StartTurn':
      console.log('History:', `${players[event.player]} begin turn`)
      break

    case 'EndTurn':
      console.log('History:', `${players[event.player]} end turn`)
      break

    case 'PlayCard':
      console.log(
        'History:',
        `${players[event.player]} played ${name(event.card)}${
          event.target !== undefined ? ` on ${name(event.target)}` : ''
        }`
      )
      break

    case 'Attack':
      console.log(
        'History:',
        `${name(event.attacker)} ${
          event.defenderDied ? 'killed' : 'attacked'
        } ${name(event.defender)}${event.attackerDied ? ' and died' : ''}`
      )
      break
  }

  for (const item of event.items) {
    switch (item.type) {
      case 'Damage':
        console.log(
          'History:  ',
          `${name(item.target)} took ${item.damage} ${
            item.isWither ? 'wither ' : ''
          }${item.isLifesteal ? 'lifesteal ' : ''}damage from ${name(
            item.source
          )}`
        )
        break

      case 'Kill':
        console.log('History:  ', `${name(item.card)} died`)
        break

      case 'Dust':
        console.log('History:  ', `${name(item.card)} was dusted`)
        break

      case 'Attach':
        console.log('History:  ', `attached ${name(item.child)}`)
        break

      case 'SetOwner':
        console.log(
          'History:  ',
          `${players[item.owner]} took ${name(item.card)}`
        )
        break

      case 'SetCost':
        console.log(
          'History:  ',
          `${name(item.card)}'s cost set to ${item.cost}`
        )
        break

      case 'SetHealth':
        console.log(
          'History:  ',
          `${name(item.card)}'s health set to ${item.health}`
        )
        break

      case 'SetPower':
        console.log(
          'History:  ',
          `${name(item.card)}'s power set to ${item.power}`
        )
        break

      case 'ChangeCost':
        console.log(
          'History:  ',
          `${name(item.card)}'s cost changed by ${item.cost}`
        )
        break

      case 'ChangeHealth':
        console.log(
          'History:  ',
          `${name(item.card)}'s health changed by ${item.health}`
        )
        break

      case 'ChangePower':
        console.log(
          'History:  ',
          `${name(item.card)}'s power changed by ${item.power}`
        )
        break

      case 'SetElement':
        console.log(
          'History:  ',
          `${name(item.card)}'s element set to ${item.element}`
        )
        break

      case 'SetTraits':
        console.log(
          'History:  ',
          `${name(item.card)}'s traits set to ${
            item.traits.length > 0 ? item.traits.join(', ') : 'none'
          }`
        )
        break

      case 'ClearTraits':
        console.log('History:  ', `${name(item.card)} lost all traits`)
        break

      case 'AddTrait':
        console.log('History:  ', `${name(item.card)} gained ${item.trait}`)
        break

      case 'RemoveTrait':
        console.log('History:  ', `${name(item.card)} lost ${item.trait}`)
        break

      case 'Silence':
        console.log('History:  ', `${name(item.card)} silenced`)
        break

      case 'ChangeMana':
        console.log(
          'History:  ',
          `${players[item.player]}'s mana changed by ${item.mana}`
        )
        break

      case 'ChangeMaxMana':
        console.log(
          'History:  ',
          `${players[item.player]}'s max mana changed by ${item.mana}`
        )
        break

      case 'Draw':
        if (item.card) {
          console.log(
            'History:  ',
            `${players[item.player]} drew ${name(item.card)}`
          )
        } else {
          console.log(
            'History:  ',
            `${players[item.player]} couldn't draw card`
          )
        }
        break

      case 'Trigger':
        console.log(
          'History:  ',
          `Triggered ${name(item.card)}'s ${JSON.stringify(
            item.effect
          )} effect because of ${item.effectType}`
        )
        break

      case 'Fatigue':
        console.log('History:  ', `${item.card} fatigued`)
        break

      case 'Mulligan':
        console.log(
          'History:  ',
          `${players[item.player]} mulliganed ${item.mulligan
            .map(name)
            .join(', ')} for ${item.draw.map(name).join(', ')}`
        )
        break
    }
  }
}

if (queryParams.logActionHistory) {
  actionHistory.subscribe(logActionHistory)
}

const createStateChangePromise = (
  predicate: (store: WorkerProxyStore) => boolean
): Promise<WorkerProxyStore> =>
  new Promise(resolve => {
    const unsubscribe = store.subscribeToStateChanges(store => {
      if (predicate(store)) {
        unsubscribe()
        resolve(store)
      }
    })
  })

const createStorePromise = (
  predicate: (store: WorkerProxyStore) => boolean
): Promise<WorkerProxyStore> =>
  new Promise(resolve => {
    const unsubscribe = store.subscribeToStoreEvents(store => {
      if (predicate(store)) {
        unsubscribe()
        resolve(store)
      }
    })
  })
export const firstState = createStateChangePromise(store => !!store.state)

export const matchStarted = createStateChangePromise(store => !!store.state)
export const accountsLoaded = createStorePromise(
  store =>
    storeHelper.useFakeStoreData ||
    (!!accountsStore.accounts && store.player !== undefined)
)

export function matchEnded() {
  return isOnlineGame(gameMode)
    ? createStorePromise(
        store =>
          storeHelper.fakeGameOver ||
          store.playerStatus === PlayerStatus.DONE_MATCH
      )
    : createStateChangePromise(store => store.isGameOver)
}

export const cardSelectionFinished = createStateChangePromise(
  store =>
    !!store.state && store.state.state.players.every(p => p.doneCardSelection)
)
export const rewardsUpdated = createStorePromise(store => !!store.rewards)

export const storeHelper = {
  fakeGameOver: false,
  useFakeStoreData: queryParams.fakeStoreData,
  getPlayer() {
    return this.useFakeStoreData ? 0 : store.player ?? 0
  },
  getAccounts(): [
    AccountWithPrismsAndCosmeticsInfo,
    AccountWithPrismsAndCosmeticsInfo
  ] {
    if (this.useFakeStoreData) {
      accountsStore.fake = true
    }
    return accountsStore.accounts!
  },
  getPlayerAccount() {
    return this.getAccounts()[this.getPlayer()]
  },
  async getWinner() {
    if (this.useFakeStoreData) {
      return queryParams.fakeWinner === -1 ? undefined : queryParams.fakeWinner
    } else {
      await matchEnded()
      if (!store.state || store.state.state.status.type !== 'GameOver') {
        throw new Error('Game is not over!')
      }
      return store.state.state.status.winner
    }
  },
  async getPlayerStates() {
    if (this.useFakeStoreData) {
      return debugPlayerStates
    } else {
      await firstState
      return store.state!.state.players
    }
  },
  async getPlayerState() {
    return (await this.getPlayerStates())[this.getPlayer()]
  },
  async getMatchEndType(): Promise<MatchEndType> {
    const winner = await storeHelper.getWinner()
    return winner === undefined
      ? 'tie'
      : winner === this.getPlayer()
      ? 'victory'
      : 'defeat'
  },
  getPlayerConceded() {
    return store.playerConceded || queryParams.fakeConcede
  }
}
