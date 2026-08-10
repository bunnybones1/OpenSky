import MatchResolutionPlaque from '~/helpers/MatchResolutionPlaque'
import { scene } from '~/scenes/arena/scene'
// import UpdateManager from '~/systems/UpdateManager'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { animationDelay } from '~/utils/asyncUtils'

async function testPlaqueMeshEffectsScene() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()

  const plaque = new MatchResolutionPlaque('defeat', 'Player Name')
  await plaque.plaqueMesh

  scene.add(plaque.pivot)

  async function animation() {
    await plaque.animateIn(3000)
    await animationDelay(1000)
    plaque.transformDriver.value = 0
    animation()
  }
  plaque.transformDriver.value = 1

  animation()

  // await plaque.animateIn(100)
  // let time = 0
  // plaque.mesh.then(mesh=> {
  //   UpdateManager.register({
  //     update(dt:number) {
  //       time += dt
  //       mesh.rotation.z = time
  //       // plaque.transformDriver.value = Math.sin(time * 12) * 0.25 + 0.5
  //   }})
  // })
}

export const test = testPlaqueMeshEffectsScene
