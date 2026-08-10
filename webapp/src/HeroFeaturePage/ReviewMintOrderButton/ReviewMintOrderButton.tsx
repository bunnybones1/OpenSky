import styled from '@emotion/styled'
import clsx from 'clsx'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { memo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { MINT_HEROES_DIALOG_ID, NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { derivedHeroFeatureState } from '../shared/state'
import { MintHeroesDialog } from './MintHeroesDialog/MintHeroesDialog'

export const ReviewMintOrderButton = memo(() => {
  const { totalSkinsInOrder } = useSnapshot(derivedHeroFeatureState)
  const animationControls = useAnimationControls()

  const { Dialog, openDialog } = useDialog({
    Element: MintHeroesDialog,
    id: MINT_HEROES_DIALOG_ID
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.has('openDialog')) {
      openDialog()
    }
  }, [openDialog])

  const { t } = useTranslation()

  const onClick = useCallback(() => {
    openDialog()
  }, [openDialog])

  useEffect(() => {
    animationControls
      .start({
        scale: 1.5
      })
      .then(() => {
        animationControls.start({ scale: 1 })
      })
  }, [animationControls, totalSkinsInOrder])

  return (
    <>
      {Dialog}

      <AnimatePresence>
        {!!totalSkinsInOrder && (
          <ReviewMintOrderButtonWrapper
            initial={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            top={[0, 0, 0, NAVBAR_HEIGHT]}
            right="0px"
          >
            <Box
              position="absolute"
              right="0px"
              top="0px"
              pt={[16, 16, 16, 32]}
              pr={[16, 16, 16, 32]}
              zIndex={2}
            >
              <FlexBox
                width="100%"
                height="100%"
                type="centered-row"
                position="relative"
              >
                <ReviewMintOrderBadge
                  animate={animationControls}
                  className={clsx(
                    { isLong: totalSkinsInOrder >= 5 },
                    Sprinkles({ zIndex: 1 })
                  )}
                >
                  <Text
                    color="black"
                    fontSize={16}
                    fontWeight="bold"
                    fontFamily="condensed"
                  >
                    {totalSkinsInOrder}{' '}
                    {totalSkinsInOrder >= 5 ? t('heroFeature.maxInCart') : ''}
                  </Text>
                </ReviewMintOrderBadge>
                <Button
                  frameType="default"
                  colorType="blue"
                  height="52px"
                  text={t('shop.reviewOrder')}
                  onClick={onClick}
                  buttonClassName={Sprinkles({ paddingX: '12px' })}
                />
              </FlexBox>
            </Box>
          </ReviewMintOrderButtonWrapper>
        )}
      </AnimatePresence>
    </>
  )
})

const ReviewMintOrderButtonWrapper = styled(motion(FlexBox))`
  position: absolute;
  right: 0;
  z-index: 2;
  .reviewMintOrderButtonGlow {
    img {
      transform: scaleY(-1);
    }
  }
  .isRight {
    right: 0px;
  }
`

const ReviewMintOrderBadge = styled(motion.div)`
  position: absolute;
  right: -8px;
  top: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.warm7};
  display: flex;
  align-items: center;
  justify-content: center;

  &.isLong {
    width: 64px;
    border-radius: 15px;
  }
`

ReviewMintOrderButton.displayName = 'ReviewMintOrderButton'
