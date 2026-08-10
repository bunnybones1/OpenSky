import { useMediaQuery } from './useMediaQuery'

export const useIsPortrait = () => {
  return useMediaQuery('(orientation: portrait)')
}
