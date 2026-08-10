import clsx from 'clsx'
import { memo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuestDifficulty } from '../../../types/quests'

interface QuestDifficultyMarkProps {
  difficulty: QuestDifficulty
  isClaimed?: boolean
  isClaimable?: boolean
}

export const QuestDifficultyMark = memo(
  ({ difficulty, isClaimed, isClaimable }: QuestDifficultyMarkProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { isLoaded, handleLoad, imgRef } = useImageIsLoaded()

    if (!getAssetUrl) return null

    return (
      <img
        src={getAssetUrl(
          `webapp/misc/quest-${
            difficulty === QuestDifficulty.UNKNOWN ? 'easy' : difficulty.toLowerCase()
          }${
            (difficulty === QuestDifficulty.UNKNOWN ||
              difficulty === QuestDifficulty.EASY) &&
            (!!isClaimed || !!isClaimable)
              ? '-blue'
              : ''
          }.webp`
        )}
        onLoad={handleLoad}
        ref={imgRef}
        className={clsx(
          Sprinkles({
            width: 'full',
            opacity: isLoaded ? 1 : 0,
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 3
          }),
          FadeInImageStyle
        )}
      />
    )
  }
)

QuestDifficultyMark.displayName = 'QuestDifficultyMark'
