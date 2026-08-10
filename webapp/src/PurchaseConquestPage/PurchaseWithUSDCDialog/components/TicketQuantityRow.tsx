import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '~/__deprecated__/Input/Input'
import { Text } from '~/__deprecated__/Text'
import { Asset } from '~/shared/components/Asset'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'

interface Props {
  numTickets: number
  changeNumTickets: (tickets: number) => void
  unitPrice: string
  totalPrice: string
  hardCodedQuantity?: number
  showUSDC?: boolean
  showHeader?: boolean
  customCurrency?: string
  customTitle?: string
  isLoading?: boolean
}

const TicketQuantityRow = memo(
  ({
    numTickets,
    changeNumTickets,
    hardCodedQuantity,
    unitPrice,
    totalPrice,
    showUSDC = true,
    showHeader = true,
    customCurrency,
    customTitle,
    isLoading = false
  }: Props) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()

    const { data: balances } = useConquestAndUSDCBalances(true)

    const maxTicketPurchase = 99

    const changeQuantity = (newQuantity: number) => {
      if (newQuantity < numTickets) {
        changeNumTickets(newQuantity < 0 ? 0 : newQuantity)
      } else {
        if (newQuantity > maxTicketPurchase) {
          changeNumTickets(maxTicketPurchase)
        } else {
          changeNumTickets(newQuantity)
        }
      }
    }

    return (
      <FlexBox width="100%">
        {showHeader && (
          <FlexBox
            height={[36, 36, 48]}
            type="centered-start-row"
            width="100%"
            flexWrap="nowrap"
          >
            <FlexBox
              style={{
                paddingLeft: '24px',
                width: '45%',
                height: '100%'
              }}
            >
              {/* LABEL */}
            </FlexBox>
            <FlexBox
              style={{
                width: '15%'
              }}
              type="centered-start-row"
            >
              <Text color="white" fontSize={2}>
                {t('generic.UnitPrice')}
              </Text>
            </FlexBox>
            <FlexBox
              style={{
                width: '25%'
              }}
              type="centered-start-row"
            >
              <Text color="white" fontSize={2}>
                {t('generic.Quantity')}
              </Text>
            </FlexBox>
            <FlexBox
              style={{
                width: '15%'
              }}
              type="centered-end-row"
            >
              <Text color="white" fontSize={2} paddingRight={24}>
                {t('generic.Subtotal')}
              </Text>
            </FlexBox>
          </FlexBox>
        )}

        <FlexBox
          height={52}
          width="100%"
          type="centered-start-row"
          borderTop="1px solid"
          borderBottom="1px solid"
          borderColor="purple2"
          flexWrap="nowrap"
        >
          <FlexBox
            style={{
              width: '45%'
            }}
            type="centered-start-row"
          >
            {!!getAssetUrl && (
              <img
                style={{
                  marginLeft: '24px',
                  height: '32px',
                  width: '32px'
                }}
                src={getAssetUrl('webapp/icons/conquest-ticket.webp')}
              />
            )}
            <Text color="purple9" fontSize={2} pl={2}>
              {customTitle ? (
                <>{customTitle}</>
              ) : (
                <>{t('skypass.titles.SW_CONQUEST_TICKET')}</>
              )}
            </Text>
          </FlexBox>
          <FlexBox
            style={{
              width: '15%'
            }}
            type="centered-start-row"
          >
            {showUSDC && (
              <Asset url="webapp/icons/usdc.webp" style={{ width: 16, height: 16 }} />
            )}

            {isLoading && (
              <Icon height="16px" marginLeft="8px" color="white" type="spinner" />
            )}
            {!isLoading && (
              <Text fontSize={16} color="white" paddingLeft={2}>
                {unitPrice}
              </Text>
            )}
          </FlexBox>
          <FlexBox
            style={{
              width: '25%'
            }}
          >
            <FlexBox
              width="100%"
              type="centered-start-row"
              height="100%"
              flexWrap="nowrap"
            >
              <FlexBox width={[36, 40]} height={36} type="centered-row">
                <Input
                  value={hardCodedQuantity ?? numTickets}
                  onChange={(e) => changeQuantity(Number(e.target.value))}
                  readOnly={!!hardCodedQuantity as boolean}
                  rounded={true}
                  type="number"
                  padding={'0px 0px'}
                  data-id="ticketQuantity"
                />
              </FlexBox>

              <FlexBox type="centered-row" height="100%" pl={[3, 3, 4]}>
                <Button
                  frameType="rightCorner"
                  colorType="default"
                  height="28px"
                  leftAdornment={{ icon: 'caret-down' }}
                  disabled={numTickets === 0}
                  onClick={() => changeQuantity(numTickets - 1)}
                />
                <Box height="100%" width="2px" />
                <Button
                  frameType="rightTopCorner"
                  colorType="default"
                  height="28px"
                  leftAdornment={{ icon: 'caret-up' }}
                  disabled={!balances || (numTickets + 1) * 1 > balances.USDCBalance}
                  onClick={() => changeQuantity(numTickets + 1)}
                />
              </FlexBox>
            </FlexBox>
          </FlexBox>
          <FlexBox
            style={{
              width: '15%'
            }}
            type="centered-end-row"
          >
            {showUSDC && (
              <Asset url="webapp/icons/usdc.webp" style={{ width: 16, height: 16 }} />
            )}
            {isLoading && (
              <Icon
                height="16px"
                marginLeft="16px"
                marginRight="32px"
                color="white"
                type="spinner"
              />
            )}
            {!isLoading && (
              <Text fontSize={16} color="white" paddingLeft={2} paddingRight={24}>
                {customCurrency && <>{customCurrency + ' '}</>}
                {numTickets !== 0 ? totalPrice : 0}
              </Text>
            )}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    )
  }
)

export default TicketQuantityRow

TicketQuantityRow.displayName = 'TicketQuantityRow'
