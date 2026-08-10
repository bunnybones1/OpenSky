import { Vector3 } from 'three'

import { SIZE_RATIO_CARD_TO_ATTACHMENT } from '~/constants'

interface BasicAttachmentTransform {
  scale: number
  offset: Vector3
}
type AttachmentTypes = 'spellHomeToken' | 'spellHome' | 'spellHomeHand'

export const ATTACHMENT_TRANSFORMS: {
  [K in AttachmentTypes]: BasicAttachmentTransform
} = {
  spellHomeToken: {
    offset: new Vector3(0, 0.0015, 0.0095),
    scale: 1 / SIZE_RATIO_CARD_TO_ATTACHMENT
  },
  spellHome: {
    offset: new Vector3(0.0165, 0.002, 0.0005),
    scale: 0.8 / SIZE_RATIO_CARD_TO_ATTACHMENT
  },
  spellHomeHand: {
    offset: new Vector3(0.007, 0.002, -0.01),
    scale: 0.8 / SIZE_RATIO_CARD_TO_ATTACHMENT
  }
}
