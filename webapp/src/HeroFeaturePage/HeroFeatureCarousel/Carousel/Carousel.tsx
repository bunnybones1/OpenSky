import styled from '@emotion/styled'
import { isMobileBrowser } from '@opensky/shared/native'
import { motion, PanInfo, useAnimationControls } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce, useEvent, useKeyPressEvent, useMeasure } from 'react-use'

import { getHeroDataArray } from '~/HeroFeaturePage/shared/helpers'
import { Box } from '~/shared/components/Base'
import { makeHeroRoute } from '~/shared/helpers/routes/general'

import { HERO_FEATURE_CAROUSEL_Z_INDEXES } from '../shared/constants'
import { SkinSpacing } from '../shared/types'
import { CarouselHeroImage } from './components/CarouselHeroImage'
import { getNextHeroId, useCarouselMovers } from './hooks/useCarouselMovers'

const HERO_ASPECT_RATIO = 648 / 1092

interface GetPadAmountArgs {
  heroLength: number
  index: number
  normalPadAmount: number
  endPadAmount
}

const getPadAmounts = ({
  index,
  endPadAmount,
  normalPadAmount,
  heroLength
}: GetPadAmountArgs) => {
  const paddingLeft = index === 0 ? endPadAmount : normalPadAmount
  const paddingRight = index === heroLength - 1 ? endPadAmount : normalPadAmount
  return {
    paddingLeft,
    paddingRight
  }
}

interface CarouselProps {
  id: number
  setSkinSpacing: (skinSpacing: SkinSpacing) => void
}

export const Carousel = memo(({ id, setSkinSpacing }: CarouselProps) => {
  const heroSkinData = useRef(getHeroDataArray(id))
  const heroSkinElements = useRef<{ [key: number]: HTMLImageElement }>({})
  const [carouselRef, carouselDimensions] = useMeasure<HTMLDivElement>()
  const [containerRef, containerDimensions] = useMeasure<HTMLDivElement>()
  const animationControls = useAnimationControls()
  const navigate = useNavigate()
  const [isReadyToDisplay, setIsReadyToDisplay] = useState(false)
  const isDisplayedRef = useRef<boolean>(false)
  const [isTransitioning, setTransitioning] = useState<boolean>(false)
  const isTransitioningRef = useRef(false)
  const {
    moveToId,
    getHasCompletedInitialMove,
    currentContraints,
    getId,
    moveAfterResize
  } = useCarouselMovers(heroSkinData.current[0].id)

  useEffect(() => {
    isTransitioningRef.current = isTransitioning
  }, [isTransitioning])

  const getIsTransitioning = useCallback(() => {
    return isTransitioningRef.current
  }, [])

  const getHeroInDirection = useCallback(
    (direction: 'left' | 'right') => {
      const nextHeroInfo = getNextHeroId(direction, getId(), heroSkinData.current)

      return nextHeroInfo?.nextSkin.id || undefined
    },
    [getId]
  )

  const skinSpacing = useMemo(() => {
    const skinWidth = carouselDimensions.height * HERO_ASPECT_RATIO
    const emptySpace = containerDimensions.width - skinWidth
    const peekSize = skinWidth * 0.33
    const availableSpaceForPadding = emptySpace - peekSize * 2
    const skinPadAmount = availableSpaceForPadding / 4
    const endSkinPadAmount = skinPadAmount + peekSize + skinPadAmount

    return {
      skinWidth,
      skinPadAmount,
      endSkinPadAmount
    }
  }, [carouselDimensions.height, containerDimensions.width])

  useDebounce(
    () => {
      setSkinSpacing(skinSpacing)
      if (getHasCompletedInitialMove()) {
        moveAfterResize({
          skinData: heroSkinData.current,
          elements: heroSkinElements.current,
          skinSpacing,
          controls: animationControls
        })
      }
    },
    350,
    [skinSpacing]
  )

  const moveCarousel = useCallback(
    (idToMoveTo: number, skipFadeOut?: boolean, isFirstMove?: boolean) => {
      moveToId({
        idToMoveTo,
        controls: animationControls,
        setTransitioning,
        skipFadeOut,
        skinData: heroSkinData.current,
        elements: heroSkinElements.current,
        skinSpacing,
        isFirstMove
      })
    },
    [animationControls, moveToId, skinSpacing]
  )

  useKeyPressEvent('ArrowRight', () => {
    if (!isMobileBrowser() && !isTransitioningRef.current) {
      const nextId = getHeroInDirection('right')

      if (!!nextId) {
        navigate(makeHeroRoute(nextId))
      }
    }
  })

  useKeyPressEvent('ArrowLeft', () => {
    if (!isMobileBrowser() && !isTransitioningRef.current) {
      const nextId = getHeroInDirection('left')

      if (!!nextId) {
        navigate(makeHeroRoute(nextId))
      }
    }
  })

  /**
   * This is used to trigger showing the hero skinds on initial load
   * once we've recieved references to all of their images in the DOM.
   * See: setHeroSkinElement
   */
  useEffect(() => {
    if (
      !isDisplayedRef.current &&
      isReadyToDisplay &&
      !getHasCompletedInitialMove()
    ) {
      isDisplayedRef.current = true
      moveCarousel(id, true, true)
    }
  }, [isReadyToDisplay, moveToId, id, getHasCompletedInitialMove, moveCarousel])

  /**
   * This is used to trigger a transform to a hero skin when the
   * ID param in the route changes, and doesn't match the active heroskin
   * after the initial transform has been made
   */
  useEffect(() => {
    if (getHasCompletedInitialMove() && isDisplayedRef.current && id !== getId()) {
      moveCarousel(id)
    }
  }, [getHasCompletedInitialMove, getId, id, moveCarousel])

  const onDragEnd = useCallback(
    async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isTransitioning) return

      const direction = info.offset.x < 0 ? 'right' : 'left'

      const nextId = getHeroInDirection(direction)

      if (!!nextId) {
        isTransitioningRef.current = true
        navigate(makeHeroRoute(nextId))
      }
    },
    [getHeroInDirection, isTransitioning, navigate]
  )

  /**
   * This funtion is passed to each of the hero skin images, and will save a
   * reference to them once they load. We use these references to measure
   * how much we should transform the carousel left or right in order to show
   * the active hero.
   */
  const setHeroSkinElement = useCallback((id: number, element: HTMLImageElement) => {
    heroSkinElements.current[id] = element

    // Initially when this page renders, the heroes are hidden because we don't yet
    // have their offset data to properly transform the carousel to focus the active one.
    // But once we get references to each element, we can trigger that transform
    if (
      Object.keys(heroSkinElements.current).length === heroSkinData.current.length
    ) {
      setIsReadyToDisplay(true)
    }
  }, [])

  const moveAfterFocus = useCallback(() => {
    if (getHasCompletedInitialMove() && document.visibilityState === 'visible') {
      moveAfterResize({
        skinData: heroSkinData.current,
        elements: heroSkinElements.current,
        skinSpacing,
        controls: animationControls
      })
    }
  }, [animationControls, getHasCompletedInitialMove, moveAfterResize, skinSpacing])

  useEvent('visibilitychange', moveAfterFocus)

  const HeroSkins = useMemo(() => {
    const heroLength = heroSkinData.current.length
    return heroSkinData.current.map((skin, i) => {
      const { paddingLeft, paddingRight } = getPadAmounts({
        index: i,
        heroLength,
        endPadAmount: skinSpacing.endSkinPadAmount,
        normalPadAmount: skinSpacing.skinPadAmount
      })

      const padding = `0px ${paddingRight}px 0px ${paddingLeft}px`

      const currentSkinIndex = heroSkinData.current.findIndex(
        (_skin) => _skin.id === id
      )

      const leftHero = heroSkinData.current[currentSkinIndex - 1]
      const rightHero = heroSkinData.current[currentSkinIndex + 1]

      return (
        <CarouselHeroImage
          id={skin.id}
          key={skin.id}
          artID={skin.artID}
          padding={padding}
          setElement={setHeroSkinElement}
          isActive={id === skin.id}
          isLeft={!!leftHero && leftHero.id === skin.id}
          isRight={!!rightHero && rightHero.id === skin.id}
          getIsTransitioning={getIsTransitioning}
        />
      )
    })
  }, [
    skinSpacing.endSkinPadAmount,
    skinSpacing.skinPadAmount,
    setHeroSkinElement,
    id,
    getIsTransitioning
  ])

  return (
    <Box
      position="absolute"
      zIndex={HERO_FEATURE_CAROUSEL_Z_INDEXES.CAROUSEL}
      left="0px"
      top="0px"
      height="100%"
      width="100%"
      ref={containerRef}
    >
      <StyledCarousel
        initial={{ opacity: 0 }}
        ref={carouselRef}
        dragConstraints={{
          left: currentContraints.left,
          right: currentContraints.right
        }}
        dragElastic={false}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        drag={isTransitioning ? false : 'x'}
        animate={animationControls}
      >
        {HeroSkins}
      </StyledCarousel>
    </Box>
  )
})

const StyledCarousel = styled(motion.div)`
  min-width: min-content;
  height: 100%;
  display: flex;
  flex-wrap: nowrap;
`

Carousel.displayName = 'Carousel'
