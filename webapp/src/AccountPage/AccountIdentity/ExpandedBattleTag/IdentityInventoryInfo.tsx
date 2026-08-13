import styled from '@emotion/styled'
import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Grid } from '~/shared/components/Base/Grid'
import { useCardTotals } from '~/shared/hooks/cards/useCardTotals'
import { useNavigateToItemsCards } from '~/shared/hooks/cards/useNavigateToItemsCards'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useCardBalanceOverview } from '~/shared/queries/cards/useCardBalanceOverview'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { authenticationState } from '~/shared/state/authentication-state'

const CARD_ROWS = [
  {
    itemType: ItemType.SW_BASE_CARDS,
    icon: 'webapp/icons/base-card-with-letter.webp',
    label: 'BASE CARDS'
  },
  {
    itemType: ItemType.SW_SILVER_CARDS,
    icon: 'webapp/icons/silver-card-with-letter.webp',
    label: 'SILVER CARDS'
  },
  {
    itemType: ItemType.SW_GOLD_CARDS,
    icon: 'webapp/icons/gold-card-with-letter.webp',
    label: 'GOLD CARDS'
  }
] as const

export const IdentityInventoryInfo = memo(() => {
  const { data: activeAccount } = useActiveAccount()
  const { userAddress } = useSnapshot(authenticationState)
  const { getAssetUrl } = useGetAssetContext()
  const { navigateToItemsCards } = useNavigateToItemsCards()
  const cardTotals = useCardTotals()
  const { data: balanceOverview } = useCardBalanceOverview({
    address: activeAccount?.address
  })
  const { data: conquestBalances } = useConquestAndUSDCBalances()
  const isOwnAccount = activeAccount?.address === userAddress

  const ticketBalance = useMemo(
    () =>
      isOwnAccount ? conquestBalances?.conquestTicketBalance.total ?? 0 : undefined,
    [conquestBalances?.conquestTicketBalance.total, isOwnAccount]
  )

  return (
    <InventoryPanel data-id="identity-inventory-panel">
      <Grid
        width="100%"
        gridTemplateColumns={isOwnAccount ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'}
      >
        {CARD_ROWS.map(({ icon, itemType, label }) => {
          const total = balanceOverview?.frameBalanceTotalOverview[itemType]
          const unique = balanceOverview?.frameBalanceOverview[itemType].owned
          return (
            <InventoryCell
              key={itemType}
              onClick={() => navigateToItemsCards({ grade: itemType })}
            >
              <InventoryMain>
                {!!getAssetUrl && <img src={getAssetUrl(icon)} />}
                <div>
                  <InventoryValue>
                    {total ?? '?'}
                    {itemType === ItemType.SW_BASE_CARDS && (
                      <InventoryMuted>/{cardTotals.TOTAL}</InventoryMuted>
                    )}
                    {itemType !== ItemType.SW_BASE_CARDS && total !== undefined && (
                      <InventoryMuted> ({unique} uniq)</InventoryMuted>
                    )}
                  </InventoryValue>
                  <InventoryLabel>{label}</InventoryLabel>
                </div>
              </InventoryMain>
              <InventorySource>CLOUD WEASEL INVENTORY</InventorySource>
            </InventoryCell>
          )
        })}
        {isOwnAccount && (
          <InventoryCell>
            <InventoryMain>
              {!!getAssetUrl && (
                <img src={getAssetUrl('webapp/icons/conquest-ticket.webp')} />
              )}
              <div>
                <InventoryValue>{ticketBalance ?? 0}</InventoryValue>
                <InventoryLabel>CONQUEST TICKETS</InventoryLabel>
              </div>
            </InventoryMain>
            <InventorySource>CLOUD WEASEL INVENTORY</InventorySource>
          </InventoryCell>
        )}
      </Grid>
    </InventoryPanel>
  )
})

IdentityInventoryInfo.displayName = 'IdentityInventoryInfo'

const InventoryPanel = styled(FlexBox)`
  width: 100%;
  margin-top: 16px;
  background: ${({ theme }) => theme.colors.purple1};
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
  border-bottom: 1px solid ${({ theme }) => theme.colors.purple6};
`

const InventoryCell = styled(Box)`
  width: 100%;
  cursor: pointer;
  border-right: 1px solid ${({ theme }) => theme.colors.purple6};
  &:last-of-type {
    border-right: 0;
  }
`

const InventoryMain = styled(FlexBox)`
  width: 100%;
  height: 54px;
  align-items: center;
  background: linear-gradient(180deg, #1c1038 57.43%, #000 100%);
  padding: 8px;
  img {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }
`

const InventoryValue = styled(Text)`
  color: white;
  font-size: 16px;
  line-height: 16px;
`

const InventoryMuted = styled.span`
  color: ${({ theme }) => theme.colors.purple8};
  font-size: 12px;
`

const InventoryLabel = styled(Text)`
  color: ${({ theme }) => theme.colors.purple8};
  font-size: 11px;
  line-height: 14px;
`

const InventorySource = styled(FlexBox)`
  width: 100%;
  padding: 8px;
  color: ${({ theme }) => theme.colors.purple8};
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
  font-size: 10px;
`
