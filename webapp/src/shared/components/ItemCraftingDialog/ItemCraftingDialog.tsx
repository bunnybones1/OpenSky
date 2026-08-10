import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { triggerMagicExplosion } from '~/shared/helpers/webgl/trigger-magic-explotion/trigger-magic-explosion'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Button } from '../Button'
import { Card } from '../Card/Card'
import { Hero } from '../Hero/Hero'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text'
import { CardCraftingDialogBalance } from './component/CardCraftingDialogBalance'
import { CardCraftingDialogShine } from './component/CardCraftingDialogShine'
import {
  ControlsWrapper,
  CraftButtonWrapper,
  ImageWrapper,
  ItemCraftingDialogInner,
  ItemCraftingDialogStyle,
  SparkIcon
} from './ItemCraftingDialog.css'
import { ITEM_CRAFTING_DIALOG_ID } from './shared/constants'
import {
  itemCraftingState,
  resetItemCraftingDialog
} from './shared/item-crafting-state'

const DUST_COST = 20
const CRAFT_COST = 50

const { openDialog, closeDialog } = controlDialog(ITEM_CRAFTING_DIALOG_ID)

export const ItemCraftingDialog = memo(() => {
  const { id, itemType } = useSnapshot(itemCraftingState)
  const { getAssetUrl } = useGetAssetContext()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const itemContainerRef = useRef<HTMLDivElement | null>(null)
  const [justCraftedOrDusted, setJustCraftedOrDusted] = useState(false)

  useEffect(() => {
    if (!!id) {
      openDialog()
    } else {
      closeDialog()
    }
  }, [id])

  const onClose = useCallback(() => {
    resetItemCraftingDialog()
  }, [])

  const onDust = useCallback(() => {
    triggerMagicExplosion(itemContainerRef, {
      isFlareEnabled: true,
      flareColor: 'pink',
      height: '130%',
      width: '150%',
      left: '-25%',
      top: '-15%',
      flareOpacity: '1.0'
    })
    setJustCraftedOrDusted(true)
  }, [])

  const onCraft = useCallback(() => {
    triggerMagicExplosion(itemContainerRef, {
      isFlareEnabled: true,
      flareColor: 'cyan',
      height: '130%',
      width: '150%',
      left: '-25%',
      top: '-15%',
      flareOpacity: '1.0'
    })

    setJustCraftedOrDusted(true)
  }, [])

  const onHideShine = useCallback(() => setJustCraftedOrDusted(false), [])

  return (
    <dialog
      id={ITEM_CRAFTING_DIALOG_ID}
      open={false}
      className={ItemCraftingDialogStyle}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            height: 'full',
            position: 'relative'
          }),
          ItemCraftingDialogInner
        )}
      >
        <div
          ref={itemContainerRef}
          className={clsx(Sprinkles({ position: 'relative' }), ImageWrapper)}
        >
          {!id ? null : itemType === ItemType.SW_HERO ? (
            <Hero id={id} />
          ) : (
            <Card id={id} BalanceAndPriceInfo={CardCraftingDialogBalance} />
          )}
          <CardCraftingDialogShine
            isVisible={justCraftedOrDusted}
            onHide={onHideShine}
          />
        </div>

        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'grid',
              marginTop: 'auto',
              position: 'absolute',
              bottom: 0,
              left: 0,
              zIndex: 5
            }),
            ControlsWrapper,
            { isNotDustable: itemType === ItemType.SW_HERO }
          )}
        >
          {itemType !== ItemType.SW_HERO && (
            <div
              className={Sprinkles({
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: 'full'
              })}
            >
              <Button
                className={FullWidthButtonStyle}
                buttonClassName={FullWidthButtonStyle}
                text="Dust"
                height={isTabletWide ? '52px' : '36px'}
                onClick={onDust}
                colorType="red"
                frameType="default"
              />
              <div
                className={Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '4px'
                })}
              >
                {!!getAssetUrl && (
                  <img
                    src={getAssetUrl('webapp/icons/spark-icon.webp')}
                    className={clsx(SparkIcon, Sprinkles({ marginRight: '4px' }))}
                  />
                )}
                <Text
                  color="white"
                  fontWeight="500"
                  fontSize={{ base: '14px', tabletWide: '22px' }}
                >
                  {`+${DUST_COST}`}
                </Text>
              </div>
            </div>
          )}
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: 'full'
              }),
              CraftButtonWrapper
            )}
          >
            <Button
              text="Craft"
              onClick={onCraft}
              height={isTabletWide ? '52px' : '36px'}
              className={FullWidthButtonStyle}
              buttonClassName={FullWidthButtonStyle}
              colorType="blue"
              frameType="default"
            />
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px'
              })}
            >
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/icons/spark-icon.webp')}
                  className={clsx(SparkIcon, Sprinkles({ marginRight: '4px' }))}
                />
              )}
              <Text
                color="white"
                fontWeight="500"
                fontSize={{ base: '14px', tabletWide: '22px' }}
              >
                {`-${CRAFT_COST}`}
              </Text>
            </div>
          </div>
        </div>
      </div>
      <div
        className={Sprinkles({
          position: 'absolute',
          right: 0,
          top: 0,
          zIndex: 3,
          padding: '4px',
          cursor: 'pointer'
        })}
        onClick={onClose}
      >
        <Icon type="close" color="white" height={isTabletWide ? '32px' : '16px'} />
      </div>
    </dialog>
  )
})

ItemCraftingDialog.displayName = 'ItemCraftingDialog'
