import clsx from 'clsx'
import { memo, useEffect, useRef } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchMakerColorType } from '../shared/type'
import { MatchMakerWidgetBackgroundStyle } from './MatchMakerWidgetBackground.css'

interface MatchMakerWidgetBackgroundProps {
  color: MatchMakerColorType
}

export const MatchMakerWidgetBackground = memo(
  ({ color }: MatchMakerWidgetBackgroundProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const hasPreloaded = useRef(false)

    useEffect(() => {
      if (!!getAssetUrl && !hasPreloaded.current) {
        const img = new Image()
        img.src = getAssetUrl('webapp/video/matchmaker-bg-blue.mp4')
        img.src = getAssetUrl('webapp/video/matchmaker-bg-orange.mp4')
        img.src = getAssetUrl('webapp/video/matchmaker-bg-green.mp4')
      }
    }, [getAssetUrl])

    if (!getAssetUrl) return null

    return (
      <video
        autoPlay={true}
        loop={true}
        muted={true}
        playsInline={true}
        className={clsx(
          Sprinkles({
            position: 'absolute',
            bottom: 0,
            zIndex: 1,
            pointerEvents: 'none'
          }),
          MatchMakerWidgetBackgroundStyle
        )}
        src={getAssetUrl(`webapp/video/matchmaker-bg-${color}.mp4`)}
      />
    )
  }
)

MatchMakerWidgetBackground.displayName = 'MatchMakerWidgetBackground'
