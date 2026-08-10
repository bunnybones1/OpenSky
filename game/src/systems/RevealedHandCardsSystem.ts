import { EntityManager, System } from 'gg'

import { RevealedHandCardsArchetype } from '~/archetypes'
import { Components } from '~/components'
import { playSound } from '~/helpers/soundHelpers'
import { findObject3DByName } from '~/utils/threeUtils'

export default class RevealedHandCardsSystem extends System<Components> {
  init(manager: EntityManager<Components>) {
    manager.getArchetype(RevealedHandCardsArchetype).onChange(ev => {
      if (ev.entity.has('mesh')) {
        try {
          const eyecon = findObject3DByName(ev.entity.get('mesh'), 'icon-eye')
          eyecon.traverse(o => {
            o.visible = ev.type === 'add'
          })
          if (ev.type === 'add') {
            playSound('audioFxCommon', 'CardReveals')
          }
        } catch (err) {
          // If the eyecon doesn't exist, we don't need to hide it
        }
      }
    })
  }
  update() {
    //nothing
  }
}
