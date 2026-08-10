import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BottomGradient,
  SkyPassPurchaseBackgroundStyle,
  TopGradient
} from './SkyPassPurchaseBackground.css'

export const SkyPassPurchaseBackground = memo(() => {
  const { data: skyPassInfo } = useSkyPassInfo()
  const { getAssetUrl } = useGetAssetContext()

  const background = useMemo(() => {
    if (!skyPassInfo?.seasonArtistName || !getAssetUrl) return
    const url = getAssetUrl(
      `webapp/backgrounds/spbg-${skyPassInfo.seasonArtistName}-left.webp`
    )
    return `linear-gradient(0deg, rgba(12, 6, 30, 0.4), rgba(12, 6, 30, 0.4)), url(${url})`
  }, [getAssetUrl, skyPassInfo])

  return (
    <>
      <div
        className={clsx(
          Sprinkles({
            top: 0,
            left: 0,
            position: 'absolute',
            pointerEvents: 'none',
            width: 'full',
            height: 'full',
            zIndex: 1
          }),
          SkyPassPurchaseBackgroundStyle
        )}
        style={{
          background
        }}
      />
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 3
          }),
          TopGradient
        )}
      />
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'absolute',
            bottom: 0,
            left: 0,
            zIndex: 3
          }),
          BottomGradient
        )}
      />
    </>
  )
})

SkyPassPurchaseBackground.displayName = 'SkyPassPurchaseBackground'
