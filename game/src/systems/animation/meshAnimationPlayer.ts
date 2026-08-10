import { MeshAnimationAssetName } from '@opensky/shared/assets'
import { isDevMode } from '@opensky/shared/devMode'
import { getUrlFlag } from '@opensky/shared/utils/location'
import {
  BaseCard,
  PhaseResolveCardEffect,
  PhaseResolveTrigger
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { AdditiveBlending, BackSide } from 'three'

import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import { getHero } from '~/helpers/effectHelpers'
import {
  buildMeshSpriteEffect,
  effectLibrary,
  MeshPaletteEffect,
  toggleMeshSpriteEffectLoop
} from '~/helpers/meshAnimationHelpers'
import { playRandomSoundVariation, playSound } from '~/helpers/soundHelpers'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { CuratedMissileParticleSystem } from '~/meshes/Particles/particleHelpers'
import { scene } from '~/scenes/arena/scene'
import { PlayerInfo } from '~/state/stores/MatchInfoStore'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'

import { ActionStack } from '../AnimationOrchestrator'
import { meshAnimationLibrary } from './meshAnimationLibrary'
import {
  MeshAnimationEventName,
  MeshAnimationTypeName
} from './meshAnimationTypes'

export async function meshAnimationPlayer({
  ID,
  entity,
  context,
  cardCache,
  targetEntity,
  payload,
  playerInfo,
  type
}: {
  ID: BaseCard | MeshAnimationEventName
  entity: Entity<Components>
  context?: ActionStack
  cardCache?: CardCacheWithEntities
  targetEntity?: Entity<Components>
  payload?: PhaseResolveCardEffect | PhaseResolveTrigger
  playerInfo?: PlayerInfo
  type?: MeshAnimationTypeName
}) {
  if (getUrlFlag('logMSA') && isDevMode()) {
    console.log(
      `meshAnimationPlayer detected & attmepted: ${ID} ${
        targetEntity ? ` on ${targetEntity.get('cardInstance').base}` : ''
      }`
    )
  }

  if (
    !meshAnimationLibrary.has(ID) ||
    !entity.has('transform') ||
    queuedMeshAnimationMap.get(entity) === ID
  ) {
    return
  } else {
    const MSACompositions = meshAnimationLibrary.get(ID)!

    for (const composition of MSACompositions) {
      if (
        (type && type !== composition.type) ||
        (composition.type && type !== composition.type)
      ) {
        continue
      }

      if (
        !composition.contextCheck(
          context,
          cardCache,
          payload,
          playerInfo,
          entity
        )
      ) {
        continue
      }

      const entityTransform = entity.get('transform')

      if (composition.abortIfNoFieldUnits) {
        if (
          ownedZoneCollections.Player_Field.length === 1 &&
          ownedZoneCollections.Opponent_Field.length === 1
        ) {
          return
        }
      }

      if (composition.awaitIsAnimatingToFinish && entity.has('isAnimating')) {
        const anim = entity.get('isAnimating')
        await anim.finishedFull
      }

      if (composition.preAnimDelayAwaited) {
        await animationDelay(composition.preAnimDelayAwaited)
      }
      if (composition.layers) {
        for (const layer of composition.layers) {
          if (
            layer.entityRestriction &&
            layer.entityRestriction(entity, context, cardCache)
          ) {
            continue
          }

          if (getUrlFlag('logMSA') && isDevMode()) {
            console.log(`meshAnimationPlayer activated for:
PLAYING ${ID}'s "${layer.mesh}" effect on ${entity.get('cardInstance').base}`)
          }

          if (layer.sfx) {
            for (const sfx of layer.sfx) {
              let sound = sfx.id

              if (sfx.ownerCheck) {
                if (sfx.ownerCheck(entity)) {
                  sound = sound + 'Near'
                } else {
                  sound = sound + 'Far'
                }
              }

              if (sfx.size) {
                sound = sound + '-' + sfx.size
              }

              animationDelay(sfx.delay ? sfx.delay : 0).then(() => {
                if (sfx.hasSoundVariation) {
                  playRandomSoundVariation('audioFxCommonVariations', sound)
                } else {
                  playSound('audioFxCommon', sound)
                }
              })
            }
          }

          const palette =
            typeof layer.paletteOverride === 'function'
              ? layer.paletteOverride(entity, context, cardCache, targetEntity)
              : layer.paletteOverride

          const scale =
            typeof layer.scale === 'function'
              ? layer.scale(entity, cardCache)
              : layer.scale

          if (layer.mesh) {
            animationDelay(layer.delay ? layer.delay : 0).then(() => {
              if (layer.isEffectLoop) {
                toggleMeshSpriteEffectLoop(
                  entityTransform,
                  layer.mesh!,
                  palette,
                  layer.offset?.y,
                  layer.offset?.z,
                  layer.detached ? layer.detached : false
                ).then(effect => {
                  if (effect instanceof MeshPaletteEffect) {
                    if (layer.placement) {
                      layer.placement(effect.effect, entity)
                    }

                    animationDelay(layer.duration ? layer.duration : 0).then(
                      () => {
                        toggleMeshSpriteEffectLoop(entityTransform, layer.mesh!)
                      }
                    )
                  }
                })
              } else {
                buildMeshSpriteEffect(
                  layer.mesh!,
                  palette,
                  layer.offset?.y,
                  layer.offset?.z,
                  scale,
                  undefined,
                  layer.reversed
                ).then(effect => {
                  if (layer.targetOverride) {
                    const newTarget = layer.targetOverride(
                      entity,
                      context,
                      cardCache
                    )

                    if (newTarget === null) {
                      scene.add(effect.mesh)
                    }

                    if (newTarget && newTarget.has('transform')) {
                      const targetTransform = newTarget.get('transform')
                      targetTransform.add(effect.mesh)
                    }
                  } else if (targetEntity && targetEntity.has('transform')) {
                    const targetTransform = targetEntity.get('transform')
                    targetTransform.add(effect.mesh)
                  } else {
                    entityTransform.add(effect.mesh)
                  }

                  if (layer.additiveBlending) {
                    effect.mesh.material.blending = AdditiveBlending
                  }

                  if (layer.placement) {
                    layer.placement(effect, entity, targetEntity)
                  }

                  if (layer.shakerCamDeltaOffset) {
                    const delta = effect.mesh.position
                      .clone()
                      .sub(cameraShaker.camera.position)
                      .normalize()
                      .multiplyScalar(layer.shakerCamDeltaOffset)
                    effect.mesh.position.sub(delta)
                  }

                  if (layer.postBuildOffset) {
                    if (typeof layer.postBuildOffset === 'function') {
                      const offset = layer.postBuildOffset(entity, cardCache)
                      if (offset) {
                        effect.mesh.position.add(offset)
                      }
                    } else {
                      effect.mesh.position.add(layer.postBuildOffset)
                    }
                  }

                  if (layer.mirrored) {
                    effect.mesh.rotation.z += Math.PI
                    effect.mesh.material.side = BackSide
                  }

                  if (layer.detached) {
                    scene.attach(effect.mesh)
                  }

                  effect.mesh.renderOrder = 0.5
                  if (layer.renderOrder) {
                    effect.mesh.renderOrder = layer.renderOrder
                  }
                })
              }
            })
          }
        }
      }

      if (composition.postAnimTween) {
        composition.postAnimTween(entityTransform)
      }

      if (composition.pulseFullOnHeroWithDelay) {
        animationDelay(composition.pulseFullOnHeroWithDelay).then(() => {
          const hero = getHero(entity.has('player'))
          if (hero && hero.has('mesh')) {
            findAndAffectCardArtMaterial(hero.get('mesh'), mat =>
              mat.colorMatrixStackWhole.changeBase.animator.pulseFull()
            )
          }
        })
      }

      if (composition.postAnimDelayAwaited) {
        await animationDelay(composition.postAnimDelayAwaited)
      }

      placeInQueuedMeshAnimationMap(targetEntity ? targetEntity : entity, ID)
    }
  }
}

const queuedMeshAnimationMap: Map<
  Entity<Components>,
  BaseCard | MeshAnimationEventName
> = new Map()
function placeInQueuedMeshAnimationMap(
  entity: Entity<Components>,
  ID: BaseCard | MeshAnimationEventName
) {
  queuedMeshAnimationMap.set(entity, ID)
  animationDelay(ID === '3002' ? 3000 : 100).then(() => {
    try {
      queuedMeshAnimationMap.delete(entity)
    } catch (error) {
      console.warn(error)
    }
  })
}

export function meshAnimationAssetNamesFromCardID(cardID: BaseCard) {
  const MSACompositions = meshAnimationLibrary.get(cardID)
  const assetNames: MeshAnimationAssetName[] = []
  if (MSACompositions) {
    for (const composition of MSACompositions) {
      if (composition.layers) {
        for (const layer of composition.layers) {
          if (layer.mesh) {
            assetNames.push(effectLibrary[layer.mesh].meshName)
          }
        }
      }
    }
  }
  return assetNames
}

export function missileOverrideFromCardID(cardID: BaseCard) {
  const MSACompositions = meshAnimationLibrary.get(cardID)
  if (MSACompositions) {
    for (const composition of MSACompositions) {
      if (composition.missileOverride === null) {
        return null
      } else if (composition.missileOverride) {
        return composition.missileOverride as CuratedMissileParticleSystem
      }
    }
  }
  return undefined
}

//  Search with
//  '[0-9]+' /\*(\s+([A-Z-',!()a-z0-9]+\s+)+)\*/
//  For all card entries
