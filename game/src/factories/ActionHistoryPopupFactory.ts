import device from '@opensky/shared/device'
import { Player } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Mesh, Object3D } from 'three'

import CardPopupAssemblage from '~/assemblages/CardPopupAssemblage'
import { getAssetsManager } from '~/assets/index'
import { getGradient } from '~/colors/colorLibrary'
import { Components } from '~/components'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { MOBILE_CARD_HOVER_SCALE, RENDER_ORDERS } from '~/constants'
import { createWorldEntity } from '~/helpers/worldHelpers'
import { ActionHistoryEvent } from '~/state/ActionHistory'
import * as textOptions from '~/systems/text/TextOptions'
import { addText } from '~/utils/textUtils'

export type CardPopupExpandDirection = 'left' | 'right'

const TEXT_DEPTH = 0.001

// Recursively creates card popups for the given card and all of its card references to a specific max depth
export function createCardPopup(
  card: RelaxedCardInstance,
  attachment: RelaxedCardInstance | undefined,
  owner: Player,
  expandDirection: CardPopupExpandDirection,
  parentEntity: Entity<Components>
) {
  const entity = createWorldEntity(
    CardPopupAssemblage(card, owner, attachment, false)
  )
  const transform = entity.get('transform')

  transform.scale.setScalar(device.isMobile ? MOBILE_CARD_HOVER_SCALE : 1.0)

  if (parentEntity.has('actionHistory')) {
    const ev = parentEntity.get('actionHistory')

    if (ev.type === 'Attack') {
      const attackerCard = ev.attacker
      const defenderCard = ev.defender
      const defenderAttachment = ev.defenderAttachment
      const childEntity = createWorldEntity(
        CardPopupAssemblage(
          defenderCard,
          (1 - owner) as Player,
          defenderAttachment,
          false
        )
      )
      const childTransform = childEntity.get('transform')
      const offsetX = 0.055 * (expandDirection === 'right' ? 1 : -1)

      childTransform.position.set(offsetX, 0, 0)
      childTransform.rotation.set(0, 0, 0)
      transform.add(childTransform)

      const attackerMesh = entity.get('mesh')
      const defenderMesh = childEntity.get('mesh')

      const addDamageText = (
        ev: ActionHistoryEvent,
        card: RelaxedCardInstance,
        object: Object3D
      ) => {
        const damageEvent = ev.items.find(
          x => x.type === 'Damage' && x.target.id === card.id
        )

        const damage =
          damageEvent && damageEvent.type === 'Damage' ? damageEvent.damage : 0

        const damageText = addText(
          object,
          [
            {
              text: damage ? `-${damage}` : '0',
              color: getGradient('negative')
            }
          ],
          { ...textOptions.damageNumber, size: 48 },
          0,
          TEXT_DEPTH + 0.001,
          0.016
        )

        damageText.renderOrder = RENDER_ORDERS.damage + 2

        const shadowMesh = getAssetsManager().fetchMeshDeepClone(
          'gamePiecesGraphical',
          'zShadow-circle',
          true,
          true
        ) as Mesh
        shadowMesh.position.copy(damageText.position)
        const s = 0.5
        shadowMesh.scale.set(s, s, s)
        shadowMesh.frustumCulled = false
        shadowMesh.renderOrder = RENDER_ORDERS.damage - 100
        object.add(shadowMesh)
      }

      addDamageText(ev, attackerCard, attackerMesh)
      addDamageText(ev, defenderCard, defenderMesh)

      // TODO handle attacker died, defender died.
    }
  }

  return entity
}
