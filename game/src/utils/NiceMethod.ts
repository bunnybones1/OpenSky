import NiceElement, { NiceCategory } from '@opensky/shared/utils/NiceElement'

import BaseButton from '~/scenes/ui/components/BaseButton'
import UITextMesh from '~/systems/text/UITextMesh'

let index = 0
export default class NiceMethod extends NiceElement {
  constructor(
    label: string | (() => string),
    public onSelect: (button: BaseButton, label: UITextMesh) => void,
    public buttonLabel: string | (() => string),
    category: NiceCategory,
    orderPriority: number = 0
  ) {
    super(`method ${index++}`, label, category, orderPriority)
  }
}
