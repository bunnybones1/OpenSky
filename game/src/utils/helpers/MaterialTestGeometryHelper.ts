import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { distributions } from '@opensky/shared/utils/distributions'
import { wrap } from '@opensky/shared/utils/math'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Mesh, Scene, Vector3 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { initMatLibEditor } from '~/lightCaches/materials/initMatLibEditor'
import {
  lightCacheMaterialParamsLibrary,
  lightCacheMaterialParamsLibraryKeys,
  linkMaterialChangesToMeshes,
  listenForMatLibEditorChanges
} from '~/lightCaches/materials/lightCacheMatLib'
import LightCacheMeshMaterial from '~/lightCaches/materials/LightCacheMeshMaterial'
import { cachedTestGeometryMakers } from '~/tests/helpers/utils/testGeometryMakers'

import { create3DLocationGrid } from '../mathThree'
import { registerDebugModalCategory } from '../registerDebugModalCategory'

export default class MaterialTestGeometryHelper {
  private _testMeshes: Mesh[] = []
  private _testDirty: boolean
  private _testLocations: Vector3[]
  private _totalTestGeometries = 1
  private _testGeometryChoice = 0
  private _testGeometryChoiceStagger = true
  private _testMaterialChoice = 0
  private _testMaterialChoiceStagger = true
  private set totalTestGeometries(val: number) {
    if (val === this._totalTestGeometries) {
      return
    }
    this._totalTestGeometries = val
    this._testDirty = true
  }

  private set testGeometryChoice(val: number) {
    if (val === this._testGeometryChoice) {
      return
    }
    this._testGeometryChoice = val
    this._testDirty = true
  }

  private set testGeometryChoiceStagger(val: boolean) {
    if (val === this._testGeometryChoiceStagger) {
      return
    }
    this._testGeometryChoiceStagger = val
    this._testDirty = true
  }

  private set testMaterialChoice(val: number) {
    if (val === this._testMaterialChoice) {
      return
    }
    this._testMaterialChoice = val
    this._testDirty = true
  }

  private set testMaterialChoiceStagger(val: boolean) {
    if (val === this._testMaterialChoiceStagger) {
      return
    }
    this._testMaterialChoiceStagger = val
    this._testDirty = true
  }
  constructor(private _scene: Scene) {
    this._testLocations = create3DLocationGrid(0.3, 5, new Vector3(1, 1, 0.2))

    const geometryChooser = new NiceFloatParameter(
      'test-geometry',
      'Test Geometry',
      0,
      0,
      cachedTestGeometryMakers.length - 1,
      distributions.linear,
      v => cachedTestGeometryMakers[Math.round(v)]().constructor.name,
      'materials',
      RESET_USER_SETTINGS_TO_DEFAULTS,
      0.001,
      0,
      true
    )

    geometryChooser.listen(i => (this.testGeometryChoice = Math.round(i)))

    const geomtriesTotal = new NiceFloatParameter(
      'total-test-geometries',
      'Total Test Geometries',
      1,
      0,
      30,
      distributions.linear,
      v => '' + Math.round(v),
      'materials',
      RESET_USER_SETTINGS_TO_DEFAULTS,
      0.001,
      0,
      true
    )

    geomtriesTotal.listen(i => (this.totalTestGeometries = Math.round(i)))
    // geometryChooser.listen(i => testMesh.geometry = cachedTestGeometryMakers[Math.round(i)]())

    const staggerGeometryChoice = new NiceBooleanParameter(
      'stagger-test-geometry-choice',
      'Stagger Test Geometry Choice',
      false,
      'materials',
      undefined,
      RESET_USER_SETTINGS_TO_DEFAULTS,
      0,
      true
    )
    staggerGeometryChoice.listen(b => (this.testGeometryChoiceStagger = b))

    const materialChooser = new NiceFloatParameter(
      'test-Material',
      'Test Material',
      0,
      0,
      lightCacheMaterialParamsLibraryKeys.length - 1,
      distributions.linear,
      v => lightCacheMaterialParamsLibraryKeys[Math.round(v)],
      'materials',
      RESET_USER_SETTINGS_TO_DEFAULTS,
      0.001,
      0,
      true
    )

    materialChooser.listen(i => (this.testMaterialChoice = Math.round(i)))

    const staggerMaterialChoice = new NiceBooleanParameter(
      'stagger-test-material-choice',
      'Stagger Test Material Choice',
      false,
      'materials',
      undefined,
      RESET_USER_SETTINGS_TO_DEFAULTS,
      0,
      true
    )
    staggerMaterialChoice.listen(b => (this.testMaterialChoiceStagger = b))

    registerDebugModalCategory('lightCacheTests', 'testGeometry')
    linkMaterialChangesToMeshes(this._scene)
    listenForMatLibEditorChanges(() => {
      this._testDirty = true
    })
    initMatLibEditor()
  }

  rebuildTestGeometries() {
    for (const mesh of this._testMeshes) {
      mesh.parent!.remove(mesh)
    }
    this._testMeshes.length = 0
    let choice = Math.round(this._testGeometryChoice)
    let choice2 = this._testMaterialChoice
    for (let i = 0; i < this._totalTestGeometries; i++) {
      const matParams =
        lightCacheMaterialParamsLibrary[
          lightCacheMaterialParamsLibraryKeys[choice2]
        ]
      const lightCacheMaterial = new LightCacheMeshMaterial(
        getAssetsManager(),
        matParams
      )

      const testMesh = new Mesh(
        cachedTestGeometryMakers[choice](),
        lightCacheMaterial
      )
      testMesh.scale.multiplyScalar(0.02)
      testMesh.position.copy(this._testLocations[i])
      testMesh.position.y += 0.15
      this._testMeshes.push(testMesh)
      this._scene.add(testMesh)
      if (this._testGeometryChoiceStagger) {
        choice = wrap(choice + 1, 0, cachedTestGeometryMakers.length)
      }
      if (this._testMaterialChoiceStagger) {
        choice2 = wrap(
          choice2 + 1,
          0,
          lightCacheMaterialParamsLibraryKeys.length
        )
      }
    }
  }

  update(dt: number) {
    if (this._testDirty) {
      this._testDirty = false
      this.rebuildTestGeometries()
    }
    for (const testMesh of this._testMeshes) {
      testMesh.rotation.y += dt * 1.0
      testMesh.rotation.x += dt * 0.5
    }
  }
}
