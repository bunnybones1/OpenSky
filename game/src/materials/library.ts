import { Color, DoubleSide, FrontSide, MeshBasicMaterial } from 'three'

import { AssetsManager } from '~/assets/index'
import { PALETTE_ROW } from '~/constants'
import queryParams from '~/queryParams'
import { createOverdrawOpaqueMeshMaterial } from '~/utils/materials'

import MagicFireHighlightMeshMaterial from './MagicFireHighlightMeshMaterial'
import OverdrawOpaqueMeshMaterial from './OverdrawOpaqueMeshMaterial'
import PaletteMappedVertexColorMeshMaterial from './PaletteMappedVertexColorMeshMaterial'

class MaterialLibrary {
  private _magicFire: MagicFireHighlightMeshMaterial
  private _collider: MeshBasicMaterial
  private _overdrawOpaque: OverdrawOpaqueMeshMaterial
  private _collider2d: PaletteMappedVertexColorMeshMaterial
  private _layoutTest2d: PaletteMappedVertexColorMeshMaterial

  getMagicFire(assetsManager: AssetsManager) {
    if (!this._magicFire) {
      const magicFireMat = new MagicFireHighlightMeshMaterial(assetsManager, {
        color: new Color(0, 0, 0)
      })
      magicFireMat.name = 'highlightFire'
      this._magicFire = magicFireMat
    }
    return this._magicFire!
  }

  get collider() {
    if (!this._collider) {
      this._collider = new MeshBasicMaterial({
        wireframe: false,
        color: 0xff0000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        depthTest: false,
        visible: queryParams.debugColliders,
        name: 'collider',
        side: queryParams.debugColliders ? DoubleSide : FrontSide
      })
    }
    this._collider.name = 'collider'

    return this._collider
  }

  getCollider2d(assetsManager: AssetsManager) {
    if (!this._collider2d) {
      this._collider2d = new PaletteMappedVertexColorMeshMaterial(
        assetsManager,
        {
          paletteMapRow: PALETTE_ROW.COLLIDER_2D
        },
        {
          visible: queryParams.debugColliders
          // side: DoubleSide
        }
      )
    }
    this._collider2d.name = 'collider2d'

    return this._collider2d
  }

  get overdrawOpaque() {
    if (!this._overdrawOpaque) {
      this._overdrawOpaque = createOverdrawOpaqueMeshMaterial()
    }
    return this._overdrawOpaque
  }

  getLayoutTester(assetsManager: AssetsManager) {
    if (!this._layoutTest2d) {
      this._layoutTest2d = new PaletteMappedVertexColorMeshMaterial(
        assetsManager,
        {
          paletteMapRow: PALETTE_ROW.LAYOUT_TESTER
        },
        {
          visible: queryParams.debugLayout
          // side: DoubleSide
        }
      )
    }
    this._layoutTest2d.name = 'layoutTest2d'

    return this._layoutTest2d
  }
}

const materialLibrary = new MaterialLibrary()

export default materialLibrary
