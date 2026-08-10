import { AssetPriority, Object3DAssetName } from '@opensky/shared/assets'
import { Fog, Mesh, Object3D } from 'three'

import { getArenaSettings } from '~/arenaSettings'
import { atmosphereColor } from '~/colors/colorLibrary'
import { DEBUG_SKY, RENDER_ORDERS, START_OF_GAME_DAY } from '~/constants'
import LightCacheMeshMaterial from '~/lightCaches/materials/LightCacheMeshMaterial'
import queryParamColors from '~/queryParamColors'
import renderer, { bgColor } from '~/renderer'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { cameraHomePositionBlend } from '~/tempDesignOptions'
import { createResolvable } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'
import { globalAccess } from '~/utils/globalAccess'

import { getAssetsManager } from '../../assets'
import { findObject3DByName } from '../../utils/threeUtils'
import { initClouds, initIsland } from './helpers'
import { scene } from './scene'
import Sky from './Sky'

export const camera = cameraShaker.camera
cameraHomePositionBlend.listen(v => (cameraShaker.positionHomeBlend = v))

export let clouds = new Mesh()
scene.fog = new Fog(0xff0000, 0, 6)
scene.autoUpdate = false
scene.matrixAutoUpdate = false

export const lights: Object3D[] = []

let sky: Sky

export const arenaReady = createResolvable()

const arena = new Object3D()

export function initScene() {
  scene.add(camera)
  camera.updateMatrix()
  camera.updateMatrixWorld(true)

  const artBucket = new Object3D()
  artBucket.name = 'art-bucket'
  arena.add(artBucket)

  const al = getAssetsManager()

  arena.scale.multiplyScalar(0.07)
  arena.position.z -= 0.05
  scene.add(arena)
  arena.updateMatrixWorld(true)

  async function prepareGameBoard() {
    const arenaSettings = await getArenaSettings()
    const gameBoardModel = await al.loadAsset(
      arenaSettings.gameBoard as Object3DAssetName,
      AssetPriority.Island
    )
    experimentalGltfCleanup(gameBoardModel)
    initIsland(artBucket, gameBoardModel)
  }
  const promisedGameBoard = prepareGameBoard()

  async function prepareIsland() {
    const arenaSettings = await getArenaSettings()
    await promisedGameBoard

    initIsland(
      artBucket,
      await al.loadAsset(
        arenaSettings.island as Object3DAssetName,
        AssetPriority.Island
      )
    )

    const surface = findObject3DByName(artBucket, 'surface')

    artBucket.position.set(0, 0, 0)
    surface.position.set(0, 0, 0)
    artBucket.updateMatrixWorld(true)

    const skyNode = new Object3D()
    skyNode.position.z -= 3
    skyNode.position.y -= 1.5
    skyNode.rotation.x -= Math.PI * 0.125
    scene.add(skyNode)
    const skyRadius = 6

    await al.loadAsset('dayNightColorStrip', AssetPriority.Island)

    sky = new Sky(
      renderer,
      scene,
      skyNode,
      al.getAsset('dayNightColorStrip'),
      skyRadius,
      0.75,
      15,
      48,
      DEBUG_SKY,
      true
    )
    globalAccess.sky = sky
    ;(scene.fog as Fog).color = atmosphereColor
    if (!queryParamColors.bgColor) {
      bgColor.value = atmosphereColor
    }
    const island = findObject3DByName<Mesh>(artBucket, 'surface', true)
    if (island.material instanceof LightCacheMeshMaterial) {
      island.material.uniforms.fogColor.value = atmosphereColor
    }
    skyNode.traverse(o => (o.renderOrder = RENDER_ORDERS.sky))

    clouds = await initClouds(arena, sky)

    sky.skyDome.renderOrder = RENDER_ORDERS.sky + 1

    arenaReady.resolve()
  }
  const promisedIsland = prepareIsland()

  return { promisedGameBoard, promisedIsland, arena }
}

export function updateScene(dt: number) {
  if (sky) {
    sky.update(dt)
  }
}

export function animateIntro(duration: number) {
  const islandAnimating = simpleTweener.to({
    description: 'island cam blend',
    target: cameraHomePositionBlend,
    propertyGoals: { value: 1 },
    duration,
    easing: Easing.Quartic.InOut
  }).finished

  if (globalAccess.sky) {
    const sky = globalAccess.sky
    simpleTweener.to({
      description: 'island sky time',
      target: sky,
      propertyGoals: { timeDays: START_OF_GAME_DAY },
      duration,
      easing: Easing.Quartic.InOut,
      onComplete: () => {
        sky.paused = false
      }
    })
  }
  return islandAnimating
}
