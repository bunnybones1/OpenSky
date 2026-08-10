import { renderMetrics } from '@opensky/shared/renderMetrics'
import { Entity } from 'gg'
import { Box3, Vector3 } from 'three'

import { Components } from '~/components'
import queryParams from '~/queryParams'
import { cameraShaker } from '~/utils/cameraShaker'
import { makeBox3Helper } from '~/utils/threeUtils'

export default function addTooltipScreenspaceProtector(
  popupEntity: Entity<Components>,
  offset: Vector3,
  putTipsOnLeft: boolean
) {
  const size =
    ((0.085 * cameraShaker.fov) / 45) * (750 / renderMetrics.uiHeight)
  const left = putTipsOnLeft ? -size : 0
  const right = putTipsOnLeft ? 0 : size
  const bbMin = new Vector3(left, -0.001, 0.03)
  const bbMax = new Vector3(right, 0.001, 0.0)
  bbMin.add(offset)
  bbMax.add(offset)
  const artProtector = makeBox3Helper(new Box3(bbMin, bbMax))
  artProtector.userData.protector = true
  artProtector.visible = queryParams.debugScreenspace
  popupEntity.get('mesh').add(artProtector)
}
