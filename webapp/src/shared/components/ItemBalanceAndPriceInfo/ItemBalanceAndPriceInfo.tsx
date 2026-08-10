import clsx from 'clsx'
import { ComponentType, memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { getIconOrImage } from '~/shared/hooks/ui/useIconOrImage'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'

import { Text } from '../Text'
import { BalanceFrame } from './components/BalanceFrame'
import {
  BalancesTextWrapper,
  BalancesWrapper,
  BottomPriceGradient,
  ButtonComponentContainer,
  DividerLine,
  OuterComponent,
  PriceGradientWrapper,
  PriceOrBalanceGrid,
  PricesWrapper,
  TopGradient,
  TopPriceGradient
} from './ItemBalanceAndPriceInfo.css'

export interface BalanceOrPrice {
  amount: number | string
  id: string
  icon?: {
    type: IconTypes | ImageIconTypes
    color?: ThemeColorType
  }
  image?: string
}

export interface ItemBalanceAndPriceInfoProps<T> {
  ButtonComponent?: ComponentType<{ id: T; isSelected?: boolean }>
  isSelected?: boolean
  id: T
  prices?: BalanceOrPrice[]
  balances?: BalanceOrPrice[]
  areBalancesLoading?: boolean
  arePricesLoading?: boolean
  buttonOuterClassname?: string
  className?: string
  name?: string
}

const IconHeight = { base: '14px', tabletWide: '16px' } as const
const PriceFontSize = { base: '14px', tabletWide: '16px' } as const
const BalanceFontSize = { base: '12px', tabletWide: '14px' } as const

const _ItemBalanceAndPriceInfo = <T,>({
  prices,
  balances,
  id,
  className,
  ButtonComponent,
  // Use this to mostly to handle showing and hiding the button.
  buttonOuterClassname,
  // Will render a spinner in the balance section
  areBalancesLoading,
  // Will render a spinner in the price section
  arePricesLoading,
  // Whether or not the item corresponding to this balance is selected
  // e.g it was added to the cart
  // right now this value is only passed to the ButtonComponent, so theres
  // no need to provide it if youre not providing a ButtonComponent, or your ButtonComponent
  // doesnt need a selected state
  isSelected,
  name
}: ItemBalanceAndPriceInfoProps<T>) => {
  const { t } = useTranslation()
  const RenderedPrices = useMemo(() => {
    if (!prices) return null

    return prices.map((price) => (
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
        key={price.id}
      >
        {(price.icon || price.image) && (
          <div
            className={Sprinkles({
              marginRight: '4px',
              display: 'flex'
            })}
          >
            {getIconOrImage(price.icon?.type || price.image, {
              color: price.icon?.color || 'white',
              height: IconHeight
            })}
          </div>
        )}
        <Text fontFamily="condensed" fontSize={PriceFontSize} color="white">
          {price.amount}
        </Text>
      </div>
    ))
  }, [prices])

  const RenderedBalances = useMemo(() => {
    if (!balances) return null

    return balances.map((balance) => (
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
        key={balance.id}
      >
        {(balance.icon || balance.image) && (
          <div className={Sprinkles({ marginRight: '4px', display: 'flex' })}>
            {getIconOrImage(balance.icon?.type || balance.image, {
              color: balance.icon?.color || 'white',
              height: IconHeight
            })}
          </div>
        )}
        <div
          className={Sprinkles({
            marginRight: balances.length === 1 ? '4px' : undefined
          })}
        >
          <Text fontWeight="400" fontSize={BalanceFontSize} color="white">
            {balance.amount}
          </Text>
        </div>
        {balances.length === 1 && (
          <Text fontWeight="400" fontSize={BalanceFontSize} color="purple9">
            {t('generic.Owned')}
          </Text>
        )}
      </div>
    ))
  }, [balances, t])

  const hasNoBalance = useMemo(() => {
    if (!balances) return true

    return !balances.some(
      (balance) => typeof balance.amount === 'number' && balance.amount > 0
    )
  }, [balances])

  const hasNoPrice = useMemo(() => {
    if (!prices) return true

    return !prices.some((price) => {
      if (typeof price.amount === 'number') {
        return price.amount > 0
      }
      if (typeof price.amount === 'string') {
        return (
          price.amount !== '$0' &&
          price.amount !== '0' &&
          price.amount !== t('generic.Unavailable') &&
          price.amount !== t('generic.NotApplicable')
        )
      }
      return true
    })
  }, [prices, t])

  const hasPriceComponent = !!prices || !!arePricesLoading
  const hasBalanceComponent = !!balances || areBalancesLoading

  // Dont return anything in case nothing to display gets passed
  if (!prices && !balances && !areBalancesLoading && !arePricesLoading && !name)
    return null

  return (
    <div
      className={clsx(
        className,
        Sprinkles({
          width: 'full',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          position: 'absolute',
          pointerEvents: 'none'
        }),
        OuterComponent,
        {
          hasPricesAndBalances: hasPriceComponent && hasBalanceComponent,
          hasPricesOnly: !hasBalanceComponent && hasPriceComponent,
          hasBalancesOnly: hasBalanceComponent && !hasPriceComponent,
          hasBalancesAndName: hasBalanceComponent && !hasPriceComponent && !!name,
          hasPricesAndName: !hasBalanceComponent && hasPriceComponent && !!name,
          hasPricesBalancesAndName:
            hasPriceComponent && hasBalanceComponent && !!name,
          hasNameOnly: !hasBalanceComponent && !hasPriceComponent && !!name
        }
      )}
    >
      {(!!prices || !!arePricesLoading) && (
        <>
          <div className={TopGradient} />
          <div className={DividerLine} />
          <div
            className={clsx(
              Sprinkles({ width: 'full', position: 'relative' }),
              PriceGradientWrapper
            )}
          >
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  height: 'full',
                  position: 'absolute',
                  left: 0,
                  top: 0
                }),
                BottomPriceGradient
              )}
            />
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  height: 'full',
                  position: 'absolute',
                  left: 0,
                  top: 0
                }),
                TopPriceGradient
              )}
            />
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  left: 0,
                  top: 0,
                  paddingBottom: '4px',
                  paddingTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'absolute',
                  justifyContent: 'center'
                }),
                PricesWrapper,
                { hasNoPrice }
              )}
            >
              {arePricesLoading && !RenderedPrices ? (
                <Icon type="spinner" color="white" height="16px" />
              ) : (
                <div className={PriceOrBalanceGrid}>{RenderedPrices}</div>
              )}
            </div>
          </div>
        </>
      )}
      {!!name && (
        <div
          className={Sprinkles({
            width: 'full',
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex'
          })}
        >
          <Text
            marginTop="12px"
            marginBottom="12px"
            fontSize="12px"
            color="purple9"
            fontWeight="500"
          >
            {name}
          </Text>
        </div>
      )}
      {(!!balances || areBalancesLoading) && (
        <>
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                width: 'full',
                alignItems: 'flex-end',
                justifyContent: 'center',
                position: 'relative'
              }),
              BalancesWrapper
            )}
          >
            <BalanceFrame />
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  left: 0,
                  top: 0,
                  height: 'full',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute'
                }),
                BalancesTextWrapper,
                { hasNoBalance }
              )}
            >
              {areBalancesLoading && !RenderedBalances ? (
                <Icon type="spinner" color="white" height="16px" />
              ) : (
                <div className={PriceOrBalanceGrid}>{RenderedBalances}</div>
              )}
            </div>
          </div>
        </>
      )}

      {!!ButtonComponent && (
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              left: 0,
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }),
            ButtonComponentContainer,
            buttonOuterClassname,
            {
              hasBalancesOnly: hasNoPrice && !hasNoBalance,
              hasBalancesAndName: hasNoPrice && !hasNoBalance && !!name,
              hasNameOnly: hasNoPrice && hasNoBalance && !!name
            }
          )}
        >
          <ButtonComponent id={id} isSelected={isSelected} />
        </div>
      )}
    </div>
  )
}

export const ItemBalanceAndPriceInfo = memo(
  _ItemBalanceAndPriceInfo
) as typeof _ItemBalanceAndPriceInfo
