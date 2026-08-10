import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Entity, System } from 'gg'

import { Components } from '~/components'
import TraitGuardComponent from '~/components/TraitGuardComponent'
import {
  opponentStealthUnits,
  playerStealthUnits
} from '~/helpers/compoundCollections'
import { matchInfoStore, PlayerInfo } from '~/state/stores/MatchInfoStore'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'

import { meshAnimationPlayer } from '../animation/meshAnimationPlayer'

function initStealthDropHelper(
  entities: ReadonlyTrackableCollection<Entity<Components>>,
  playerInfo: PlayerInfo
) {
  entities.listenForAdd(entity => {
    findAndAffectCardArtMaterial(entity.get('mesh'), mat => {
      mat.stealthActive.value = true
      entity.get('stealth').material = mat
    })
  })
  entities.listenForRemove(entity => {
    if (entity.has('mesh')) {
      findAndAffectCardArtMaterial(entity.get('mesh'), mat => {
        mat.stealthActive.value = false
      })
    }
  })
  function updateUnit(entity: Entity<Components>) {
    entity.get('stealth').unveiled = playerInfo.heroHitThisTurn

    meshAnimationPlayer({ ID: 'stealthToggle', entity, playerInfo })
  }
  listenToProperty(playerInfo, 'heroHitThisTurn', () => {
    for (const ent of entities.items) {
      updateUnit(ent)
    }
  })
  entities.listenForAdd(updateUnit)
}

const playerUnits = playerStealthUnits.exclude(TraitGuardComponent.entities)
const opponentUnits = opponentStealthUnits.exclude(TraitGuardComponent.entities)

export default class StealthDropSystem extends System<Components> {
  init() {
    initStealthDropHelper(playerUnits, matchInfoStore.playerInfo)
    initStealthDropHelper(opponentUnits, matchInfoStore.opponentInfo)
  }
  update() {
    //nothing
  }
}
