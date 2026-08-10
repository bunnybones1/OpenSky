import { EntityManager, System } from 'gg'

import { TriggersHolderArchetype } from '~/archetypes'
import { Components } from '~/components'
import { makeTriggerHolder } from '~/helpers/triggerHelpers'
import { changeFrameRarity } from '~/utils/changeFrameRarity'

export default class TriggersHolderSystem extends System<Components> {
  init(manager: EntityManager<Components>) {
    manager.getArchetype(TriggersHolderArchetype).onChange(ev => {
      const ent = ev.entity
      if (ev.type === 'add') {
        const card = ent.get('cardInstance')
        const mesh = ent.get('mesh')
        const frameStyle = ent.get('frameStyle')
        const triggers = ent.get('triggersHolder')
        const style = ent.get('frameStyle')
        const unlockedStyle = style === 'none' ? 'base' : style
        const triggerHolder = makeTriggerHolder(triggers, unlockedStyle)
        if (triggerHolder) {
          triggerHolder.position.set(
            -0.0003,
            0.003,
            card.base === 'Hero'
              ? 0.039
              : card.state.view.traits.includes('guard')
              ? 0.0265
              : 0.0255
          )
          if (card.base === 'Hero') {
            triggerHolder.scale.setScalar(0.85)
          }
          mesh.add(triggerHolder)
          changeFrameRarity(triggerHolder, frameStyle)
        }
      } else {
        if (ent.has('mesh')) {
          const mesh = ent.get('mesh')
          const triggerHolder = mesh.children.find(c =>
            c.name.includes('trigger-icons-')
          )
          if (triggerHolder) {
            mesh.remove(triggerHolder)
          }
        }
      }
    })
  }
  update(): void {
    // no update needed
  }
}
