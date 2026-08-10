import { memo, ReactNode } from 'react'

import { useMediaQuery } from '~/shared/hooks/ui/useMediaQuery'

import { HoverDeckSelectorWrapper } from './components/HoverDeckSelectorWrapper'
import { PressDeckSelectorWrapper } from './components/PressDeckSelectorWrapper'

interface DeckSelectorDeckWrapperProps {
  uuid: string
  children: ReactNode
}

export const DeckSelectorDeckWrapper = memo(
  ({ uuid, children }: DeckSelectorDeckWrapperProps) => {
    const isTouchDevice = useMediaQuery('(any-hover: none)')

    if (isTouchDevice) {
      return (
        <PressDeckSelectorWrapper uuid={uuid}>{children}</PressDeckSelectorWrapper>
      )
    }

    return <HoverDeckSelectorWrapper uuid={uuid}>{children}</HoverDeckSelectorWrapper>
  }
)

DeckSelectorDeckWrapper.displayName = 'DeckSelectorDeckWrapper'
