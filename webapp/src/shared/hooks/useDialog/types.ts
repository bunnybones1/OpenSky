import { ComponentProps, ComponentType } from 'react'

export interface DialogChildProps {
  id: string
}

export type DialogOptions<C extends ComponentType<any & DialogChildProps>> = {
  id: string
  className?: string
  isCloseButtonDisabled?: boolean
  isBorderDisabled?: boolean
  isGlowDisabled?: boolean
  isClickoffDisabled?: boolean
  isAnimationDisabled?: boolean
  isSoundDisabled?: boolean
  onCancel?: () => void
  Element: C
} & Omit<ComponentProps<C>, keyof DialogChildProps>
