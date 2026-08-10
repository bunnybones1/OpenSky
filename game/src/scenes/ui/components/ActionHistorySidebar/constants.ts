import { Color, Vector2 } from 'three'

import { ACTION_HISTORY_SIDEBAR_WIDTH } from '~/constants'

export const SIDEBAR_ANIMATION_DURATION = 300
export const ROW_WIDTH = ACTION_HISTORY_SIDEBAR_WIDTH
export const ROW_HEIGHT = 126 / 2
export const CELL_SIZE = 120 / 2
// export const GRADIENT_HEIGHT = 25
export const DROP_SHADOW_WIDTH = 8
export const HOVERED_BORDER_COLOR_MULTIPLIER = 1.8

export const GRAPHICAL_PIXEL_SIZE = new Vector2(1.764, 1.764)
export const backgroundColor = new Color(0x06040f)
export const playerColor = new Color(0x6666ff)
export const enemyColor = new Color(0xff6666)
