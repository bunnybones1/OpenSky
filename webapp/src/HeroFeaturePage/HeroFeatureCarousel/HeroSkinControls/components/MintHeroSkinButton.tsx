import styled from '@emotion/styled'
import { isIOSNativeApp } from '@opensky/shared/check-mobile-app-type'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { AngledBox } from '~/__deprecated__/AngledBox'
import { HeroSkinWithTokenId } from '~/HeroFeaturePage/shared/constants'
import {
  addSkinToMint,
  derivedHeroFeatureState,
  removeSkinToMint
} from '~/HeroFeaturePage/shared/state'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useHeroSkinMintCost } from '~/shared/queries/hero-skins/useHeroSkinMintCost'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface MintHeroSkinButton {
  heroSkin: HeroSkinWithTokenId
  width: number
  padAmount?: number
}

export const MintHeroSkinButton = memo(
  ({ heroSkin, width, padAmount }: MintHeroSkinButton) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()
    const { skinIdsInOrder } = useSnapshot(derivedHeroFeatureState)

    const { data: cost } = useHeroSkinMintCost(heroSkin.id, 1)

    const isSelected = useMemo(() => {
      // eslint-disable-next-line valtio/state-snapshot-rule
      return skinIdsInOrder.includes(heroSkin.id)
    }, [skinIdsInOrder, heroSkin.id])

    const toggleSkin = useCallback(() => {
      if (isSelected) {
        removeSkinToMint(heroSkin.id)
      } else {
        addSkinToMint(heroSkin.id)
      }
    }, [heroSkin.id, isSelected])

    return (
      <MintHeroSkinWrapper
        type="centered-end-column"
        width={width}
        ml={padAmount}
        minHeight="10px"
      >
        {heroSkin.grade === 'gold' && !isIOSNativeApp() && (
          <>
            <FlexBox type="centered-row" mb="8px">
              <Box height={24} width={24}>
                {!!getAssetUrl && (
                  <img
                    src={getAssetUrl('webapp/icons/usdc.webp')}
                    style={{
                      height: '100%',
                      width: '100%'
                    }}
                  />
                )}
              </Box>
              {!!cost ? (
                <Text
                  color="white"
                  fontSize={22}
                  fontWeight="medium"
                  fontFamily="mono"
                  ml="6px"
                >
                  {String(formatUSDCBalance(cost))}
                </Text>
              ) : (
                <FlexBox ml="6px" height="27.5px" type="centered-row">
                  <Icon type="spinner" height="16px" color="white" />
                </FlexBox>
              )}
            </FlexBox>

            <FlexBox
              height={[36, 36, 36, 52]}
              width={[121, 121, 121, '100%']}
              position="relative"
            >
              <Button
                disabled
                frameType="default"
                colorType={isSelected ? 'default' : 'secondary'}
                text={t('generic.Unavailable')}
                onClick={toggleSkin}
                height="52px"
                className={Sprinkles({ width: 'full' })}
              />
              <FlexBox
                width={17}
                height={17}
                position="absolute"
                zIndex={2}
                style={{ pointerEvents: 'none' }}
                top="-4px"
                left="-4px"
              >
                <AngledBox cornerSize={2}>
                  <FlexBox
                    width="100%"
                    height="100%"
                    bg="purple1"
                    type="centered-row"
                  >
                    {isSelected && <Icon height="10px" color="white" type="check" />}
                  </FlexBox>
                </AngledBox>
              </FlexBox>
            </FlexBox>
            <FlexBox
              height={26}
              pr="7px"
              pl="4px"
              borderRadius="4px"
              type="centered-row"
              mt={['4px', '4px', '4px', '8px']}
            >
              <FlexBox width="16px">
                {!!getAssetUrl && (
                  <img
                    style={{
                      width: '100%'
                    }}
                    src={getAssetUrl('webapp/icons/gold-card-with-letter.webp')}
                  />
                )}
              </FlexBox>
              <Text
                fontSize="14px"
                fontWeight="regular"
                fontFamily="condensed"
                color="purple8"
                ml="2px"
              >
                {t('shop.payWithGoldCardsAllowed')}
              </Text>
            </FlexBox>
          </>
        )}
      </MintHeroSkinWrapper>
    )
  }
)

const MintHeroSkinWrapper = styled(FlexBox)`
  pointer-events: all;
`

MintHeroSkinButton.displayName = 'MintHeroSkinButton'
