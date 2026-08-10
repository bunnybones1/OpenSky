import { SkyTagTitlesLibrary } from '@opensky/shared/cosmetics'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { FONT_SIZES } from '~/shared/style/constants'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useGetAssetContext } from '../hooks/useGetAssetContext'
import { SkyTagBorderImageStyle, SkyTagTitleText } from './SkyTagTitle.css'

interface SkyTagTitleProps {
  id: number
  fontSize: keyof typeof FONT_SIZES
}

export const SkyTagTitle = memo(({ id, fontSize }: SkyTagTitleProps) => {
  const { getAssetUrl } = useGetAssetContext()

  const skyTagTitle = useMemo(() => {
    return SkyTagTitlesLibrary.get(id)
  }, [id])

  const { borderWidth, yPadding } = useMemo(() => {
    const fontNumber = Number(fontSize.replace('px', ''))

    const xPadding = fontNumber * 1.8
    const yPadding = fontNumber * 0.5

    return {
      yPadding,
      borderWidth: `${yPadding}px ${xPadding}px ${yPadding}px ${xPadding}px`
    }
  }, [fontSize])

  if (!skyTagTitle || !getAssetUrl) return null

  return (
    <div
      style={{
        borderImageSource: `url(${getAssetUrl(
          `webapp/titles/@4x/${skyTagTitle.asset}@4x.webp`
        )})`,
        color: 'transparent',
        borderWidth
      }}
      className={clsx(
        SkyTagBorderImageStyle,
        Sprinkles({
          position: 'relative',
          fontSize,
          fontWeight: '700',
          fontFamily: 'normal',
          flexShrink: 0
        }),
        SkyTagTitleText
      )}
    >
      {skyTagTitle.name}
      <div
        className={Sprinkles({
          position: 'absolute',
          zIndex: 1,
          fontSize,
          fontWeight: '700',
          fontFamily: 'normal',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        })}
        style={{
          top: `-${yPadding / 10}px`,
          textShadow: `0px 0px 2px ${skyTagTitle.glowColor}, 0px 0px 2px ${skyTagTitle.glowColor}, 0px 0px 6px ${skyTagTitle.glowColor}`,
          color: skyTagTitle.textColor
        }}
      >
        {skyTagTitle.name}
      </div>
    </div>
  )
})

SkyTagTitle.displayName = 'SkyTagTitle'
