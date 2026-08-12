import styled from '@emotion/styled'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import env from '~/env'
import {
  derivedHeroFeatureState,
  heroFeatureState,
  removeSkinToMint,
  updateHeroSkinQuantity
} from '~/HeroFeaturePage/shared/state'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { HeroSkinRow } from '~/shared/components/HeroSkinRow'
import { Icon } from '~/shared/components/Icon/Icon'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useHeroSkinMintCost } from '~/shared/queries/hero-skins/useHeroSkinMintCost'

interface HeroToMintRowProps {
  id: number
  isFirst: boolean
}

export const HeroToMintRow = memo(({ id, isFirst }: HeroToMintRowProps) => {
  const { totalSkinsInOrder } = useSnapshot(derivedHeroFeatureState)
  const { skinsToMint } = useSnapshot(heroFeatureState)

  const skinToMint = skinsToMint[id]

  const { data: subtotal } = useHeroSkinMintCost(id, skinToMint || 1)

  const heroSkinData = useMemo(() => {
    return HeroSkinLibrary.get(id)
  }, [id])

  const removeHero = useCallback(() => {
    removeSkinToMint(id)
  }, [id])

  const increaseQuantity = useCallback(() => {
    if (heroFeatureState.skinsToMint[id]) {
      updateHeroSkinQuantity(id, heroFeatureState.skinsToMint[id] + 1)
    }
  }, [id])

  const decreaseQuantity = useCallback(() => {
    if (heroFeatureState.skinsToMint[id]) {
      updateHeroSkinQuantity(id, heroFeatureState.skinsToMint[id] - 1)
    }
  }, [id])

  if (!heroSkinData || !skinToMint) return null

  return (
    <StyledHeroToMintRow
      width="100%"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="nowrap"
      px={[8, 8, 8, 16]}
      height={60}
      className={clsx({ isFirst }, 'hero-to-mint-row')}
    >
      <FlexBox type="centered-start-row" width="48%">
        <FlexBox
          type="centered-start-row"
          height="100%"
          flex={1}
          maxWidth={[250, 250, 300]}
        >
          <HeroSkinRow name={heroSkinData.name} artID={heroSkinData.artID} />
        </FlexBox>
        <FlexBox onClick={removeHero} ml="10px">
          <Icon type="trash" color="purple9" height="16px" />
        </FlexBox>
      </FlexBox>
      <FlexBox type="centered-start-row" width="13.25%">
        {env.AUTH_MODE === 'google' ? (
          <Text color="white" fontWeight="medium" fontSize={[14, 14, 16]}>
            10 Gold
          </Text>
        ) : !!subtotal ? (
          <Text color="white" fontWeight="medium" fontSize={[14, 14, 16]}>
            {`$${formatUSDCBalance(Math.floor(Number(subtotal) / skinToMint))}`}
          </Text>
        ) : (
          <Icon type="spinner" color="white" height="16px" />
        )}
      </FlexBox>
      <FlexBox type="centered-start-row" width="22.75%">
        <FlexBox
          width="100%"
          type="centered-start-row"
          height="100%"
          flexWrap="nowrap"
        >
          <Text pl={2} fontSize={[14, 14, 16]} color="white">
            {skinToMint}
          </Text>
          <FlexBox type="centered-row" height="100%" pl={[3, 3, 4]}>
            <Button
              frameType="rightCorner"
              colorType="default"
              height="28px"
              leftAdornment={{ icon: 'caret-down' }}
              disabled={skinToMint === 1}
              onClick={decreaseQuantity}
            />
            <Box height="100%" width="2px" />
            <Button
              frameType="rightTopCorner"
              colorType="default"
              height="28px"
              leftAdornment={{ icon: 'caret-up' }}
              disabled={totalSkinsInOrder === 5}
              onClick={increaseQuantity}
            />
          </FlexBox>
        </FlexBox>
      </FlexBox>
      <FlexBox type="centered-end-row" width="9%">
        {env.AUTH_MODE === 'google' ? (
          <Text color="purple9" fontWeight="medium" fontSize={[14, 14, 16]}>
            {skinToMint * 10} Gold
          </Text>
        ) : !!subtotal ? (
          <Text color="purple9" fontWeight="medium" fontSize={[14, 14, 16]}>
            {`$${formatUSDCBalance(subtotal)}`}
          </Text>
        ) : (
          <Icon type="spinner" color="white" height="16px" />
        )}
      </FlexBox>
    </StyledHeroToMintRow>
  )
})

const StyledHeroToMintRow = styled(FlexBox)`
  border-top: 1px solid;
  border-bottom: 1px solid;
  border-color: ${({ theme }) => theme.colors.purple4};
  &.isFirst {
    border-top-color: ${({ theme }) => theme.colors.purple1};
  }
  :last-of-type {
    border-bottom-color: ${({ theme }) => theme.colors.purple1};
  }
`

HeroToMintRow.displayName = 'HeroToMintRow'
