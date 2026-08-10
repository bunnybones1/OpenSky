import clsx from 'clsx'
import { memo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  QuestEpicBackFrameStyle,
  QuestEpicFrontFrameStyle,
  QuestEpicText,
  QuestEpicTextFont,
  QuestEpicTextSpan
} from './QuestEpicFrame.css'

interface QuestEpicFrameProps {
  epicIndex: number
  epicLength: number
}

export const QuestEpicFrame = memo(
  ({ epicLength, epicIndex }: QuestEpicFrameProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { isLoaded, handleLoad, imgRef } = useImageIsLoaded()

    if (!getAssetUrl) return null

    return (
      <>
        <img
          ref={imgRef}
          onLoad={handleLoad}
          src={getAssetUrl('webapp/misc/quest-epic-back.webp')}
          className={clsx(
            Sprinkles({
              width: 'full',
              opacity: isLoaded ? 1 : 0,
              position: 'absolute',
              left: 0,
              zIndex: 1,
              pointerEvents: 'none'
            }),
            QuestEpicFrontFrameStyle,
            FadeInImageStyle
          )}
        />
        <img
          ref={imgRef}
          onLoad={handleLoad}
          src={getAssetUrl('webapp/misc/quest-epic-front.webp')}
          className={clsx(
            Sprinkles({
              width: 'full',
              opacity: isLoaded ? 1 : 0,
              position: 'absolute',
              left: 0,
              top: 0,
              pointerEvents: 'none'
            }),
            QuestEpicBackFrameStyle,
            FadeInImageStyle
          )}
        />
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // fontSize: isLarge ? '14px' : '10px',
              pointerEvents: 'none'
            }),
            QuestEpicText
          )}
          // dangerouslySetInnerHTML={{
          //   __html: `${epicIndex} <span class="${QuestEpicTextSpan}">/ ${epicLength}</span>`
          // }}
        >
          <div
            className={clsx(
              Sprinkles({
                fontWeight: '700',
                color: 'white'
              }),
              QuestEpicTextFont
            )}
          >
            {epicIndex}
          </div>
          <span
            className={clsx(
              Sprinkles({
                fontWeight: '700',
                marginLeft: '4px'
              }),
              QuestEpicTextFont,
              QuestEpicTextSpan
            )}
          >
            {`/ ${epicLength}`}
          </span>
        </div>
      </>
    )
  }
)

QuestEpicFrame.displayName = 'QuestEpicFrame'
