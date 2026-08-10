import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { openPortal, wrapInArmorBubble } from '~/helpers/meshEffectHelpers'
import { animationDelay } from '~/utils/asyncUtils'
import NiceMethod from '~/utils/NiceMethod'

import { TestLightCacheSkyScene } from './TestLightCacheSkyScene'

class TestMeshEffectsScene extends TestLightCacheSkyScene {
  constructor() {
    super()
    const init = async () => {
      await getAssetsManager().loadAsset('gamePiecesPhysical')

      const scene = this.scene
      function quickPivot(x: number) {
        const o = new Object3D()
        scene.add(o)
        o.position.set(x, 0.1, 0)
        o.rotation.set(Math.PI * 0.35, 0, 0)
        o.scale.multiplyScalar(1.5)
        return o
      }
      const armorMe = quickPivot(-0.05)
      const portalMe = quickPivot(0.05)
      const portalMe2 = quickPivot(0.15)
      const portalMe3 = quickPivot(0.25)
      const portalMe4 = quickPivot(-0.25)
      function quickButton(label: string, callback: () => void) {
        new NiceMethod('', callback, label, 'linework', 0)
      }
      quickButton('hit armor', () => {
        wrapInArmorBubble(armorMe)
      })
      quickButton('open portal', () => {
        openPortal(portalMe)
        openPortal(portalMe2)
        openPortal(portalMe3, undefined, 'conjure')
        openPortal(portalMe4, undefined, 'golden')
      })
      for (let i = 0; i < 100; i++) {
        await animationDelay(1500)
        wrapInArmorBubble(armorMe)
        openPortal(portalMe)
        openPortal(portalMe2)
        openPortal(portalMe3, undefined, 'conjure')
        openPortal(portalMe4, undefined, 'golden')
        await animationDelay(1500)
      }

      // await getAssetsManager().loadAsset('arenaModel')
      // const holderFire = findObject3DByName<Object3D>(this.scene, 'graveyard-holder-dust-player')
      // const holderFireMesh = holderFire.children[0] as Mesh
      // const oldFireMat = holderFireMesh.material as MeshStandardMaterial

      // const dustFire = holderFire.clone(true)
      // dustFire.visible = true
      // holderFire.parent?.add(dustFire)
      // const dustFireMesh = dustFire.children[0] as Mesh

      //   await getAssetsManager().loadAsset('gamePiecesPhysical')
      //   const spiral = maybeFindMeshByName(getAssetsManager().getAsset('gamePiecesPhysical'), 'spiral')!
      //   const newMat = new PortalMeshMaterial({
      //     map: (spiral.material as RawShaderMaterial).uniforms.map.value,
      //     blendMode: 'multiply',
      //     useInnerDetails: false,
      //     useOuterDetails: true
      //   })

      //   newMat.opacity = 1
      //   const newMat2 = new PortalMeshMaterial({
      //     map: (spiral.material as RawShaderMaterial).uniforms.map.value,
      //     blendMode: 'screen',
      //     useInnerDetails: true,
      //     useOuterDetails: false
      //   })
      //   newMat2.uniforms.uniqueness = newMat.uniforms.uniqueness
      //   const dustFireMesh2 = dustFireMesh.clone() as Mesh
      //   dustFireMesh.parent?.add(dustFireMesh2)
      //   migrateMaterialMaps(dustFireMesh, newMat)
      //   migrateMaterialMaps(dustFireMesh2, newMat2)
      //   dustFireMesh2.renderOrder ++
    }
    init()
  }
}
export const scene = TestMeshEffectsScene
