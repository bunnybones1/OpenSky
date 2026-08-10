import { SIDEBAR_WIDTH } from '~/constants'

export const SIDEBAR_ANIMATION_DURATION = 300
export const ROW_WIDTH = SIDEBAR_WIDTH
export const ROW_HEIGHT = 50
export const DROP_SHADOW_WIDTH = 4
export const STROKE_BORDER_WIDTH = 1

export enum SidebarStatus {
  Hidden,
  Revealed,
  Hiding,
  Revealing
}

export enum SidebarPosition {
  Left,
  Right
}
