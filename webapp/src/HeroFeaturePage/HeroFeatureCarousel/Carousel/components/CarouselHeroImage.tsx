import styled from '@emotion/styled'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { memo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  HERO_FEATURE_SELECTOR_HEIGHT,
  MOBILE_HERO_FEATURE_SELECTOR_HEIGHT
} from '~/HeroFeaturePage/shared/constants'
import { Box } from '~/shared/components/Base'
import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

const isFireFox = (): boolean => {
  if (!navigator.userAgent) return false
  return navigator.userAgent.indexOf('Firefox') !== -1
}

interface CarouselHeroImageProps {
  artID: string
  padding: string
  id: number
  setElement: (id: number, element: HTMLImageElement) => void
  isActive: boolean
  isLeft: boolean
  isRight: boolean
  getIsTransitioning: () => boolean
}

const useFirefoxHeight = isFireFox()

export const CarouselHeroImage = memo(
  ({
    padding,
    artID,
    id,
    setElement,
    isActive,
    isLeft,
    isRight,
    getIsTransitioning
  }: CarouselHeroImageProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const ref = useRef<HTMLImageElement>(null)
    const navigate = useNavigate()
    const handleImageLoad = useCallback(() => {
      if (!!ref.current) {
        setElement(id, ref.current)
      }
    }, [id, setElement])

    const onClick = useCallback(() => {
      if (!isActive && !getIsTransitioning()) {
        navigate(makeHeroRoute(id))
      }
    }, [getIsTransitioning, id, isActive, navigate])

    return (
      <HeroSkinWrapper
        className={clsx({ isLeft, isRight, isActive })}
        onClick={onClick}
        height={
          // There is a 10 year old bug in Firefox that causes elements to
          // not have their widths recalculated if their child element changes their width
          // based on the parents height (e.g. aa 500px wide image shrinking to 200px after
          // first render because its height: 100%). So we need to set an explicit height for
          // firefox only.
          // See: https://bugzilla.mozilla.org/show_bug.cgi?id=829958
          useFirefoxHeight
            ? [
                `calc(100vh - ${MOBILE_HERO_FEATURE_SELECTOR_HEIGHT}px)`,
                `calc(100vh - ${MOBILE_HERO_FEATURE_SELECTOR_HEIGHT}px)`,
                `calc(100vh - ${NAVBAR_HEIGHT}px - ${HERO_FEATURE_SELECTOR_HEIGHT}px)`,
                `calc(100vh - ${NAVBAR_HEIGHT}px - ${HERO_FEATURE_SELECTOR_HEIGHT}px)`
              ]
            : '100%'
        }
      >
        {!!getAssetUrl && (
          <motion.img
            ref={ref}
            className="hero-skin-image"
            onLoad={handleImageLoad}
            style={{
              padding,
              height: '100%',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            src={getAssetUrl(`webapp/heroes/art/6x/${artID}@6x.webp`)}
            onSelect={(e) => e.preventDefault()}
          />
        )}
        {!isActive && <HeroSkinGradient className="hero-skin-gradient" />}
      </HeroSkinWrapper>
    )
  }
)

const HeroSkinWrapper = styled(Box)`
  position: relative;
  transition: transform 0.35s ease-out;
  cursor: pointer;
  &.isActive {
    cursor: unset;
    img {
      opacity: 1;
    }
  }
  img {
    opacity: 0.5;
    transition: opacity 0.3s ease-in-out;
  }
  &.isLeft {
    @media (hover: hover) and (pointer: fine) {
      :hover {
        transform: translateX(100px);
        .hero-skin-image {
          opacity: 1;
        }
        .hero-skin-gradient {
          opacity: 0;
        }
      }
    }
  }
  &.isRight {
    @media (hover: hover) and (pointer: fine) {
      :hover {
        transform: translateX(-100px);
        .hero-skin-image {
          opacity: 1;
        }
        .hero-skin-gradient {
          opacity: 0;
        }
      }
    }
  }
`

const HeroSkinGradient = styled.div`
  background: linear-gradient(
    359.94deg,
    #0c061e 0.05%,
    rgba(12, 6, 30, 0.8) 20%,
    rgba(12, 6, 30, 0) 36.18%
  );
  width: 80%;
  height: 100%;
  position: absolute;
  transition: 0.7s ease-in-out;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  z-index: 1;
  pointer-events: none;
`

CarouselHeroImage.displayName = 'CarouselHeroImage'
