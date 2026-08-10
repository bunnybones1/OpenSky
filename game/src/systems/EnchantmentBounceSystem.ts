import { System } from 'gg'

import { Components } from '~/components'
import EnchantmentBounceComponent, {
  bounceAttachmentOnEntity
} from '~/components/EnchantmentBounceComponent'

export default class EnchantmentBounceSystem extends System<Components> {
  init() {
    //
  }
  update() {
    for (const item of EnchantmentBounceComponent.entities.items) {
      const enchs = item.get('enchantmentBounce').enchantNames
      for (const ench of enchs) {
        bounceAttachmentOnEntity(item, ench)
      }
    }
  }
}
