import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CardType } from '~/shared/constants/cards'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { OverlayCardImage, OverlayCardShadow } from './OverlayCard.css'

interface OverlayCardProps {
  baseId: string
  grade: CardType['grade']
}

export const OverlayCard = memo(({ baseId, grade }: OverlayCardProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const { i18n } = useTranslation()

  const src = useMemo(() => {
    if (!getAssetUrl) return
    let suffix = ''

    if (grade === ItemType.SW_GOLD_CARDS) suffix = '-gold'
    if (grade === ItemType.SW_SILVER_CARDS) suffix = '-silver'

    return getAssetUrl(
      `webapp/cards/full-cards/${i18n.language}/4x/${baseId}${suffix}.webp`
    )
  }, [baseId, i18n, getAssetUrl, grade])

  return (
    <>
      {!!src && <img src={src} className={OverlayCardImage} />}

      {!!getAssetUrl && (
        <img
          className={OverlayCardShadow}
          src={getAssetUrl('webapp/cards/full-cards/frame-shadow.webp')}
        />
      )}
    </>
  )
})

OverlayCard.displayName = 'OverlayCard'
