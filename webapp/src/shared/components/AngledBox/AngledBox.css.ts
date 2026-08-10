import { createVar, style } from '@vanilla-extract/css'
import { recipe } from '@vanilla-extract/recipes'
import { mapValues, merge } from 'lodash-es'

export const ANGLED_BOX_BORDER_SIZES = ['1px', '2px', '4px', '6px'] as const

export type AngledBoxBorderSizes = (typeof ANGLED_BOX_BORDER_SIZES)[number]

export const ANGLED_BOX_CORNER_SIZES = ['8px', '12px', '16px'] as const

export type AngledBoxCornerSizes = (typeof ANGLED_BOX_CORNER_SIZES)[number]

export const ANGLED_BOX_CORNER_TYPES = [
  'default',
  'leftDisabled',
  'rightDisabled',
  'flipped',
  'flippedLeftDisabled',
  'flippedRightDisabled'
] as const

export type AngledBoxCornerTypes = (typeof ANGLED_BOX_CORNER_TYPES)[number]

export const borderSizeVar = createVar()
export const cornerSizeVar = createVar()

export const borderColorVar = createVar()
export const backgroundColorVar = createVar()
export const hoverBorderColorVar = createVar()
export const hoverBackgroundColorVar = createVar()

export const INNER_CLIP_PATHS: { [key in AngledBoxCornerTypes]: string } = {
  default: `polygon(
    ${borderSizeVar} calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(${cornerSizeVar} + ${borderSizeVar} * 0.5) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)),
    calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)) calc(100% - ${borderSizeVar}),
    calc(${borderSizeVar}) calc(100% - ${borderSizeVar})
  )`,
  leftDisabled: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - ${borderSizeVar}) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)),
    calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)) calc(100% - ${borderSizeVar}),
    calc(${borderSizeVar}) calc(100% - ${borderSizeVar})
  )`,
  rightDisabled: `polygon(
    ${borderSizeVar} calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(${cornerSizeVar} + ${borderSizeVar} * 0.5) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(100% - ${borderSizeVar}),
    calc(${borderSizeVar}) calc(100% - ${borderSizeVar})
  )`,
  flipped: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(100% - ${borderSizeVar}) calc(100% - ${borderSizeVar}),
    calc(${cornerSizeVar} + ${borderSizeVar} * 0.5) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5))
  )`,
  flippedLeftDisabled: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(100% - ${borderSizeVar}) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - ${borderSizeVar})
  )`,
  flippedRightDisabled: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - ${borderSizeVar}) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(100% - ${borderSizeVar}) calc(100% - ${borderSizeVar}),
    calc(${cornerSizeVar} + ${borderSizeVar} * 0.5) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5))
  )`
}

export const OUTER_CLIP_PATHS: { [key in AngledBoxCornerTypes]: string } = {
  default: `polygon(
    ${cornerSizeVar} 0%,
    100% 0,
    100% calc(100% - ${cornerSizeVar}),
    calc(100% - ${cornerSizeVar}) 100%,
    0 100%,
    0% ${cornerSizeVar}
  )`,
  leftDisabled: `polygon(
    0 0%,
    100% 0,
    100% calc(100% - ${cornerSizeVar}),
    calc(100% - ${cornerSizeVar}) 100%,
    0 100%,
    0% ${cornerSizeVar}
  )`,
  rightDisabled: `polygon(
    ${cornerSizeVar} 0%,
    100% 0,
    100% 100%,
    0 100%,
    0% ${cornerSizeVar}
  )`,
  flipped: `polygon(
    0 0,
    calc(100% - ${cornerSizeVar}) 0,
    100% ${cornerSizeVar},
    100% 100%,
    ${cornerSizeVar} 100%,
    0 calc(100% - ${cornerSizeVar})
  )`,
  flippedLeftDisabled: `polygon(
    0 0,
    calc(100% - ${cornerSizeVar}) 0,
    100% ${cornerSizeVar},
    100% 100%,
    0 100%
  )`,
  flippedRightDisabled: `polygon(
    0 0,
    100% 0,
    100% 100%,
    ${cornerSizeVar} 100%,
    0 calc(100% - ${cornerSizeVar})
  )`
}
export const BaseAngledBoxOuterStyle = style({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  border: 0,
  position: 'relative',
  isolation: 'isolate',
  display: 'inline-grid',
  transition: '0.125s ease-in',
  background: backgroundColorVar,
  '::before': {
    content: '',
    position: 'absolute',
    inset: 0,
    background: borderColorVar,
    transition: '0.125s ease-in',
    zIndex: -2
  },
  '::after': {
    content: '',
    position: 'absolute',
    inset: 0,
    background: backgroundColorVar,
    zIndex: -1
  },
  selectors: {
    '&:hover': {
      background: hoverBackgroundColorVar
    },
    '&:hover::before': {
      background: hoverBorderColorVar
    }
  }
})

type BorderSizeVariant = {
  [key in AngledBoxBorderSizes]: { vars: { [key: typeof borderSizeVar]: string } }
}

type CornerSizeVariant = {
  [key in AngledBoxCornerSizes]: { vars: { [key: typeof cornerSizeVar]: string } }
}

export const AngledBoxOuterRecipe = recipe({
  base: [BaseAngledBoxOuterStyle],
  variants: {
    borderSize: ANGLED_BOX_BORDER_SIZES.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: {
          vars: { [borderSizeVar]: curr }
        }
      }
    }, {} as BorderSizeVariant),
    cornerSize: ANGLED_BOX_CORNER_SIZES.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: {
          vars: { [cornerSizeVar]: curr }
        }
      }
    }, {} as CornerSizeVariant),
    cornerType: merge(
      mapValues(INNER_CLIP_PATHS, (value) => [
        { '::after': { WebkitClipPath: value, clipPath: value } }
      ]),
      mapValues(OUTER_CLIP_PATHS, (value) => [
        { WebkitClipPath: value, clipPath: value }
      ])
    )
  },
  defaultVariants: {
    borderSize: '4px',
    cornerSize: '12px',
    cornerType: 'default'
  }
})

export const BaseAngledBoxInnerStyle = style({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: 'transparent',
  transition: '0.125s ease-in'
})

export const AngledBoxInnerRecipe = recipe({
  base: [BaseAngledBoxInnerStyle],
  variants: {
    cornerType: mapValues(INNER_CLIP_PATHS, (value) => ({
      WebkitClipPath: value,
      clipPath: value
    }))
  },
  defaultVariants: { cornerType: 'default' }
})
