import styled from '@emotion/styled'
import { ComponentType, memo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'

export interface TableHeader {
  size: number
  text: string
  secondaryText?: string
  flexType?: string
}

interface CartModalProps {
  Header: ComponentType
  ItemList: ComponentType
  ControlsRow: ComponentType
  tableHeaders: TableHeader[]
  SummaryRow?: ComponentType
}

export const CartModal = memo(
  ({ Header, tableHeaders, ItemList, SummaryRow, ControlsRow }: CartModalProps) => {
    const { t } = useTranslation()

    return (
      <FlexBox
        width="100%"
        height="100%"
        type="centered-start-column"
        bg="purple1"
        position="relative"
        flexWrap="nowrap"
        border="1px solid"
        borderColor="purple8"
      >
        <FlexBox
          width="100%"
          height={[52, 52, 80, 80]}
          position="relative"
          borderBottom="1px solid"
          borderColor="purple7"
          bg="purple2"
        >
          <Header />
        </FlexBox>
        <FlexBox
          width="100%"
          flex={1}
          type="start-column"
          overflow="auto"
          bg="purple1"
          flexWrap="nowrap"
          position="relative"
        >
          <FlexBox
            width="100%"
            alignItems="flex-end"
            justifyContent="space-between"
            flexWrap="nowrap"
            py="8px"
            px={[8, 8, 8, 16]}
            position="sticky"
            top={0}
            bg="purple1"
            zIndex={10}
          >
            {tableHeaders.map(({ size, text, flexType, secondaryText }) => (
              <FlexBox
                width={`${size}%`}
                key={text}
                style={{
                  width: `${size}%`,
                  justifyContent: flexType ?? 'flex-start'
                }}
              >
                <Text color="white" fontSize={14} fontWeight="regular">
                  {text}
                </Text>
                {secondaryText && (
                  <Text color="purple8" fontSize={14} fontWeight="regular" ml={'4px'}>
                    {secondaryText}
                  </Text>
                )}
              </FlexBox>
            ))}
          </FlexBox>
          <ItemList />
          <StyledWarningRow
            width="100%"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="nowrap"
            px={[8, 8, 8, 16]}
            height={60}
          >
            <FlexBox
              type="centered-start-row"
              height="100%"
              flex={1}
              maxWidth={[250, 250, 300]}
            >
              <Icon type="alert-stroke" color="purple9" height="16px" />
              <Text color="pink6" fontSize={14} fontWeight="regular" ml={'4px'}>
                {t('heroFeature.maxSkinsInCart')}
              </Text>
            </FlexBox>
          </StyledWarningRow>
        </FlexBox>
        {!!SummaryRow && (
          <FlexBox
            height={64}
            width="100%"
            bg="purple4"
            px={16}
            borderTop="1px solid"
            borderColor="purple7"
            alignItems="center"
            justifyContent="space-between"
          >
            <SummaryRow />
          </FlexBox>
        )}
        <FlexBox
          height={[60, 60, 80]}
          width="100%"
          bg="purple1"
          alignItems="center"
          justifyContent="space-between"
          borderTop="1px solid"
          borderColor="purple7"
          overflow="hidden"
          position="relative"
          zIndex={1}
          pl={16}
          pr={12}
        >
          <ControlsRow />
        </FlexBox>
      </FlexBox>
    )
  }
)

const StyledWarningRow = styled(FlexBox)`
  border: 1px solid ${({ theme }) => theme.colors.purple4};
`

CartModal.displayName = 'CartModal'
