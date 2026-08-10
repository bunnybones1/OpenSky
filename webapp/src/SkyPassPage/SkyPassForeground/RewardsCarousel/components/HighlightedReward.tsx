import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { SkypassSelectorState } from '~/shared/state/skypass-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { SkyPassThumbnail } from '~/SkyPassPage/SkyPassForeground/RewardsCarousel/shared/components/SkyPassThumbnail/SkyPassThumbnail'

import { SKYPASS_SCALING_CONSTANT } from '../../../shared/constants'
import {
  HighlightedRewardContainer,
  HighlightedRewardWrapper,
  LeftLinesOverlay,
  RightArrow
} from './HighlightedReward.css'

interface HighlightedRewardProps {
  showRightArrow: boolean
  highlightedLevel: number | null
  setRightArrowHighlighted: (isHighlighted: boolean) => void
  onSelect: (rewardToSelect: SkypassSelectorState['selectedLevelAndReward']) => void
  rightArrowHighlighted: boolean
  scrollOffset: (isRight: boolean) => void
}

export const HighlightedReward = memo(
  ({
    showRightArrow,
    setRightArrowHighlighted,
    rightArrowHighlighted,
    scrollOffset,
    highlightedLevel,
    onSelect
  }: HighlightedRewardProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { data: skyPassInfo } = useSkyPassInfo()
    const isTabletWide = useResponsiveQuery('tabletWide')

    if (!skyPassInfo || (!highlightedLevel && !showRightArrow)) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end'
          }),
          HighlightedRewardWrapper
        )}
        style={{
          transform: `scale(${!isTabletWide ? SKYPASS_SCALING_CONSTANT : 1})`
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!!showRightArrow && (
            <motion.div
              key="right-arrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.2 }
              }}
              onClick={() => {
                if (showRightArrow) scrollOffset(true)
              }}
              onMouseEnter={() => {
                if (showRightArrow) setRightArrowHighlighted(true)
              }}
              onMouseLeave={() => {
                if (showRightArrow) setRightArrowHighlighted(false)
              }}
              className={clsx(
                RightArrow,
                Sprinkles({ cursor: 'pointer', zIndex: 3 })
              )}
            >
              {!!getAssetUrl && (
                <img
                  style={{
                    width: '100%',
                    height: '100%'
                  }}
                  src={getAssetUrl(
                    `webapp/icons/${
                      rightArrowHighlighted ? 'arrow-right-highlight' : 'arrow-right'
                    }.webp`
                  )}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          {!!highlightedLevel && (
            <>
              <motion.div
                key="highlighted-reward-lines"
                className={Sprinkles({
                  position: 'relative'
                })}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.2 }
                }}
              >
                <div
                  className={LeftLinesOverlay}
                  style={{
                    display: showRightArrow ? 'initial' : 'none'
                  }}
                />
                {!!getAssetUrl && (
                  <img
                    style={{
                      height: '128px',
                      cursor: 'pointer'
                    }}
                    className={Sprinkles({ zIndex: 3, position: 'relative' })}
                    src={getAssetUrl(`webapp/misc/leftLines.webp`)}
                  />
                )}
              </motion.div>
              <motion.div
                key="highlighted-reward"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.2 }
                }}
                className={HighlightedRewardContainer}
              >
                <SkyPassThumbnail
                  level={highlightedLevel}
                  onClick={onSelect}
                  hasPremium={skyPassInfo.hasPremium}
                  isDefaultFocus={false}
                  cardBackName={skyPassInfo.cardBackName}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

HighlightedReward.displayName = 'HighlightedReward'
