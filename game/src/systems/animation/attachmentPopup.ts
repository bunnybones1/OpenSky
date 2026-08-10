import { Entity } from 'gg'

import { Components } from '~/components'
import { createAttachmentPopup } from '~/factories/AttachmentPopupFactory'
import { TextSentiment } from '~/helpers/typeHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { findObject3DsWhoseNamesInclude } from '~/utils/threeUtils'

import TextMesh from '../text/TextMesh'
import { Easing } from './Easing'
import { CompleteStatus } from './RawTweener'
import { simpleTweener } from './tweeners'

export function createAttachmentPopupAnimation(
  parentEntity: Entity<Components>,
  text: string,
  flavor: TextSentiment
) {
  const entity = createAttachmentPopup(parentEntity, text, flavor)
  const transform = entity.get('transform')
  const entityId = entity.id

  for (const mesh of findObject3DsWhoseNamesInclude<TextMesh>(
    transform,
    'TEXT'
  )) {
    mesh.opacity = 0

    simpleTweener
      .to({
        description: 'show attachment popup',
        target: mesh,
        propertyGoals: { opacity: 1 },
        duration: 1000,
        easing: Easing.Cubic.Out
      })
      .finished.then(status => {
        if (status === CompleteStatus.Finished) {
          simpleTweener.to({
            description: 'fade attachment popup',
            target: mesh,
            propertyGoals: { opacity: 0 },
            duration: 1000,
            easing: Easing.Cubic.In
          })
        }
      })

    simpleTweener
      .to({
        description: 'slide attachement popup',
        target: mesh.position,
        propertyGoals: {
          z: mesh.position.z - 0.004
        },
        duration: 2000
      })
      .finished.then(() => removeWorldEntity(entityId))
  }
}
