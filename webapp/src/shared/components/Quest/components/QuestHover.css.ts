import { style } from '@vanilla-extract/css'

import { QUEST_WRAPPER_CLASSNAME } from '../shared/constants'

export const QuestHoverStyle = style({
  selectors: {
    [`.${QUEST_WRAPPER_CLASSNAME}:hover &`]: {
      opacity: 1
    }
  }
})
