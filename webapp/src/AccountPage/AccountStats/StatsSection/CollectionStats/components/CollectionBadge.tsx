import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/__deprecated__/Text'
import { DeckClass } from '~/lib/proto'
import { SoundClient } from '~/shared/clients'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { PRISM_ICON_TYPES } from '~/shared/constants/cards'
import { useCardTotals } from '~/shared/hooks/cards/useCardTotals'
import { useNavigateToItemsCards } from '~/shared/hooks/cards/useNavigateToItemsCards'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useCardBalanceOverview } from '~/shared/queries/cards/useCardBalanceOverview'
import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { authenticationState } from '~/shared/state/authentication-state'
import { FilterablePrism, OwnershipFilter } from '~/shared/types/cards'

interface Props {
  prismCode: DeckClass
}

const AccountCollectionBadge = memo(({ prismCode }: Props) => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()

  const { data: activeAccount } = useActiveAccount()
  const { userAddress } = useSnapshot(authenticationState)
  const { data: unlockedDeckClasses } = useUnlockedDeckClasses()
  const cardTotals = useCardTotals()

  const isExternalProfile =
    !!userAddress && !!activeAccount && activeAccount.address !== userAddress

  const { navigateToItemsCards } = useNavigateToItemsCards()

  const handleClick = () => {
    if (!isExternalProfile) {
      navigateToItemsCards({
        ownership: OwnershipFilter.OWNED,
        prism: [prismCode.toLowerCase() as FilterablePrism]
      })
    }
  }

  const { data: balanceOverview } = useCardBalanceOverview({
    address: activeAccount?.address
  })

  if (!balanceOverview?.prismBalanceOverview) return null

  const isLocked = !unlockedDeckClasses || !unlockedDeckClasses.includes(prismCode)
  const count = balanceOverview.prismBalanceOverview[prismCode].owned
  const total = cardTotals[prismCode]
  const isComplete = count >= total
  const percentComplete = isComplete ? 101 : isLocked ? 0 : (count / total) * 100

  return (
    <StyledCollectionBadge
      type="centered-column"
      onClick={handleClick}
      className={clsx({
        isDisabled: isLocked || isExternalProfile
      })}
      onMouseEnter={() => {
        if (!isLocked) SoundClient.playSound('CursorMainHover')
      }}
      onMouseDown={() => {
        if (!isLocked) SoundClient.playSound('CursorMainClick')
      }}
    >
      <Box
        width={90}
        height={90}
        position="relative"
        borderRadius="50%"
        bg="flatBlack"
      >
        <Box
          width={86}
          height={86}
          position="absolute"
          top="2px"
          left="2px"
          zIndex={1}
        >
          <BadgeChart viewBox="0 0 32 32">
            <BadgeChartPie r="16" cx="16" cy="16" percentComplete={percentComplete} />
            <circle
              className="badgeCircle"
              r="15"
              cx="16"
              cy="16"
              fill={isComplete ? '#1e103e' : '#000'}
            />
          </BadgeChart>
        </Box>
        <Box
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -50%)"
          zIndex={2}
        >
          <Icon
            type={PRISM_ICON_TYPES[prismCode]}
            height="48px"
            color={isComplete ? 'purple9' : 'purple7'}
          />
        </Box>
        {isLocked && (
          <Box
            position="absolute"
            zIndex={3}
            bottom={-20}
            width="130%"
            left="50%"
            transform="translateX(-50%)"
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/misc/card-lock.webp')}
                style={{ width: '100%' }}
              />
            )}
          </Box>
        )}
      </Box>
      <FlexBox type="centered-column" pt={10}>
        <Text fontSize={2} color="purple9" fontFamily="condensed">
          {t(
            `deckBuilder.prismFilter.${
              prismCode as 'HRT' | 'STR' | 'WIS' | 'AGY' | 'INT' | 'UNKNOWN_CLASS'
            }`
          )}
        </Text>
        <Text fontSize={12} color="purple7" fontFamily="condensed">
          {isLocked ? t('createDeck.lockedPrism') : `${count}/${total}`}
        </Text>
      </FlexBox>
    </StyledCollectionBadge>
  )
})

const BadgeChart = styled.svg`
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  border-radius: 50%;
  background: ${(props) => props.theme.colors.purple3};
`

const BadgeChartPie = styled.circle<{ percentComplete: number }>`
  fill: ${(props) => props.theme.colors.purple3};
  stroke: ${(props) => props.theme.colors.cold7};
  stroke-width: 32;
  stroke-dasharray: ${(props) => props.percentComplete} 100;
`

const StyledCollectionBadge = styled(FlexBox)`
  cursor: pointer;
  &.isDisabled {
    pointer-events: none;
    cursor: default;
  }
  &:hover:not(.isDisabled) {
    svg .badgeCircle {
      fill: ${(props) => props.theme.colors.purple5};
    }
    .horizon-icon {
      fill: ${(props) => props.theme.colors.purple9};
    }
  }
`

export default AccountCollectionBadge

AccountCollectionBadge.displayName = 'AccountCollectionBadge'
