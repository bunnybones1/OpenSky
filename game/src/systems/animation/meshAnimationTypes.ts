import { MeshAnimationAssetName } from '@opensky/shared/assets'
import { makeSafetyCheckFromConstStringArray } from '@opensky/shared/typeHelpers'
import {
  BaseCard,
  PhaseResolveCardEffect,
  PhaseResolveTrigger
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { BufferGeometry, Event, Mesh, Object3D, Vector2, Vector3 } from 'three'

import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import { EffectName, PaletteName } from '~/helpers/meshAnimationHelpers'
import ZPaletteMappedMeshMaterial from '~/materials/ZPaletteMappedMeshMaterial'
import {
  CuratedBeamParticleSystem,
  CuratedMissileParticleSystem
} from '~/meshes/Particles/particleHelpers'
import { PlayerInfo } from '~/state/stores/MatchInfoStore'

import { ActionStack } from '../AnimationOrchestrator'
import { AnimatedObject } from './RawTweener'

export type MeshEffect = {
  name: MeshAnimationAssetName
  mesh: Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>
  anim: AnimatedObject<any>
}

type MSALayer = {
  mesh?: EffectName
  paletteOverride?:
    | PaletteName
    | ((
        entity: Entity<Components>,
        context?: ActionStack,
        cardCache?: CardCacheWithEntities,
        targetEntity?: Entity<Components>,
        suffix?: string
      ) => PaletteName | undefined)
  offset?: Vector3
  scale?:
    | Vector2
    | ((
        entity: Entity<Components>,
        cardCache?: CardCacheWithEntities
      ) => Vector2 | undefined)
  reversed?: boolean
  mirrored?: boolean
  delay?: number

  shakerCamDeltaOffset?: number
  postBuildOffset?:
    | Vector3
    | ((
        entity: Entity<Components>,
        cardCache?: CardCacheWithEntities
      ) => Vector3 | undefined)

  detached?: boolean
  renderOrder?: number
  additiveBlending?: ((entity: Entity<Components>) => boolean) | boolean

  isEffectLoop?: boolean
  duration?: number

  sfx?: {
    id: string
    hasSoundVariation?: boolean
    delay?: number
    size?: 'Small' | 'Large'
    ownerCheck?: (entity: Entity<Components>) => boolean
  }[]

  targetOverride?: (
    entity?: Entity<Components>,
    context?: ActionStack,
    cardCache?: CardCacheWithEntities
  ) => Entity<Components> | undefined | null

  placement?: (
    effect: MeshEffect,
    entity: Entity<Components>,
    targetEntity?: Entity<Components>
  ) => void

  entityRestriction?: (
    entity: Entity<Components>,
    context?: ActionStack,
    cardCache?: CardCacheWithEntities
  ) => boolean
}

export type MSAComposition = {
  type?: MeshAnimationTypeName

  contextCheck: (
    context?: ActionStack,
    cardCache?: CardCacheWithEntities,
    payload?: PhaseResolveCardEffect | PhaseResolveTrigger,
    playerInfo?: PlayerInfo,
    entity?: Entity<Components>
  ) => BaseCard | null | undefined | boolean

  abortIfNoFieldUnits?: boolean
  awaitIsAnimatingToFinish?: boolean
  preAnimDelayAwaited?: number
  pulseFullOnHeroWithDelay?: number
  layers?: MSALayer[]
  postAnimTween?: (transform: Object3D<Event>) => void
  postAnimDelayAwaited?: number

  missileOverride?:
    | CuratedMissileParticleSystem
    | CuratedBeamParticleSystem
    | null
}

const MeshAnimationEvents = [
  'cardCasting',
  'stealthToggle',
  'heroAbilityTrigger',
  'genericElementBasedTrigger',
  'slayTrigger',
  'gloryTrigger',
  'deathTrigger',
  'borderGlint',
  'summonCrack'
] as const
export type MeshAnimationEventName = (typeof MeshAnimationEvents)[number]
const isMeshAnimationEventName =
  makeSafetyCheckFromConstStringArray(MeshAnimationEvents)
isMeshAnimationEventName

const MeshAnimationTypes = ['chargeUp', 'impact', 'aura'] as const
export type MeshAnimationTypeName = (typeof MeshAnimationTypes)[number]
const isMeshAnimationTypeName =
  makeSafetyCheckFromConstStringArray(MeshAnimationTypes)
isMeshAnimationTypeName
