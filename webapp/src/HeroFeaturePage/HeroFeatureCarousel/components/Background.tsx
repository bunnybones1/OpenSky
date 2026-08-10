import styled from '@emotion/styled'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useMemo } from 'react'

import { getHeroDataArray } from '~/HeroFeaturePage/shared/helpers'
import { Box } from '~/shared/components/Base'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface BackgroundProps {
  id: number
}

export const Background = memo(({ id }: BackgroundProps) => {
  const { getAssetUrl } = useGetAssetContext()

  const bgId = useMemo(() => {
    const heroData = getHeroDataArray(id)

    const heroSkin = heroData.find((skin) => skin.id === id)

    if (heroSkin?.grade === 'base') return 'bg-skyblank'

    return heroSkin?.bgID
  }, [id])

  if (!bgId) return null

  return (
    <BackgroundWrapper
      width="100%"
      height="100%"
      overflow="hidden"
      position="relative"
    >
      <AnimatePresence>
        {!!getAssetUrl && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={bgId}
            exit={{ opacity: 0 }}
            src={getAssetUrl(`webapp/backgrounds/${bgId}-wide.webp`)}
            transition={{
              opacity: { duration: 0.2 }
            }}
          />
        )}
      </AnimatePresence>
      <HeroSkinGradient />
    </BackgroundWrapper>
  )
})

const HeroSkinGradient = styled.div`
  background: linear-gradient(
    359.94deg,
    #0c061e 0.05%,
    rgba(12, 6, 30, 0.8) 23.4%,
    rgba(12, 6, 30, 0) 36.18%
  );
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
`

const BackgroundWrapper = styled(Box)`
  img {
    position: absolute;
    object-fit: cover;
    width: 100%;
    height: 100%;
    left: 50%;
    top: 0px;
    transform: translateX(-50%);
  }
`

Background.displayName = 'Background'
