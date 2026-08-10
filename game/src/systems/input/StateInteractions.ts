import { i18n } from '@opensky/language-manager'
import {
  GameState,
  Player,
  PlayerAction,
  PlayerActionError,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Vector3 } from 'three'

import { getCardCache } from '~/cardCache'
import { Components } from '~/components'
import CharacterComponent from '~/components/CharacterComponent'
import DraggableComponent from '~/components/DraggableComponent'
import { bounceAttachmentOnEntity } from '~/components/EnchantmentBounceComponent'
import OrderComponent from '~/components/OrderComponent'
import PlayableComponent from '~/components/PlayableComponent'
import { enchantIdsByName } from '~/helpers/enchantmentHelpers'
import { isNoActionsGameMode } from '~/helpers/envGameModeHelpers'
import {
  ownedZoneCollections,
  zoneCollections
} from '~/helpers/zoneCollections'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { showPlayerActionError } from '~/scenes/ui/containers/playerActionError'
import { OpenSkyUI } from '~/scenes/ui/OpenSkyUI'
import { store } from '~/state'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { switchSides } from '~/state/switchSides'
import { globalAccess } from '~/utils/globalAccess'
import { world } from '~/world'

import ChooseSystem from '../cardPositioning/ChooseSystem'

function targetedGameAction(
  sourceEntity: Entity<Components>,
  targetEntity: Entity<Components>
): Promise<void> {
  if (sourceEntity.has('character')) {
    return attackUnit(sourceEntity, targetEntity)
  } else {
    return castSpell(sourceEntity, targetEntity)
  }
}

export function takeAction(action: PlayerAction): Promise<void> {
  const p = store.dispatch(action)
  invalidateActions()
  return p.catch(err => {
    const state = store.state!
    updateTargets(
      globalAccess.ui as OpenSkyUI,
      {
        ...state,
        state: { ...state.state, moveCount: state.state.moveCount + 1 }
      },
      store.validActions
    )
    console.warn(err)
    throw err
  })
}

export function endTurn() {
  return takeAction({ type: 'EndTurn' })
    .catch(() => {
      // end turn failed..?
    })
    .then(switchSides)
}

function invalidateActions() {
  if (store && store.state && globalAccess.ui) {
    const state = store.state
    updateTargets(
      globalAccess.ui as OpenSkyUI,
      {
        ...state,
        state: { ...state.state, moveCount: state.state.moveCount + 1 }
      },
      []
    )
  }
}

const attackUnit = async (
  sourceEntity: Entity<Components>,
  targetEntity: Entity<Components>
) => {
  if (sourceEntity.has('card') && targetEntity.has('card')) {
    const attacker = sourceEntity.get('cardInstance')
    const target = targetEntity.get('cardInstance')
    if (!attacker) {
      console.error(
        `Tried to attack, but attacker ${sourceEntity.get(
          'card'
        )} isn't revealed.`
      )
      return
    }
    if (!target) {
      console.error(
        `Tried to attack, but target ${targetEntity.get(
          'card'
        )} isn't revealed.`
      )
      return
    }
    try {
      await takeAction({
        type: 'Attack',
        attackerID: attacker.id,
        defenderID: target.id
      })
    } catch (err) {
      if (err && err.error && isPlayerActionError(err.error.error)) {
        throw err.error.error
      } else {
        console.error(
          `Failed to attack ${target.id} with attacker ${attacker.id}`
        )
      }
    }
  }
}

const castSpell = async (
  sourceEntity: Entity<Components>,
  targetEntity: Entity<Components>
) => {
  const playedCard = sourceEntity.get('cardInstance')
  const targetCard = targetEntity.has('cardInstance')
    ? targetEntity.get('cardInstance')
    : undefined

  const originalAttachedTo =
    sourceEntity.has('attachedTo') && sourceEntity.get('attachedTo')
  const draggable = sourceEntity.get('draggable')
  if (draggable && draggable.dropTargets.items.includes(targetEntity)) {
    if (
      !(
        sourceEntity.has('cardInstance') &&
        sourceEntity.get('cardInstance').state.view.type === 'heroAbility'
      )
    ) {
      sourceEntity.get('zone').setUserZone('OptimisticCasting')
      sourceEntity.remove('attachedTo')
    }
  }
  if (!sourceEntity.has('order')) {
    sourceEntity.add(new OrderComponent(0))
    console.error(
      'updateZones: Entity does not have order component, it always should!'
    )
  }

  try {
    await takeAction({
      type: 'PlayCard',
      cardID: playedCard.id,
      targetID: targetCard?.id
    })
  } catch (err) {
    // we must put it back to its original zone & order
    sourceEntity.get('zone').setUserZone('UseState')
    if (originalAttachedTo) {
      if (!sourceEntity.has('attachedTo')) {
        sourceEntity.set('attachedTo', originalAttachedTo)
        console.warn(
          'Tried to re-instate removed attachedTo component, but entity already has one!'
        )
      }
    }
    if (err && err.error && isPlayerActionError(err.error.error)) {
      throw err.error.error
    } else {
      console.error(
        `Failed to play card ${playedCard.id} with target ${targetCard?.id}`
      )
    }
  }
}

export const autoDispatchAtEndOfTurn = (
  match: GameState<SkyWeaver>,
  player: Player
) => {
  const mulligans = store.validActions.filter(
    action => action.type === 'CommitCardSelection'
  )
  if (match) {
    if (mulligans.length > 0) {
      console.log('Dispatching good faith mulligan action on behalf of user')
      try {
        const system = world.getSystem(ChooseSystem)
        system.commit().catch(err => {
          console.warn(
            'Failed to dispatch good faith choose action at end of timer.',
            err
          )
        })
      } catch {
        console.warn(
          "Couldn't dispatch good faith choose action because the ChoosenSystem doesn't exist yet."
        )
      }
    } else if (
      match.state.currentPlayer === player &&
      match.state.players[match.state.currentPlayer].doneCardSelection
    ) {
      const endTurn = store.validActions.find(
        action => action.type === 'EndTurn'
      )
      if (endTurn) {
        console.log('Dispatching good faith end turn action on behalf of user')
        takeAction(endTurn).catch(err => {
          console.warn(
            'Failed to dispatch good faith endTurn at end of timer.',
            err
          )
        })
      }
    }
  }
}

function isPlayerActionError(obj: any): obj is PlayerActionError {
  if (obj) {
    switch (obj.playerActionErrorType) {
      case undefined:
        break

      case 'GameAlreadyFinished':
      case 'AlreadySelectedCards':
      case 'SelectedWrongNumberOfCards':
      case 'DuplicateIndexInCardSelection':
      case 'PlayedNonExistentCard':
      case 'PlayedOrphanedAttachedSpell':
      case 'InvalidIndexInCardSelection':
      case 'ActedOutOfTurn':
      case 'DidNotSelectCards':
      case 'DidOwnerAction':
      case 'Cheated':
      case 'PlayedNonFieldAttachedSpell':
      case 'PlayedUnplayableCard':
      case 'PlayedAnotherPlayersCard':
      case 'AttackedWithAnotherPlayersAttacker':
      case 'PlayedCardOnNonExistentTarget':
      case 'AttackedNonExistentDefender':
      case 'AttackedNonFieldDefender':
      case 'AttackedOwnDefender':
      case 'PlayedTargetingCardWithoutTarget':
      case 'AttackedWithNonExistentAttacker':
      case 'AttackedWithNonExistentAttackerAndDefender':
      case 'AttackedWithNonFieldAttacker':
      case 'AttackedWithSleepingAttacker':
      case 'AttackedWithExhaustedAttacker':
      case 'AttackedGuardedHero':
      case 'AttackedStealthUnit':
      case 'AttackedNonFrontUnitWithBlindAttacker':
      case 'AttackedWithAttackerWithRoots':
      case 'PlayedWithInsufficientMana':
      case 'PlayedWithInsufficientRoom':
      case 'PlayedTargetingCardOnTargetUntargetableByPlayer':
      case 'PlayedTargetingCardOnTargetUntargetableByOpponent':
      case 'PlayedTargetingCardOnInvalidTarget':
      case 'PlayedNonTargetingCardWithTarget':
      case 'UnscriptedTutorialAction':
        return true

      default:
        console.error(
          `unknown PlayerActionError type ${obj.playerActionErrorType}`
        )
        break
    }
  }

  return false
}

interface UnscriptedTutorialActionError {
  playerActionErrorType: 'UnscriptedTutorialAction'
}
export interface SourceActionError {
  msg: string
  entity?: Entity<Components>
}
function formatPlayerActionError(
  err: PlayerActionError | UnscriptedTutorialActionError,
  source?: Entity<Components>,
  destination?: Entity<Components>
): SourceActionError {
  switch (err.playerActionErrorType) {
    case 'GameAlreadyFinished':
    case 'AlreadySelectedCards':
    case 'DuplicateIndexInCardSelection':
    case 'PlayedNonExistentCard':
    case 'PlayedOrphanedAttachedSpell':
    case 'InvalidIndexInCardSelection':
    case 'DidNotSelectCards':
    case 'DidOwnerAction':
    case 'Cheated':
    case 'PlayedNonFieldAttachedSpell':
    case 'PlayedUnplayableCard':
    case 'PlayedAnotherPlayersCard':
    case 'AttackedWithAnotherPlayersAttacker':
    case 'AttackedWithNonExistentAttacker':
    case 'AttackedWithNonExistentAttackerAndDefender':
    case 'PlayedWithInsufficientMana':
    case 'PlayedWithInsufficientRoom':
    case 'UnscriptedTutorialAction':
      return {
        msg: i18n.t(`ui.actionError.${err.playerActionErrorType}`)
      }
    case 'SelectedWrongNumberOfCards':
      return {
        msg: i18n.t(`ui.actionError.${err.playerActionErrorType}`, {
          count: err.detail.expected
        })
      }
    case 'PlayedCardOnNonExistentTarget':
    case 'AttackedNonExistentDefender':
    case 'AttackedNonFieldDefender':
    case 'AttackedOwnDefender':
    case 'PlayedTargetingCardWithoutTarget':
    case 'ActedOutOfTurn':
    case 'AttackedWithNonFieldAttacker':
    case 'AttackedWithSleepingAttacker':
    case 'AttackedWithExhaustedAttacker':
    case 'AttackedNonFrontUnitWithBlindAttacker':
    case 'AttackedWithAttackerWithRoots':
    case 'PlayedNonTargetingCardWithTarget':
      return {
        msg: i18n.t(`ui.actionError.${err.playerActionErrorType}`),
        entity: source
      }

    case 'AttackedGuardedHero':
    case 'AttackedStealthUnit':
    case 'AttackedHeroWithDash':
    case 'PlayedTargetingCardOnTargetUntargetableByPlayer':
    case 'PlayedTargetingCardOnTargetUntargetableByOpponent':
    case 'PlayedTargetingCardOnInvalidTarget':
      return {
        msg: i18n.t(`ui.actionError.${err.playerActionErrorType}`),
        entity: destination
      }
    default: {
      const _: never = err
      throw _
    }
  }
}

let __validActions: PlayerAction[]

function __clearInteractives() {
  getDropTarget('field').remove('playable')

  getCardCache().forEachEntity(entity => {
    entity.remove('playable')
    // entity.remove('targetable')
  })
}

function __getDraggable(entity: Entity<Components>, ui: OpenSkyUI) {
  if (!entity.has('draggable')) {
    entity.add(
      new DraggableComponent(
        new Vector3(),
        true,
        async (dropped, droppedOnto) => {
          try {
            if (isNoActionsGameMode) {
              return
            }
            await targetedGameAction(dropped, droppedOnto)
          } catch (error) {
            if (isPlayerActionError(error)) {
              if (
                error.playerActionErrorType ===
                'PlayedTargetingCardOnTargetUntargetableByOpponent'
              ) {
                bounceAttachmentOnEntity(droppedOnto, enchantIdsByName.Shroud)
              }
              showPlayerActionError(
                ui,
                formatPlayerActionError(error, dropped, droppedOnto)
              )
            }
            matchInfoStore.timer.paused = false
          }
        },
        () => {
          __resetDraggableActions(ui)
        }
      )
    )
  }

  return entity.get('draggable')
}

let __lateFixTimeoutId: NodeJS.Timeout | undefined

function __requestLateFix(ui: OpenSkyUI) {
  if (__lateFixTimeoutId === undefined) {
    __lateFixTimeoutId = setTimeout(() => {
      __lateFixTimeoutId = undefined
      __resetDraggableActions(ui)
    }, 100)
  }
}

let __initReactiveEntityDraggablesUpdateInitd = false
function __initReactiveEntityDraggablesUpdate(ui: OpenSkyUI) {
  function boundRequestLateFix() {
    __requestLateFix(ui)
  }
  if (!__initReactiveEntityDraggablesUpdateInitd) {
    __initReactiveEntityDraggablesUpdateInitd = true
    for (const col of [
      zoneCollections.Attachment,
      CharacterComponent.entities,
      ownedZoneCollections.Player_Field,
      ownedZoneCollections.Player_Hand,
      zoneCollections.Staging
    ]) {
      col.listenForChange(boundRequestLateFix)
    }
  }
}

function __resetDraggableActions(ui: OpenSkyUI) {
  __clearInteractives()

  __initReactiveEntityDraggablesUpdate(ui)

  const undraggableIDs = store.undraggableIDs

  const zones = ownedZoneCollections
  const playEntities = [
    ...zones.Player_Hand.items,
    ...zones.Player_Staging.items,
    ...zones.Player_Attachment.items,
    ...zones.Player_Dragging.items,
    ...zones.Player_HeroAbility.items,
    ...zones.Player_HeroAbilityStaging.items
  ]

  const attackEntities = zones.Player_Field.items

  const targetEntities = [
    ...zones.Player_Field.items,
    ...zones.Opponent_Field.items
  ]

  for (const entities of [playEntities, attackEntities]) {
    for (const entity of entities) {
      if (entity.has('playable')) {
        entity.remove('playable')
      }
    }

    for (const entity of entities) {
      if (!entity.has('cardInstance')) {
        continue
      }

      const id = entity.get('cardInstance').id

      if (undraggableIDs.has(id)) {
        const error = undraggableIDs.get(id)!
        const draggable = __getDraggable(entity, ui)
        draggable.onDragStartWithoutTargets = () => {
          switch (error.playerActionErrorType) {
            case 'ActedOutOfTurn':
              if (entity.get('zone').current.cardStatus !== 'Hand') {
                showPlayerActionError(
                  ui,
                  formatPlayerActionError(error, entity)
                )
              }
              break
            case 'AttackedWithAttackerWithRoots': {
              bounceAttachmentOnEntity(entity, enchantIdsByName.Roots)
              showPlayerActionError(ui, formatPlayerActionError(error, entity))
              break
            }
            case 'AttackedNonFrontUnitWithBlindAttacker': {
              bounceAttachmentOnEntity(entity, enchantIdsByName.Blind)
              showPlayerActionError(ui, formatPlayerActionError(error, entity))
              break
            }

            default:
              showPlayerActionError(ui, formatPlayerActionError(error, entity))
              break
          }
        }
        // clear old drop targets so that onDragStartWithoutTargets is called!
        draggable.dropTargets.collect(() => {
          // nop
        })
      } else if (
        !__validActions.some(
          action =>
            (action.type === 'PlayCard' && action.cardID === id) ||
            (action.type === 'Attack' && action.attackerID === id)
        )
      ) {
        const draggable = __getDraggable(entity, ui)
        draggable.onDragStartWithoutTargets = () => {
          if (!matchInfoStore.cardSelectionsDone) {
            return
          }
          const isNotPlayerTurn =
            store.player !== store.state?.state.currentPlayer
          const message = isNotPlayerTurn
            ? i18n.t('ui.prompt.itsNotYourTurn')
            : i18n.t('ui.prompt.noPossibleTargets')
          showPlayerActionError(ui, { msg: message })
        }
        // clear old drop targets so that onDragStartWithoutTargets is called!
        draggable.dropTargets.collect(() => {
          // nop
        })
      } else if (entity.has('draggable')) {
        delete entity.get('draggable').onDragStartWithoutTargets
      }
    }
  }

  for (const entity of playEntities) {
    if (!entity.has('cardInstance')) {
      continue
    }

    const id = entity.get('cardInstance').id

    if (undraggableIDs.has(id)) {
      continue
    }

    if (
      __validActions.some(
        action => action.type === 'PlayCard' && action.cardID === id
      )
    ) {
      entity.add(new PlayableComponent())
    }

    const draggable = __getDraggable(entity, ui)
    draggable.startNewFrame()

    if (
      __validActions.some(
        action =>
          action.type === 'PlayCard' &&
          action.cardID === id &&
          action.targetID === undefined
      )
    ) {
      draggable.addDropTargetToFrame(getDropTarget('field'))
    }

    const thisCardHasAnyValidTargets = __validActions.some(
      action =>
        action.type === 'PlayCard' &&
        action.cardID === id &&
        action.targetID !== undefined
    )
    for (const targetEntity of targetEntities) {
      if (!targetEntity.has('cardInstance')) {
        continue
      }
      if (
        __validActions.some(
          action =>
            action.type === 'PlayCard' &&
            action.cardID === id &&
            action.targetID === targetEntity.get('cardInstance').id
        )
      ) {
        draggable.addDropTargetToFrame(targetEntity)
      } else if (thisCardHasAnyValidTargets) {
        draggable.secondaryDropTargets.push(targetEntity)
      }
    }

    draggable.finalizeFrame()
  }

  for (const entity of attackEntities) {
    if (!entity.has('cardInstance')) {
      continue
    }
    const id = entity.get('cardInstance').id

    if (undraggableIDs.has(id)) {
      continue
    }

    if (
      __validActions.some(
        action => action.type === 'Attack' && action.attackerID === id
      )
    ) {
      if (!entity.has('playable')) {
        entity.add(new PlayableComponent())
      }
    }

    const draggable = __getDraggable(entity, ui)
    draggable.startNewFrame()

    for (const targetEntity of targetEntities) {
      if (
        __validActions.some(
          action =>
            action.type === 'Attack' &&
            action.attackerID === id &&
            targetEntity.has('cardInstance') &&
            action.defenderID === targetEntity.get('cardInstance').id
        )
      ) {
        draggable.addDropTargetToFrame(targetEntity)
      } else {
        draggable.secondaryDropTargets.push(targetEntity)
      }
    }

    draggable.finalizeFrame()
  }
}

let targetsNonce = 0
export function resetTargetsCounter() {
  targetsNonce = 0
}
export function updateTargets(
  ui: OpenSkyUI,
  match: GameState<SkyWeaver>,
  validActions: PlayerAction[]
) {
  if (match.state.moveCount < targetsNonce) {
    return
  }
  targetsNonce = match.state.moveCount
  __validActions = validActions

  ui.setEndTurnButtonEnabled(__validActions.some(ac => ac.type === 'EndTurn'))

  ui.setEndTurnButtonHighlighted(
    __validActions.length === 1 && __validActions[0].type === 'EndTurn'
  )

  try {
    __resetDraggableActions(ui)
  } catch {
    // we probably tried to update targets in a pending state
  }
}
