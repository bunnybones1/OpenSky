import { System } from 'gg'

import { Components } from '~/components'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'

export default class FrontFaceHidingSystem extends System<Components> {
  init() {
    FrontFacesVisibleComponent.entities.listenForAdd(entity => {
      entity.get('transform').traverse(o => {
        if (o.userData.isFrontFacing) {
          o.visible = true
        }
      })
      if (entity.has('hostingAttachment')) {
        const attached = entity.get('hostingAttachment').entity
        const attachedVisible = attached.has('frontFacesVisible')
        if (!attachedVisible) {
          attached.add(new FrontFacesVisibleComponent())
        }
      }
    })

    FrontFacesVisibleComponent.entities.listenForRemove(entity => {
      if (entity.has('transform')) {
        entity.get('transform').traverse(o => {
          if (o.userData.isFrontFacing) {
            o.visible = false
          }
        })
      }
      if (entity.has('hostingAttachment')) {
        const attached = entity.get('hostingAttachment').entity
        const attachedVisible = attached.has('frontFacesVisible')
        if (attachedVisible) {
          attached.remove('frontFacesVisible')
        }
      }
    })
  }
  update() {
    //nothing
  }
}
