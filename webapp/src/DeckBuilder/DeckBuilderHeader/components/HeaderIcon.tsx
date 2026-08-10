import { memo } from 'react'

import { deckBuilderDeckClassSelector } from '~/DeckBuilder/shared/selectors'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSelector } from '~/shared/redux'

import { DeckBuilderHeaderIconStyle } from './HeaderIcon.css'

export const HeaderIcon = memo(() => {
  const prism = useSelector(deckBuilderDeckClassSelector)
  const { getAssetUrl } = useGetAssetContext()

  if (!prism || !getAssetUrl) return null

  return (
    <img
      src={getAssetUrl(`webapp/icons/prisms/large/${prism}.webp`)}
      className={DeckBuilderHeaderIconStyle}
    />
  )
})

HeaderIcon.displayName = 'HeaderIcon'
