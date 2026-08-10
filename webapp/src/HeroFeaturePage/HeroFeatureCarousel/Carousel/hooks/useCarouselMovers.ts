import { AnimationControls } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'

import { HeroSkinWithTokenId } from '~/HeroFeaturePage/shared/constants'
import { updateHeroFeatureState } from '~/HeroFeaturePage/shared/state'

import { SkinSpacing } from '../../shared/types'

export const getNextHeroId = (
  direction: 'left' | 'right',
  currentId: number,
  heroSkins: HeroSkinWithTokenId[]
) => {
  const currentIndex = heroSkins.findIndex((skin) => skin.id === currentId)

  if (currentIndex !== -1) {
    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1
    const nextSkin = heroSkins[nextIndex]

    if (!!nextSkin) {
      return {
        nextSkin,
        isFirstHero: nextIndex === 0,
        isLastHero: nextIndex === heroSkins.length - 1
      }
    }
  }
  return null
}

interface MoveInDirectionParams {
  skinData: HeroSkinWithTokenId[]
  direction: 'left' | 'right'
  controls: AnimationControls
  elements: { [key: number]: HTMLImageElement }
  skinSpacing: SkinSpacing
}

interface MoveToIdParams {
  idToMoveTo: number
  skinData: HeroSkinWithTokenId[]
  elements: { [key: number]: HTMLImageElement }
  setTransitioning: (isTransitioning: boolean) => void
  controls: AnimationControls
  skinSpacing: SkinSpacing
  skipFadeOut?: boolean
  isFirstMove?: boolean
}

interface MoveAfterResizeParams {
  skinData: HeroSkinWithTokenId[]
  elements: { [key: number]: HTMLImageElement }
  skinSpacing: SkinSpacing
  controls: AnimationControls
}

export const useCarouselMovers = (initialId: number) => {
  const idRef = useRef(initialId)
  const currentXRef = useRef(0)
  const hasCompletedInitialMoveRef = useRef(false)
  const [currentContraints, setCurrentConstraints] = useState({ left: 0, right: 0 })

  /**
   * Moves the carousel by 1 hero skin either left or right
   */
  const moveInDirection = useCallback(
    async ({
      direction,
      skinData,
      controls,
      elements,
      skinSpacing
    }: MoveInDirectionParams) => {
      const nextHeroInfo = getNextHeroId(direction, idRef.current, skinData)

      if (!!nextHeroInfo) {
        const { nextSkin, isFirstHero, isLastHero } = nextHeroInfo
        const nextHeroElement = elements[nextSkin.id]

        if (!!nextHeroElement) {
          idRef.current = nextSkin.id

          let newX = currentXRef.current

          if (isFirstHero) {
            newX = 0
          } else if (direction === 'right') {
            newX = newX + nextHeroElement.offsetWidth
            if (isLastHero) {
              newX = newX - skinSpacing.endSkinPadAmount
              newX = newX + skinSpacing.skinPadAmount
            }
          } else {
            newX = newX - nextHeroElement.offsetWidth
          }

          setCurrentConstraints({ left: -newX, right: -newX })

          currentXRef.current = newX

          await controls.start({
            x: -newX,
            transition: { type: 'tween', duration: 0.4 }
          })
        }
      }
    },
    []
  )

  /**
   * Moves the carousel to a specific hero skin id
   */
  const moveToId = useCallback(
    async ({
      idToMoveTo,
      controls,
      setTransitioning,
      skipFadeOut,
      skinData,
      elements,
      skinSpacing,
      isFirstMove
    }: MoveToIdParams) => {
      setTransitioning(true)
      updateHeroFeatureState('isCarouselMoving', true)

      const currentHeroIndex = skinData.findIndex((skin) => {
        return skin.id === idRef.current
      })

      if (currentHeroIndex === -1) {
        setTransitioning(false)
        updateHeroFeatureState('isCarouselMoving', false)
        return
      }

      const heroToLeft = skinData[currentHeroIndex - 1]
      const heroToRight = skinData[currentHeroIndex + 1]

      if (!!heroToLeft && heroToLeft.id === idToMoveTo) {
        await moveInDirection({
          direction: 'left',
          skinData,
          skinSpacing,
          elements,
          controls
        })

        await controls.start({
          opacity: 1,
          transition: { duration: 0.3 }
        })
      } else if (!!heroToRight && heroToRight.id === idToMoveTo) {
        await moveInDirection({
          direction: 'right',
          skinData,
          skinSpacing,
          elements,
          controls
        })

        await controls.start({
          opacity: 1,
          transition: { duration: 0.3 }
        })
      } else {
        const nextHero = skinData.find((skin) => skin.id === idToMoveTo)
        const nextHeroIndex = skinData.findIndex((skin) => skin.id === idToMoveTo)

        if (
          !!nextHero &&
          nextHeroIndex !== -1 &&
          nextHeroIndex !== currentHeroIndex
        ) {
          idRef.current = idToMoveTo
          const moveDirection = nextHeroIndex > currentHeroIndex ? 'right' : 'left'

          const herosToMoveThrough = skinData.filter((skin, i) => {
            if (moveDirection === 'left') {
              return i < currentHeroIndex && i >= nextHeroIndex
            } else {
              return i > currentHeroIndex && i <= nextHeroIndex
            }
          })

          const moveAmount = herosToMoveThrough.reduce((prev, curr) => {
            const currentEl = elements[curr.id]
            if ('offsetWidth' in currentEl) {
              return prev + currentEl.offsetWidth
            } else {
              return prev
            }
          }, 0)

          const isFirstHero = nextHero.id === skinData[0].id
          const isLastHero = nextHero.id === skinData[skinData.length - 1].id

          let newX = currentXRef.current

          if (isFirstHero) {
            newX = 0
          } else if (moveDirection === 'right') {
            newX = newX + moveAmount
            if (isLastHero) {
              newX = newX - skinSpacing.endSkinPadAmount
              newX = newX + skinSpacing.skinPadAmount
            }
          } else {
            newX = newX - moveAmount
          }

          setCurrentConstraints({ left: -newX, right: -newX })

          if (!skipFadeOut) {
            await controls.start({
              opacity: 0,
              transition: { duration: 0.2 }
            })
          }

          controls.set({
            x: -newX
          })

          currentXRef.current = newX

          await controls.start({
            opacity: 1,
            transition: { duration: 0.3 }
          })
        } else if (
          nextHeroIndex === currentHeroIndex &&
          !hasCompletedInitialMoveRef.current
        ) {
          await controls.start({
            opacity: 1,
            transition: { duration: 0.3 }
          })
        }
      }
      setTransitioning(false)
      updateHeroFeatureState('isCarouselMoving', false)
      if (isFirstMove) {
        hasCompletedInitialMoveRef.current = true
      }
    },
    [moveInDirection]
  )

  /**
   * Readjusts the carousels position after the window has resized
   */
  const moveAfterResize = useCallback(
    ({ skinData, elements, skinSpacing, controls }: MoveAfterResizeParams) => {
      const currentHeroIndex = skinData.findIndex((skin) => skin.id === idRef.current)

      if (currentHeroIndex === -1) return

      const herosToMoveThrough = skinData.filter((skin, i) => {
        return i > 0 && i <= currentHeroIndex
      })

      const moveAmount = herosToMoveThrough.reduce((prev, curr) => {
        const currentEl = elements[curr.id]
        if ('offsetWidth' in currentEl) {
          return prev + currentEl.offsetWidth
        } else {
          return prev
        }
      }, 0)

      const isFirstHero = currentHeroIndex === 0
      const isLastHero = currentHeroIndex === skinData.length - 1

      let newX = 0

      if (isFirstHero) {
        newX = 0
      } else {
        newX = newX + moveAmount
        if (isLastHero) {
          newX = newX - skinSpacing.endSkinPadAmount
          newX = newX + skinSpacing.skinPadAmount
        }
      }

      if (newX === currentXRef.current) return

      setCurrentConstraints({ left: -newX, right: -newX })
      controls.set({
        x: -newX
      })

      currentXRef.current = newX
    },
    []
  )

  const getId = useCallback(() => idRef.current, [])
  const getHasCompletedInitialMove = useCallback(
    () => hasCompletedInitialMoveRef.current,
    []
  )

  return {
    currentContraints,
    moveToId,
    moveAfterResize,
    getId,
    getHasCompletedInitialMove
  }
}
