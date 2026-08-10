import { Component, Entity } from 'gg'
import { BufferGeometry, Mesh } from 'three'

import { getAssetsManager } from '~/assets/index'
import ContactShadowMeshMaterial from '~/materials/ContactShadowMeshMaterial'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

interface ShadowData {
  mesh: Mesh<BufferGeometry, ContactShadowMeshMaterial>
  size: number
  minHeight: number
  maxHeight: number
  zOffset: number
}

export default class ShadowComponent extends Component<ShadowData> {
  constructor(
    size: number,
    minHeight: number,
    maxHeight: number,
    zOffset: number
  ) {
    const mesh = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesGraphical',
      'shadow-token-generic',
      true,
      true
    ) as Mesh<BufferGeometry, ContactShadowMeshMaterial>
    mesh.scale.multiplyScalar(size)
    super({ mesh, size, minHeight, maxHeight, zOffset })
  }
  static entities = new TrackableCollection<Entity<Components>>(
    'ShadowComponent'
  )
  onAttach(entity: Entity<Components>) {
    ShadowComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    ShadowComponent.entities.remove(entity)
  }
}
