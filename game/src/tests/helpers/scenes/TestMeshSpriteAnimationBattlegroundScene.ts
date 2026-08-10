import { getRandom } from '@opensky/shared/utils/arrayUtils'
import {
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  SphereBufferGeometry
} from 'three'

import { getAssetsManager } from '~/assets'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import {
  buildMeshSpriteEffect,
  toggleMeshSpriteEffectLoop
} from '~/helpers/meshAnimationHelpers'
import queryParams from '~/queryParams'
import { UI } from '~/scenes/ui'
import UpdateManager from '~/systems/UpdateManager'
import { FPSControls } from '~/utils/fpsControls'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

const TOTAL = 6

class TestMeshSpriteAnimationBattlegroundScene extends BaseTestScene {
  private _spheres: Mesh[]
  constructor() {
    super()
    addPrettyLights(this.scene, this.bgColor)
    const fps = new FPSControls(this.camera as PerspectiveCamera)
    if (queryParams.fpsCam) {
      fps.toggle(true)
    }

    const floorMaterial = new MeshStandardMaterial({
      color: 0xaaddee,
      roughness: 0.7
    })
    const floor = new Mesh(getSharedPlaneBufferGeometry(), floorMaterial)
    floor.renderOrder = 0
    this.scene.add(floor)
    floor.rotation.x = Math.PI * -0.5

    const geo = new SphereBufferGeometry(0.02, 32, 16)
    const distFromCenter = 0.1

    const spheres: Mesh[] = []
    for (let i = 0; i < TOTAL; i++) {
      const sphere = new Mesh(geo, floorMaterial)
      this.scene.add(sphere)

      const a = (Math.PI * 2 * i) / TOTAL

      sphere.position.set(
        distFromCenter * Math.cos(a),
        0.02,
        distFromCenter * Math.sin(a)
      )
      spheres.push(sphere)
    }

    this._spheres = spheres

    let time = 0
    UpdateManager.register({
      update(dt: number) {
        for (let i = 0; i < spheres.length; i++) {
          const sphere = spheres[i]
          time += dt
          const a = (Math.PI * 2 * i) / TOTAL + time * 0.1

          sphere.position.set(
            distFromCenter * Math.cos(a),
            0.02,
            distFromCenter * Math.sin(a)
          )
        }
      }
    })
  }

  getRandomSphere() {
    return getRandom(this._spheres)
  }

  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    const container = ui.getContainer('randomTests')

    const buttonDatas = [
      new QuickButtonData(`toggle ground crack`, () => {
        const sphere = this.getRandomSphere()
        toggleMeshSpriteEffectLoop(
          sphere,
          'basicCrack_MSA',
          undefined,
          0,
          -0.02
        )
      }),
      new QuickButtonData(`toggle hearts`, () => {
        const sphere = this.getRandomSphere()
        toggleMeshSpriteEffectLoop(sphere, 'hearts_MSA')
      }),
      new QuickButtonData(`fire trigger`, () => {
        const sphere = this.getRandomSphere()
        buildMeshSpriteEffect('fire_trigger_MSA').then(effect => {
          sphere.add(effect.mesh)
        })
      }),
      new QuickButtonData(`water trigger`, () => {
        const sphere = this.getRandomSphere()
        buildMeshSpriteEffect('water_trigger_MSA').then(effect => {
          sphere.add(effect.mesh)
        })
      }),
      new QuickButtonData(`flames`, () => {
        const sphere = this.getRandomSphere()
        buildMeshSpriteEffect('flames_MSA').then(effect => {
          sphere.add(effect.mesh)
        })
      }),
      new QuickButtonData(`toggle poison cloud`, () => {
        const sphere = this.getRandomSphere()
        toggleMeshSpriteEffectLoop(
          sphere,
          'poisonCloud_MSA',
          undefined,
          0,
          0.02
        )
      })
    ]

    makeQuickButtonColumn(
      container,
      buttonDatas,
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-20, -100)
    )

    await container.ready
    container.show()
  }
}
export const scene = TestMeshSpriteAnimationBattlegroundScene
