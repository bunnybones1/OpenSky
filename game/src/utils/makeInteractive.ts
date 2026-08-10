import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import IInteractive from '~/systems/input/IInteractive'

import ColliderMesh from './ColliderMesh'

export function makeInteractive(
  target: Object2D,
  interactions: IInteractive,
  sizePin = ReadonlyPin.FullSize,
  clipSpaceDepth = UI_DEFAULT_DEPTH
) {
  const collider = new ColliderMesh(interactions, clipSpaceDepth)
  collider.name = target.name + '-collider'
  collider.userData.button = target

  collider.matrix.setConstraints(
    sizePin,
    ReadonlyPin.TopLeft,
    ReadonlyPin.TopLeft
  )

  target.add(collider)
  target.userData.collider = collider
  return collider
}
