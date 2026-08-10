import { getAssetsManager } from '~/assets'
import { makeHSL } from '~/colors/utils'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { UI } from '~/scenes/ui'
import { activate } from '~/utils/activater'

import SimpleButton from '../meshes/SimpleButton'
import { BaseTestScene } from './BaseTestScene'

interface IGeometry {
  vertsCount: number
}

interface IEmitter {
  radius: number
}

interface IEffect {
  geometry: IGeometry
  emitter: IEmitter
}
type IComposite = IEffect[]

class TestLiveObjectScene extends BaseTestScene {
  constructor() {
    super()
  }
  async init() {
    //
  }

  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const geometries = {
      sparks: {
        vertsCount: 1000
      },
      flames: {
        vertsCount: 1000
      },
      magicRibbons: {
        vertsCount: 1000
      }
    }
    const emitters = {
      sparkler: {
        radius: 0.005,
        a: 10,
        b: 'test',
        c: () => {
          console.log('test c')
        },
        d: () => {
          console.log('test d')
        }
      },
      sparkPopper: {
        radius: 0.01
      },
      sparkFloater: {
        radius: 0.015
      },
      flames: {
        radius: 0.05
      }
    }
    const effects: { [K: string]: IEffect } = {
      fireSparks: {
        geometry: geometries.sparks,
        emitter: emitters.sparkler
      },
      flames: {
        geometry: geometries.flames,
        emitter: emitters.flames
      },
      magicRibbons: {
        geometry: geometries.magicRibbons,
        emitter: emitters.flames
      },
      magicSparks: {
        geometry: geometries.sparks,
        emitter: emitters.sparkFloater
      }
    }
    const composites: { [K: string]: IComposite } = {
      campfire: [effects.fireSparks, effects.flames],
      magic: [effects.magicSparks, effects.magicRibbons]
    }
    const data = {
      composites,
      effects,
      emitters,
      geometries
    }

    activate(data, (obj, key) => {
      console.log(key)
    })

    const container = ui.getContainer('randomTests')
    await container.ready
    // const stored = getLocalStorageObject('testLiveObject', data)

    // const breadcrumbs:Object3D = []

    const breadcrumbArea = new RectangleMesh(new RectangleMaterial({}))
    container.add(breadcrumbArea)
    breadcrumbArea.matrix.setConstraints(
      new Pin(1, 0, -4, 36),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, 52)
    )

    const b = new SimpleButton('test', makeHSL(Math.random(), 0.5, 0.5), () => {
      console.log('button press')
    })
    breadcrumbArea.add(b.mesh)
    // buttonColumn.visuals.children.forEach(child => container.add(child))
    container.show()
    super.initUI(ui)
  }
}
export const scene = TestLiveObjectScene
