import { CardInstance, Player, SkyWeaver } from '@skyweaver/state-metadata'
import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'

import ActionHistorySidebar from '.'
import IconRow from './IconRow'

export default class DustRow extends IconRow {
  constructor(
    sidebar: ActionHistorySidebar,
    playerId: Player,
    card: CardInstance<SkyWeaver>,
    attachment: CardInstance<SkyWeaver> | undefined
  ) {
    const dustMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      `preview-icon-dust`
    )

    dustMesh.matrix.setConstraints(
      new Pin(0, 0, 0, 0),
      ReadonlyPin.Center,
      ReadonlyPin.Center.clone(),
      new Vector2(1.2, 1.2)
    )
    // dustMesh.scale.setScalar(100)
    super(sidebar, playerId, card, dustMesh)
    this.attachment = attachment
  }
}
