import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { ItemType } from '~/lib/proto'
import { SoundClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { useSelector } from '~/shared/redux/index'
import { skyPassParamsSelector } from '~/shared/redux/router/selectors'
import { SelectedLevelAndReward } from '~/shared/state/skypass-state'

import { SKYPASS_SCALING_CONSTANT } from '../../shared/constants'
import { HighlightedReward } from './components/HighlightedReward'
import {
  RewardsCarouselContainer,
  RewardsCarouselWrapper,
  RewardsScrollArrow,
  RewardsScrollOverlay,
  TitleLevelSpacer,
  TitleLevelSpacerWrapper
} from './RewardsCarousel.css'
import { SkyPassThumbnail } from './shared/components/SkyPassThumbnail/SkyPassThumbnail'

export const RewardsCarousel = memo(() => {
  const { level: levelParam } = useSelector(skyPassParamsSelector)
  const { getAssetUrl } = useGetAssetContext()
  const isTablet = useResponsiveQuery('tablet')
  const [rightArrowHighlighted, setRightArrowHighlighted] = useState(false)
  const [leftArrow, setLeftArrow] = useState('arrow-left')
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [highlightedLevel, setHighlightedLevel] = useState<number | null>(null)
  const targetElement = useRef<HTMLDivElement>(null)
  const visibleRewards = useRef<number[]>([])
  const { data: skyPassInfo } = useSkyPassInfo()
  const hasInitializedHighlighted = useRef(false)
  const { navigateToSkypassReward } = useNavigateToSkyPass()

  const onSelect = useCallback(
    (rewardToSelect: SelectedLevelAndReward) => {
      SoundClient.playSound('JuicySwipeStandalone')
      navigateToSkypassReward(rewardToSelect)
    },
    [navigateToSkypassReward]
  )

  const setRewardVisibility = useCallback((levelNum: number, isVisible: boolean) => {
    if (visibleRewards.current.includes(levelNum) && !isVisible) {
      visibleRewards.current = visibleRewards.current.filter(
        (_levelNum) => _levelNum !== levelNum
      )
    } else if (!visibleRewards.current.includes(levelNum) && !!isVisible) {
      visibleRewards.current.push(levelNum)
    }
  }, [])

  const scrollToElement = useCallback(
    (left: number) => {
      if (targetElement.current) {
        const clientWidth = targetElement.current?.clientWidth || 0
        const adjustedLeft = isTablet ? left : left / SKYPASS_SCALING_CONSTANT

        targetElement.current.scrollTo({
          top: 0,
          left: adjustedLeft - clientWidth / (isTablet ? 1.5 : 1.8),
          behavior: 'auto'
        })
      }
    },
    [isTablet]
  )

  const levels = useMemo(() => {
    if (!skyPassInfo?.levels) return null

    const _levels: ReactNode[] = []

    skyPassInfo.levels.forEach((level, index) => {
      const lastReward = skyPassInfo.levels[index - 1]

      const hasGap = !!lastReward && level.level - lastReward.level > 1

      if (hasGap) {
        _levels.push(
          <div
            className={TitleLevelSpacerWrapper}
            style={{ scrollMargin: `calc(50vw - 64px)` }}
            key={`${level.level}-spacer`}
          >
            <div className={TitleLevelSpacer} />
          </div>
        )
      }

      _levels.push(
        <SkyPassThumbnail
          key={level.level}
          level={level.level}
          onClick={onSelect}
          hasPremium={!!skyPassInfo?.hasPremium}
          setRewardVisibility={setRewardVisibility}
          isDefaultFocus={!!levelParam && levelParam === level.level}
          cardBackName={skyPassInfo?.cardBackName}
          scrollToLevel={scrollToElement}
        />
      )
    })

    return _levels
  }, [
    skyPassInfo?.levels,
    skyPassInfo?.hasPremium,
    skyPassInfo?.cardBackName,
    onSelect,
    setRewardVisibility,
    scrollToElement,
    levelParam
  ])

  const scrollOffset = useCallback(
    (isRight: boolean) => {
      if (targetElement.current) {
        targetElement.current.scrollTo({
          top: 0,
          left: isRight
            ? targetElement.current?.clientWidth / 2 +
              targetElement.current.scrollLeft
            : targetElement.current.scrollLeft -
              targetElement.current?.clientWidth / 2,
          behavior: 'smooth'
        })
      }
    },
    [targetElement]
  )

  const handleHighlightedReward = useCallback(() => {
    if (!skyPassInfo?.levels) {
      return
    }

    const lastVisibleLevel = visibleRewards.current.sort((a, b) => a - b)[
      visibleRewards.current.length - 1
    ]

    const importantLevels = skyPassInfo.levels.filter((_level) => {
      if (
        _level.rewards.some(
          (_reward) =>
            _reward.itemType === ItemType.SW_CARD_BACKS ||
            _reward.itemType === ItemType.SW_TITLES
        )
      ) {
        if (
          (!lastVisibleLevel || _level.level > lastVisibleLevel) &&
          !_level.rewards.every((_reward) => _reward.claimed)
        )
          return true
      }
      return false
    })

    if (!!importantLevels.length) {
      setHighlightedLevel(importantLevels[0].level)
    } else {
      setHighlightedLevel(null)
    }
  }, [skyPassInfo?.levels])

  useEffect(() => {
    if (!!skyPassInfo?.levels && !hasInitializedHighlighted.current) {
      handleHighlightedReward()
      hasInitializedHighlighted.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skyPassInfo?.levels])

  const handleOnScroll = (e) => {
    if (e.target) {
      handleHighlightedReward()
      const { scrollLeft, scrollWidth, clientWidth } = e.target
      setShowLeftArrow(scrollLeft > 0)
      if (scrollLeft <= 0) setLeftArrow('arrow-left')
      setShowRightArrow(!(scrollWidth - clientWidth <= scrollLeft))
      if (scrollWidth - clientWidth === scrollLeft) setRightArrowHighlighted(false)
    }
  }

  const renderArrow = (key, arrow) => {
    if (!getAssetUrl) return null
    return (
      <motion.img
        key={key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 0.2 }
        }}
        style={{
          width: '100%',
          height: '100%'
        }}
        src={getAssetUrl(`webapp/icons/${arrow}.webp`)}
      />
    )
  }

  if (!levels) return null

  return (
    <FlexBox
      type="start-row"
      mt={[0, 0, 24, 24]}
      pb={[0, 0, 24, 24]}
      className={clsx('rewardsCarouselWrapper', RewardsCarouselWrapper)}
    >
      <FlexBox
        type="start-row"
        flexWrap="nowrap"
        ref={targetElement}
        onScroll={handleOnScroll}
        width={!isTablet ? `calc(100% / ${SKYPASS_SCALING_CONSTANT})` : '100%'}
        pl={[28, 28, 72, 72, 72]}
        top={[8, 8, 0, 0]}
        className={clsx('rewardCarouselContainer', RewardsCarouselContainer)}
        style={{
          transform: `scale(${!isTablet ? SKYPASS_SCALING_CONSTANT : 1})`,
          transformOrigin: 'top left'
        }}
      >
        {levels}
        <Box
          style={{
            height: !isTablet ? `calc(130px * ${SKYPASS_SCALING_CONSTANT})` : '130px',
            width: '228px',
            flexShrink: 0
          }}
        />
      </FlexBox>
      <Box
        className={clsx('rewardsScrollOverlay', RewardsScrollOverlay)}
        style={{
          display: showLeftArrow ? 'initial' : 'none'
        }}
      />
      <Box
        onClick={() => {
          if (showLeftArrow) scrollOffset(false)
        }}
        onMouseEnter={() => {
          if (showLeftArrow) setLeftArrow('arrow-left-highlight')
        }}
        onMouseLeave={() => {
          if (showLeftArrow) setLeftArrow('arrow-left')
        }}
        className={clsx('rewardsScrollArrow', RewardsScrollArrow)}
        style={{
          left: !isTablet ? '-8px' : '0',
          transform: `scale(${!isTablet ? SKYPASS_SCALING_CONSTANT : 1})`,
          cursor: showLeftArrow ? 'pointer' : 'default'
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {showLeftArrow && renderArrow('left-arrow-rewards', leftArrow)}
        </AnimatePresence>
      </Box>
      <HighlightedReward
        showRightArrow={showRightArrow}
        scrollOffset={scrollOffset}
        onSelect={onSelect}
        highlightedLevel={highlightedLevel}
        rightArrowHighlighted={rightArrowHighlighted}
        setRightArrowHighlighted={setRightArrowHighlighted}
      />
    </FlexBox>
  )
})

RewardsCarousel.displayName = 'RewardsCarousel'
