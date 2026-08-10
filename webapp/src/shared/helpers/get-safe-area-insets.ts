import {
  SAI_BOTTOM_KEY,
  SAI_LEFT_KEY,
  SAI_RIGHT_KEY,
  SAI_TOP_KEY
} from '~/shared/style/constants'

export const getSafeAreaInsets = () => {
  const top = getComputedStyle(document.documentElement).getPropertyValue(SAI_TOP_KEY)
  const bottom = getComputedStyle(document.documentElement).getPropertyValue(
    SAI_BOTTOM_KEY
  )
  const left = getComputedStyle(document.documentElement).getPropertyValue(
    SAI_LEFT_KEY
  )
  const right = getComputedStyle(document.documentElement).getPropertyValue(
    SAI_RIGHT_KEY
  )

  return {
    top: top.includes('px') ? Number(top.replace('px', '')) : undefined,
    bottom: bottom.includes('px') ? Number(bottom.replace('px', '')) : undefined,
    left: left.includes('px') ? Number(left.replace('px', '')) : undefined,
    right: right.includes('px') ? Number(right.replace('px', '')) : undefined
  }
}
