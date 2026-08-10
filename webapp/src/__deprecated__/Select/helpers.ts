import { IconTypes } from '~/shared/components/Icon/IconConfig'

import { ItemType } from './Select'

export const getSelected = (options: ItemType[], multi: boolean) => {
  const selected = options.filter((option) => option.selected)
  if (selected.length && multi) return selected.map((option) => option.value)
  if (selected.length && !multi) return selected[0].value
  if (multi) return []
  return ''
}

export const getIcon = (
  isOpen: boolean,
  hasValues: boolean,
  clearable: boolean
): IconTypes => {
  if (!isOpen && hasValues && clearable) return 'close-circled'
  if (isOpen) return 'caret-up'
  return 'caret-down'
}
