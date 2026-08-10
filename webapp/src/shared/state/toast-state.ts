import { v4 } from 'uuid'
import { proxy } from 'valtio'
import { proxyMap } from 'valtio/utils'

import { IconTypes } from '../components/Icon/IconConfig'
import { ThemeColorType } from '../style/Theme'

export interface Toast {
  text?: string
  secondaryText?: string
  duration?: number
  icon?: IconTypes | 'error'
  iconColor?: ThemeColorType
  onClick?: () => void
  onClickText?: string
  isEvergreen?: boolean
  id: string
}

type ToastsState = Map<string, Toast>

export const toastState = proxy<ToastsState>(proxyMap())

export const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = v4()

  if (!toast.duration && !toast.isEvergreen) toast.duration = 6

  toastState.set(id, { ...toast, id })
}

export const removeToast = (id: string) => {
  toastState.delete(id)
}

export const clearAllToasts = () => {
  toastState.clear()
}
