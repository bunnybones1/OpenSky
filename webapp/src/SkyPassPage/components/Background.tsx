import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'

import { Box, FlexBox } from '~/shared/components/Base'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { ImgWrapper } from './Background.css'

interface BackgroundProps {
  id: string
}

export const Background = memo(({ id }: BackgroundProps) => {
  const { getAssetUrl } = useGetAssetContext()

  if (!id || !getAssetUrl) return null

  return (
    <FlexBox width="100%" height="100%" position="absolute" flex={1}>
      <Box width="100%" height="100%" overflow="hidden" position="relative">
        <AnimatePresence>
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={id}
            exit={{ opacity: 0 }}
            src={getAssetUrl(`webapp/backgrounds/spbg-${id}-left.webp`)}
            className={clsx('imgWrapper', ImgWrapper)}
            transition={{
              opacity: { duration: 0.2 }
            }}
          />
        </AnimatePresence>
      </Box>
    </FlexBox>
  )
})

Background.displayName = 'Background'
