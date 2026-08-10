import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { lerp } from '@opensky/shared/utils/math'
import { Quaternion } from 'three'

import { getAssetsManager } from '~/assets'
import TransformComponent from '~/components/TransformComponent'
import {
  ARENA_ANGLE,
  ARENA_ANTIANGLE_QUAT,
  UPRIGHT_ANGLE_QUAT
} from '~/constants'
import { createHeroCard } from '~/factories/HeroCardFactory'
import {
  cameraParallaxHelper,
  registerParallaxListener
} from '~/helpers/parallaxHelpers'
import { scene } from '~/scenes/arena/scene'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { cameraShaker } from '~/utils/cameraShaker'
import { modify3DObjectsWhoseNamesInclude } from '~/utils/threeUtils'
import { world } from '~/world'

async function tiltingIsland() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  TransformComponent.defaultScene = scene

  const heroCard = createHeroCard(BASE_HERO_SKINS.ADA)
  const heroTransform = heroCard.get('transform')
  heroTransform.scale.multiplyScalar(5)
  scene.add(heroTransform)
  heroTransform.rotation.x = ARENA_ANGLE
  modify3DObjectsWhoseNamesInclude(
    heroTransform,
    'highlight',
    o => o.parent?.remove(o)
  )

  function onParallaxCard(quaternion: Quaternion) {
    heroTransform.quaternion.copy(quaternion)
    heroTransform.quaternion.multiply(UPRIGHT_ANGLE_QUAT)
    heroTransform.quaternion.premultiply(ARENA_ANTIANGLE_QUAT)
    heroTransform.updateMatrix()
    heroTransform.updateMatrixWorld()
  }

  function makeCardParallaxStrength(s: number) {
    return lerp(s, 1, 0.75) * -2
  }

  cameraParallaxHelper.attemptToRigCameraParallax(cameraShaker.camera)
  registerParallaxListener(onParallaxCard, makeCardParallaxStrength)
}

export const test = tiltingIsland
