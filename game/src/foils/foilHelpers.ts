import { Entity } from 'gg'
import { Mesh } from 'three'

import { Components } from '~/components'
import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'

import { FoilContextType } from './FoilKitTypeHelpers'

export function changeFoilContext(
  entity: Entity<Components>,
  foilContext: FoilContextType
) {
  if (entity.has('mesh')) {
    entity.get('mesh')!.traverse(obj => {
      if (obj instanceof Mesh && obj.material instanceof CardArtMeshMaterial) {
        obj.material.foilContext = foilContext
      }
    })
  }
}
