import clsx from 'clsx'
import { memo } from 'react'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PlusButton } from './components/PlusButton'
import { WALLET_WIDGET_CLASSNAME } from './shared/constants'
import {
  CurrencyIcon,
  CurrencyOuter,
  Inner,
  WalletWidgetStyle
} from './WalletWidget.css'

const isSecretShopVisible = isSecretShopVisibleForMe()

const FontSize = { base: '10px', tablet: '16px', tabletWide: '18px' } as const
const IconHeight = { base: '16px', tablet: '24px', tabletWide: '32px' } as const

interface WalletWidgetProps {
  isLogoHidden?: boolean
  isPlusButtonHidden?: boolean
  isUSDCHidden?: boolean
  isWeaveHidden?: boolean
  isSparkHidden?: boolean
}

export const WalletWidget = memo(
  ({
    isUSDCHidden,
    isSparkHidden,
    isWeaveHidden,
    isLogoHidden
  }: WalletWidgetProps) => {
    const { getAssetUrl } = useGetAssetContext()

    if (!isSecretShopVisible) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'pointer'
          }),
          WalletWidgetStyle,
          WALLET_WIDGET_CLASSNAME
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              height: 'full',
              width: 'auto'
            }),
            CurrencyOuter
          )}
        >
          {!isLogoHidden && (
            <div
              className={clsx(
                Sprinkles({
                  height: 'full',
                  alignItems: 'center',
                  justifyContent: 'center',
                  display: 'flex',
                  backgroundColor: 'black',
                  paddingX: { base: '4px', tablet: '8px', tabletWide: '12px' }
                }),
                Inner,
                'isLogo'
              )}
            >
              <ImageIcon type="sequence" height={IconHeight} />
            </div>
          )}
          <div
            className={clsx(
              Sprinkles({
                height: 'full',
                alignItems: 'center',
                justifyContent: 'flex-start',
                display: 'flex',
                backgroundColor: 'purple3'
              }),
              Inner
            )}
          >
            {!isUSDCHidden && (
              <div
                className={Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingX: { base: '8px', tablet: '12px', tabletWide: '16px' }
                })}
              >
                <div className={clsx(CurrencyIcon, Sprinkles({ display: 'flex' }))}>
                  {!!getAssetUrl && (
                    <img
                      src={getAssetUrl('webapp/icons/usdc.webp')}
                      className={Sprinkles({ width: 'full', height: 'full' })}
                    />
                  )}
                </div>
                <Text
                  marginLeft="4px"
                  color="white"
                  fontWeight="700"
                  fontSize={FontSize}
                >
                  999.99
                </Text>
              </div>
            )}
            {!isWeaveHidden && (
              <div
                className={Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingX: '8px'
                })}
              >
                <div className={clsx(CurrencyIcon, Sprinkles({ display: 'flex' }))}>
                  {!!getAssetUrl && (
                    <img
                      src={getAssetUrl('webapp/icons/arcadeum-coin.webp')}
                      className={Sprinkles({ width: 'full', height: 'full' })}
                    />
                  )}
                </div>
                <Text
                  marginLeft="4px"
                  color="white"
                  fontWeight="700"
                  fontSize={FontSize}
                >
                  999.99
                </Text>
              </div>
            )}
            {!isSparkHidden && (
              <div
                className={Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingX: '8px'
                })}
              >
                <div className={clsx(CurrencyIcon, Sprinkles({ display: 'flex' }))}>
                  {!!getAssetUrl && (
                    <img
                      src={getAssetUrl('webapp/icons/spark-icon.webp')}
                      className={Sprinkles({ width: 'full', height: 'full' })}
                    />
                  )}
                </div>
                <Text
                  marginLeft="4px"
                  color="white"
                  fontWeight="700"
                  fontSize={FontSize}
                >
                  999.99
                </Text>
              </div>
            )}
          </div>
        </div>
        <PlusButton />
      </div>
    )
  }
)

WalletWidget.displayName = 'WalletWidget'
