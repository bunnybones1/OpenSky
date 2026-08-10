import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const PromptDialogStyle = style({
  padding: '2px',
  width: '90vw',
  ...responsiveStyle({
    mobile: {
      minWidth: '400px',
      maxWidth: '500px'
    }
  })
})

export const PromptDialogImage = style({
  height: '150px',
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  borderBottom: 'none'
})
