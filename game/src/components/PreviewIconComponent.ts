import { Component, Entity } from 'gg'

import { IconIndicatorName } from '~/meshes/IconIndicator'
import {
  createPreviewIconAnimation,
  removePreviewIconAnimation
} from '~/systems/animation/previewIcon'

import { Components } from '.'

interface PreviewIconValue {
  iconName: IconIndicatorName
  entityId?: number
}

export default class PreviewIconComponent extends Component<PreviewIconValue> {
  iconEntity: Entity<Components>
  constructor(iconName: IconIndicatorName) {
    super({ iconName })
  }

  onAttach(entity: Entity<Components>) {
    this.iconEntity = createPreviewIconAnimation(entity, this.value)
  }

  onDetach() {
    removePreviewIconAnimation(this.value)
  }
}
