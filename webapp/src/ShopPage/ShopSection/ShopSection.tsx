import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SHOP_SECTION_CLASSNAME } from '../shared/constants'
import { useShopSection } from '../shared/queries/useShopSections'
import { ShopBox } from './ShopBox/ShopBox'
import {
  Description,
  Grid,
  ItemsWrapper,
  SectionContainer,
  SectionInner,
  ShopSectionImage,
  ShopSectionThankYou,
  Subtitle,
  TextSection,
  Title
} from './ShopSection.css'

interface ShopSectionProps {
  id?: string
}

export const ShopSection = memo(({ id }: ShopSectionProps) => {
  const { data: section } = useShopSection(id)
  const { getAssetUrl } = useGetAssetContext()
  const isSingleItem = !!section && section.items.length === 1

  const sectionImage = useMemo(() => {
    if (!getAssetUrl || !section?.itemType) return undefined

    switch (section.itemType) {
      case ItemType.SW_BASE_CARDS: {
        return getAssetUrl('webapp/backgrounds/shop-cards.webp')
      }
      case ItemType.SW_SILVER_CARDS: {
        return getAssetUrl('webapp/backgrounds/shop-deck.webp')
      }
      case ItemType.SW_GOLD_CARDS: {
        return getAssetUrl('webapp/backgrounds/shop-packs.webp')
      }
      case ItemType.USDC: {
        return getAssetUrl('webapp/backgrounds/shop-weave.webp')
      }
      case ItemType.SW_CARD_BACKS: {
        return getAssetUrl('webapp/backgrounds/shop-special.webp')
      }
      default: {
        return getAssetUrl('webapp/backgrounds/shop-special.webp')
      }
    }
  }, [getAssetUrl, section?.itemType])

  if (!section && !!id) return null

  return (
    <section
      id={id}
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }),
        SectionContainer,
        SHOP_SECTION_CLASSNAME
      )}
      style={{
        backgroundImage:
          !!getAssetUrl && !!section
            ? `url(${getAssetUrl('webapp/backgrounds/shop-section-bg.webp')})`
            : undefined
      }}
    >
      {!!sectionImage && (
        <img
          className={clsx(
            Sprinkles({ position: 'absolute', pointerEvents: 'none', top: 0 }),
            ShopSectionImage
          )}
          src={sectionImage}
        />
      )}
      <div
        className={clsx(
          Sprinkles({
            height: 'full'
          }),
          SectionInner
        )}
      >
        {!!section ? (
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                height: 'full',
                display: 'grid'
              }),
              Grid
            )}
          >
            <div
              className={clsx(
                Sprinkles({
                  height: 'full',
                  width: 'full',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  flexDirection: 'column'
                }),
                TextSection
              )}
            >
              <div
                className={clsx(
                  Subtitle,
                  Sprinkles({
                    color: 'cold8',
                    fontWeight: '600',
                    fontFamily: 'condensed',
                    textAlign: 'left'
                  })
                )}
              >
                SPECIAL OFFER
              </div>
              <div
                className={clsx(
                  Title,
                  Sprinkles({
                    color: 'white',
                    fontWeight: '600',
                    fontFamily: 'condensed',
                    textAlign: 'left'
                  })
                )}
              >
                STARTER BUNDLE
              </div>
              <div className={clsx(Sprinkles({ color: 'white' }), Description)}>
                Lorem ipsum dolor sit amet consectetur. Consectetur scelerisque
              </div>
            </div>
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  height: 'full',
                  display: 'grid',
                  alignItems: 'center',
                  justifyContent: 'center'
                }),
                { isSingleItem },
                ItemsWrapper
              )}
            >
              {section.items.map(
                ({
                  id,
                  saleAmount,
                  valueAmount,
                  price,
                  expiration,
                  originalPrice,
                  priceItemType,
                  isSoldOut,
                  isClaimable,
                  isClaimed
                }) => (
                  <ShopBox
                    key={id}
                    saleAmount={saleAmount}
                    valueAmount={valueAmount}
                    price={price}
                    expiration={expiration}
                    originalPrice={originalPrice}
                    priceItemType={priceItemType}
                    isSoldOut={isSoldOut}
                    isClaimable={isClaimable}
                    isClaimed={isClaimed}
                    aspectRatio={isSingleItem ? 'HORIZONTAL' : 'VERTICAL'}
                  />
                )
              )}
            </div>
          </div>
        ) : (
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })}
          >
            <div
              className={clsx(
                ShopSectionThankYou,
                Sprinkles({
                  color: 'white',
                  fontFamily: 'normal',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                })
              )}
            >
              THANK YOU FOR SHOPPING
            </div>
          </div>
        )}
      </div>
    </section>
  )
})

ShopSection.displayName = 'ShopSection'
