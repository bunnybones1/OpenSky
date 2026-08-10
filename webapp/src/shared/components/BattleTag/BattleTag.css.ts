import { style } from '@vanilla-extract/css'

export const BattleTagWrapperStyle = style({
  height: '54px',
  maxWidth: '378px',
  selectors: {
    '&.isSmall': {
      maxWidth: '240px'
    },
    '&.isRight': {
      clipPath: 'polygon(0 0, 100% 0%, calc(100% - 16px) 100%, 0% 100%)'
    },
    '&.isLeft': {
      clipPath: 'polygon(0 0, 100% 0%, 100% 100%, calc(0% + 16px) 100%);'
    }
  }
})

export const BattleTagInnerStyle = style({
  selectors: {
    '&.isRight': {
      clipPath:
        'polygon(1px 1px, calc(100% - 1.7px) 1px, calc(100% - 17px) calc(100% - 1px), 1px calc(100% - 1px))'
    },
    '&.isLeft': {
      clipPath:
        'polygon(1.7px 1px, calc(100% - 1px) 1px, calc(100% - 1px) calc(100% - 1px), calc(0% + 17px) calc(100% - 1px));'
    }
  }
})

export const BattleTagLineDetail = style({
  width: '1px',
  background:
    'linear-gradient(180deg, rgba(112,91,171,1) 0%, rgba(112,91,171,0) 100%)',
  right: '20px',
  top: '-1px',
  height: 'calc(100% - 2px)',
  transform: 'rotate(17deg)',
  selectors: {
    '&.isLeft': {
      right: 'auto',
      left: '20px',
      transform: 'rotate(-17deg)'
    }
  }
})

export const BattleTagNameStyle = style({
  lineHeight: '140%'
})
