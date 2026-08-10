import { Mesh, Object3D } from 'three'

import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'

export function findAndAffectCardArtMaterial(
  visualsRoot: Object3D,
  cb: (mat: CardArtMeshMaterial) => void
) {
  visualsRoot.traverse(obj => {
    if (obj instanceof Mesh && obj.material instanceof CardArtMeshMaterial) {
      cb(obj.material)
    }
  })
}
