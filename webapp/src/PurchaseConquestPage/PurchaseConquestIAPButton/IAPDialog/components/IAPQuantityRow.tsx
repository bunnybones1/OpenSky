import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import Select from '~/__deprecated__/Select/Select'
import { Text } from '~/__deprecated__/Text'
import { FlexBox, Grid } from '~/shared/components/Base'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface Props {
  showHeader?: boolean
  customCurrency?: string
  customTitle?: string
  products: { value: string; label: string; selected: boolean }[] | null
  setProducts: any
  selectedProduct?: any
}

const IAPQuantityRow = memo(
  ({
    showHeader = true,
    customCurrency,
    customTitle,
    products,
    setProducts,
    selectedProduct
  }: Props) => {
    const { t } = useTranslation()

    const { getAssetUrl } = useGetAssetContext()

    const handleSelectChange = (selected: any) => {
      if (products) {
        setProducts(
          products.map((product) => {
            if (product.value === selected) {
              return { ...product, selected: true }
            } else {
              return { ...product, selected: false }
            }
          })
        )
      }
    }

    const unitPrice = selectedProduct
      ? (parseFloat(selectedProduct.price) / selectedProduct.quantity).toFixed(2)
      : t('generic.NotApplicable')

    return (
      <FlexBox width="100%">
        {showHeader && (
          <Grid
            height={[36, 36, 48]}
            width="100%"
            gridTemplateColumns={['4fr 1fr 2fr 1fr']}
          >
            <FlexBox type="centered-start-row" style={{ paddingLeft: '16px' }}>
              <Text color="white" fontSize={2}>
                {t('generic.IAPType')}
              </Text>
            </FlexBox>
            <FlexBox type="centered-start-row">
              <Text color="white" fontSize={2}>
                {t('generic.UnitPrice')}
              </Text>
            </FlexBox>

            <FlexBox type="centered-start-row">
              <Text color="white" fontSize={2}>
                {t('generic.Quantity')}
              </Text>
            </FlexBox>

            <FlexBox type="centered-end-row">
              <Text color="white" fontSize={2} paddingRight={24}>
                {t('generic.Subtotal')}
              </Text>
            </FlexBox>
          </Grid>
        )}
        <Grid
          height={52}
          gridTemplateColumns={['4fr 1fr 2fr 1fr']}
          width="100%"
          borderTop="1px solid"
          borderBottom="1px solid"
          borderColor="purple2"
        >
          <FlexBox
            style={{
              paddingLeft: '8px'
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
          <FlexBox type="centered-start-row">
            <Text fontSize={16} color="white" paddingLeft={2}>
              {customCurrency && <>{customCurrency + ' '}</>}
              {selectedProduct && unitPrice}
            </Text>
          </FlexBox>
          <FlexBox type="centered-start-row">
            <Select
              options={products as any}
              onChange={handleSelectChange}
              placeholder=""
              clearable={false}
              maxListHeight={220}
              className="quickfilter__select"
            />
          </FlexBox>

          <FlexBox type="centered-end-row">
            <Text fontSize={16} color="white" paddingLeft={2} paddingRight={24}>
              {selectedProduct && selectedProduct.localizedPrice}
            </Text>
          </FlexBox>
        </Grid>
      </FlexBox>
    )
  }
)

export default IAPQuantityRow

IAPQuantityRow.displayName = 'IAPQuantityRow'
