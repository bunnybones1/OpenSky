import { Trait } from '@skyweaver/state-metadata'
import { Entity, System } from 'gg'
import {
  AdditiveBlending,
  Euler,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Vector2,
  Vector3
} from 'three'

import { getAssetsManager } from '~/assets/index'
import { Components } from '~/components'
import StealthComponent from '~/components/StealthComponent'
import { RENDER_ORDERS } from '~/constants'
import {
  armorCharacter,
  armorCharacterCardVisuals,
  bannerActivatedCharacters,
  bannerCharacter,
  bannerCharacterCardVisuals,
  guardCharacter,
  lifestealCharacter,
  lifestealCharacterCardVisuals,
  stealthCharacter,
  stealthCharacterCardVisuals,
  witherCharacter,
  witherCharacterCardVisuals
} from '~/helpers/compoundCollections'
import { shineBannerFrom } from '~/helpers/effectHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import { findContainingScene, findObject3DByName } from '~/utils/threeUtils'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'

import { TextureAnimation } from './TextureAnimationSystem'

const __spritesheetAnimsByTrait: Map<Trait, TextureAnimation> = new Map()

const traitRenderOrders = {
  armor: 0,
  wither: 3,
  banner: 5,
  lifesteal: 6
}

const ANGLE_UP = new Euler(Math.PI * -0.5, 0, 0)
const HEALTH_ATTACK_X = 0.015
const HEALTH_ATTACK_Y = 0.0089
const DEPTH = 0.002
const SCALE = 0.00023

function tryRemoveTrait(visualsRoot: Object3D, trait: Trait) {
  try {
    const mesh = findObject3DByName(visualsRoot, `trait-effect-${trait}`)
    visualsRoot.remove(mesh)
  } catch (err) {
    console.error(
      `tryRemoveTrait: Could not find mesh for trait-effect-${trait}`
    )
  }
}

const __spritesheetTraitAnimLib = {
  armor: {
    position: new Vector3(HEALTH_ATTACK_X, DEPTH, HEALTH_ATTACK_Y),
    scale: new Vector2(128, 128).multiplyScalar(SCALE),
    textureAnimationOptions: {
      map: 'keywordArmorAnimation',
      columns: 4,
      rows: 8,
      fps: 30
    }
  },
  banner: {
    position: new Vector3(0, DEPTH, -0.012),
    scale: new Vector2(170, 210).multiplyScalar(SCALE),
    textureAnimationOptions: {
      map: 'keywordBannerAnimation',
      columns: 4,
      rows: 8,
      fps: 30,
      materialOptions: {
        blending: AdditiveBlending
      }
    }
  },
  lifesteal: {
    position: new Vector3(-HEALTH_ATTACK_X, DEPTH, HEALTH_ATTACK_Y),
    scale: new Vector2(128, 128).multiplyScalar(SCALE),
    textureAnimationOptions: {
      map: 'keywordLifestealAnimation',
      columns: 4,
      rows: 8,
      fps: 30,
      materialOptions: {
        blending: AdditiveBlending
      }
    }
  },
  wither: {
    position: new Vector3(-HEALTH_ATTACK_X, DEPTH, HEALTH_ATTACK_Y),
    scale: new Vector2(128, 128).multiplyScalar(SCALE),
    textureAnimationOptions: {
      map: 'keywordWitherAnimation',
      columns: 4,
      rows: 8,
      fps: 30
    }
  }
} as const

type SpritesheetAnimTrait = keyof typeof __spritesheetTraitAnimLib

function getTraitSpriteSheetAnimation(trait: SpritesheetAnimTrait) {
  const params = __spritesheetTraitAnimLib[trait]

  if (!__spritesheetAnimsByTrait.has(trait)) {
    __spritesheetAnimsByTrait.set(
      trait,
      new TextureAnimation({
        assetsManager: getAssetsManager(),
        ...params.textureAnimationOptions
      })
    )
  }

  const anim = __spritesheetAnimsByTrait.get(trait)!
  const mesh = new Mesh(getSharedPlaneBufferGeometry(), anim.material)
  mesh.frustumCulled = false

  mesh.name = `trait-effect-${trait}`
  mesh.renderOrder = RENDER_ORDERS.traits + traitRenderOrders[trait]
  mesh.rotation.copy(ANGLE_UP)

  mesh.position.copy(params.position)

  mesh.scale.set(params.scale.x, params.scale.y, 1)
  return mesh
}

function makeAddTraitGraphic(trait: SpritesheetAnimTrait) {
  return function addTraitGraphic(entity: Entity<Components>) {
    entity.get('mesh').add(getTraitSpriteSheetAnimation(trait))
  }
}

function makeRemoveTraitGraphic(trait: SpritesheetAnimTrait) {
  return function removeTraitGraphic(entity: Entity<Components>) {
    if (entity.has('mesh')) {
      tryRemoveTrait(entity.get('mesh'), trait)
    }
  }
}

function listenForTraitChangesVisuals(
  collection: ReadonlyTrackableCollection<Entity<Components>>,
  trait: SpritesheetAnimTrait
) {
  collection.listenForAdd(makeAddTraitGraphic(trait))
  collection.listenForRemove(makeRemoveTraitGraphic(trait))
}

function makePlayTraitSound(trait: Trait) {
  return function playTraitSound() {
    playSound('audioFxCommon', `Trait${trait}Gain`)
  }
}

function listenForTraitChangesAudio(
  collection: ReadonlyTrackableCollection<Entity<Components>>,
  trait: Trait
) {
  collection.listenForAdd(makePlayTraitSound(trait))
}

export default class TraitsSystem extends System<Components> {
  constructor(private _camera: PerspectiveCamera) {
    super()
  }
  init() {
    listenForTraitChangesVisuals(armorCharacterCardVisuals, 'armor')
    listenForTraitChangesVisuals(witherCharacterCardVisuals, 'wither')
    listenForTraitChangesVisuals(bannerCharacterCardVisuals, 'banner')
    listenForTraitChangesVisuals(lifestealCharacterCardVisuals, 'lifesteal')
    listenForTraitChangesAudio(armorCharacter, 'armor')
    listenForTraitChangesAudio(bannerCharacter, 'banner')
    listenForTraitChangesAudio(guardCharacter, 'guard')
    listenForTraitChangesAudio(lifestealCharacter, 'lifesteal')
    listenForTraitChangesAudio(stealthCharacter, 'stealth')
    listenForTraitChangesAudio(witherCharacter, 'wither')

    bannerActivatedCharacters.listenForAdd(entity => {
      shineBannerFrom(entity, findContainingScene(this._camera)!)
    })

    stealthCharacterCardVisuals.listenForAdd(entity => {
      entity.add(new StealthComponent())
    })
    stealthCharacterCardVisuals.listenForRemove(entity =>
      entity.remove('stealth')
    )
  }
  update() {
    // no per-frame update
  }
}
