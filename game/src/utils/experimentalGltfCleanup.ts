import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import { BufferGeometry, Mesh, Object3D } from 'three'

import { reactToToggleWithLocationRefresh } from '~/userSettings'

const toggleGeometryCleaner = new NiceBooleanParameter(
  'toggle-geometry-cleaner',
  'JIT Clean Geometry',
  false,
  'webGL',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

reactToToggleWithLocationRefresh(toggleGeometryCleaner)

import {
  __experimentalGltfCleanupGeometry,
  migrateAttributeFromMorph
} from './geometry'

export function experimentalGltfCleanup(base: Object3D) {
  if (!toggleGeometryCleaner.value) {
    return
  }
  base.traverse(obj => {
    if (obj instanceof Mesh) {
      if (obj.geometry instanceof BufferGeometry) {
        console.log(`clean ${obj.name}`)
        __experimentalGltfCleanupGeometry(obj.geometry)
      }
    }
  })
}

export function modifyMeshForCentroidAnimations(mesh: Mesh) {
  const geo = mesh.geometry as BufferGeometry
  // migrateAttributeFromMorph(0, 'position')
  migrateAttributeFromMorph(geo, 0, 'subposition')
  migrateAttributeFromMorph(geo, 2, 'timedata')
}
