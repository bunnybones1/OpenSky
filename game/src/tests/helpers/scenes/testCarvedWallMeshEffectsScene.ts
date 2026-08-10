import CarvedWall from '~/helpers/CarvedWall'
import { scene } from '~/scenes/arena/scene'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'

async function testCarvedWallMeshEffectsScene() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()

  const carvedWall = new CarvedWall(cameraShaker)
  const mesh = await carvedWall.mesh
  scene.add(mesh)
  async function animation() {
    await carvedWall.animateIn().finished
    await animationDelay(3000)
    animation()
  }
  animation()
}

export const test = testCarvedWallMeshEffectsScene
