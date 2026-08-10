import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Entity, System } from 'gg'
import { Matrix4, Vector3 } from 'three'

import { Components } from '~/components'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import FloatationComponent, {
  FloatationState
} from '~/components/FloatationComponent'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import {
  floatationAltitude,
  floatationAltitudeMotionless,
  floatationFrequency,
  floatationMagnitude,
  floatationPitchMagnitude,
  floatationPitchPhase
} from '~/tempDesignOptions'
import { timeUniformFactory } from '~/timeUniforms'
import { reduceMotionEnabled } from '~/userSettings'
import { decorateMethodAfter } from '~/utils/jsUtils'
import { addTranslationToMatrixFast } from '~/utils/threeMathUtils'
import { TrackableCollection } from '~/utils/TrackableCollection'

type E = Entity<Components>
const playerFieldCardInstances = ownedZoneCollections.Player_Field.intersect(
  CardInstanceComponent.entities
)
const opponentFieldCardInstances =
  ownedZoneCollections.Opponent_Field.intersect(CardInstanceComponent.entities)
const playersCharactersThatCanAttack = new TrackableCollection<E>(
  'playersCharactersThatCanAttack'
)
const opponentsCharactersThatCanAttack = new TrackableCollection<E>(
  'opponentsCharactersThatCanAttack'
)

export default class FloatationSystem extends System<Components> {
  private _activeListeners: Map<CardInstanceComponent, () => void> = new Map()

  private _activeFloatationStates = new Map<
    Entity<Components>,
    FloatationState
  >()

  private _floatingEntities = new Array<Entity<Components>>()

  init() {
    FloatationComponent.entities.listenForAdd(e => {
      if (!this._floatingEntities.includes(e)) {
        this._floatingEntities.push(e)
      }
      const transform = e.get('transform')
      const floatationComponent = e.getComponent('floatation')!
      const floatationState = floatationComponent.value
      if (this._activeFloatationStates.has(e)) {
        floatationComponent.value = this._activeFloatationStates.get(e)!
      }
      this._activeFloatationStates.set(e, floatationState)
      floatationState.decoupleMatrixHackFromTransform = decorateMethodAfter(
        transform,
        'updateMatrix',
        function modifyMatrix() {
          if (floatationState.strength !== 0) {
            const phase =
              floatationFrequency.value *
              (timeUniformFactory.getUniformHelper(floatationState.speed).time +
                floatationState.offset) *
              Math.PI

            addTranslationToMatrixFast(
              transform.matrix,
              floatationState.vec,
              floatationState.strength *
                ((reduceMotionEnabled.value ? 0 : floatationMagnitude.value) *
                  Math.sin(phase) +
                  (reduceMotionEnabled.value
                    ? floatationAltitudeMotionless.value
                    : floatationAltitude.value))
            )
            if (!reduceMotionEnabled.value) {
              const rotMat = new Matrix4()
              rotMat.makeRotationX(
                Math.cos(phase + floatationPitchPhase.value) *
                  -floatationPitchMagnitude.value *
                  floatationState.strength
              )
              transform.matrix.multiply(rotMat)
            }
            transform.matrixWorldNeedsUpdate = true
          }
        }
      )
    })

    playersCharactersThatCanAttack.listenForAdd(e => {
      addFloatation(e)
    })
    opponentsCharactersThatCanAttack.listenForAdd(e => {
      addFloatation(e)
    })

    playersCharactersThatCanAttack.listenForRemove(e => {
      removeFloatation(e)
    })
    opponentsCharactersThatCanAttack.listenForRemove(e => {
      removeFloatation(e)
    })

    const onAddedToField = (e: E, collection: TrackableCollection<E>) => {
      const cb = () => {
        if (!e.has('cardInstance')) {
          return
        }

        const card = e.get('cardInstance')!

        const canAttack = card.state.view.attackState === 'Ready'
        if (canAttack && e.has('player') === matchInfoStore.isPlayerTurn) {
          collection.add(e)
        } else {
          collection.remove(e)
        }
      }

      const component = e.getComponent('cardInstance')!
      listenToProperty(matchInfoStore, 'isPlayerTurn', cb, false)
      listenToProperty(component.value.state.view, 'attackState', cb)
      this._activeListeners.set(component, cb)
    }

    playerFieldCardInstances.listenForAdd(e => {
      onAddedToField(e, playersCharactersThatCanAttack)
    })
    opponentFieldCardInstances.listenForAdd(e => {
      onAddedToField(e, opponentsCharactersThatCanAttack)
    })

    const onRemovedFromField = (e: E, collection: TrackableCollection<E>) => {
      if (!e.has('cardInstance')) {
        return
      }
      collection.remove(e)
      const component = e.getComponent('cardInstance')!
      const cb = this._activeListeners.get(component)!
      stopListeningToProperty(matchInfoStore, 'isPlayerTurn', cb)
      stopListeningToProperty(component.value.state.view, 'attackState', cb)
      this._activeListeners.delete(component)
    }

    playerFieldCardInstances.listenForRemove(e => {
      onRemovedFromField(e, playersCharactersThatCanAttack)
    })
    opponentFieldCardInstances.listenForRemove(e => {
      onRemovedFromField(e, opponentsCharactersThatCanAttack)
    })
  }

  update() {
    for (let i = this._floatingEntities.length - 1; i >= 0; i--) {
      const e = this._floatingEntities[i]
      const floatationState = this._activeFloatationStates.get(e)!
      if (floatationState.strength === 0) {
        removeFromArray(this._floatingEntities, e)
        this._activeFloatationStates.delete(e)
        if (floatationState.decoupleMatrixHackFromTransform) {
          floatationState.decoupleMatrixHackFromTransform()
          floatationState.decoupleMatrixHackFromTransform = undefined
        }
      } else {
        if (e.has('transform')) {
          e.get('transform').updateMatrix()
          e.get('transform').updateMatrixWorld(false)
        }
      }
    }
  }
}

function addFloatation(e: E) {
  const component = e.getComponent('floatation')
  if (!component) {
    e.add(new FloatationComponent(new Vector3(0, 0.002, 0)))
  }
}

function removeFloatation(e: E) {
  e.remove('floatation')
}
