import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { AllStickers } from '~/shared/constants/stickers'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useEquipItem } from '~/shared/mutations/useEquipItem'
import { useUnequipItem } from '~/shared/mutations/useUnequipItem'
import { useEquippedItem } from '~/shared/queries/useEquippedItems'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { EquipButtonStyle, EquipControlsBadge } from './EquipControls.css'

interface EquipControlsProps {
  id: number
}

const EquippedIcon = { icon: 'equipped' } as const
const SpinnerIcon = { icon: 'spinner' } as const
const EquipIcon = { icon: 'equip' } as const
const FontSize = { base: '26px', tabletWide: '40px' } as const
const DescFontSize = { base: '10px', tabletWide: '16px' } as const

export const EquipControls = memo(({ id }: EquipControlsProps) => {
  const { t } = useTranslation()
  const { data: balance } = useTokenBalance(ItemType.SW_STICKERS, id)
  const sticker = useMemo(() => AllStickers.get(id), [id])
  const isTabletWide = useResponsiveQuery('tabletWide')

  const { data: equippedItem } = useEquippedItem(id, ItemType.SW_STICKERS)

  const unequipItem = useUnequipItem()
  const equipItem = useEquipItem()

  const onClick = useCallback(() => {
    if (!!equippedItem) {
      unequipItem.mutate({ tokenID: id, itemType: ItemType.SW_STICKERS })
    } else {
      equipItem.mutate({ tokenID: id, itemType: ItemType.SW_STICKERS })
    }
  }, [equipItem, equippedItem, id, unequipItem])

  if (!sticker) return null

  return (
    <div
      className={Sprinkles({
        position: 'absolute',
        left: 0,
        bottom: 0,
        zIndex: 2,
        paddingLeft: '48px',
        paddingBottom: '32px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        flexDirection: 'column'
      })}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          marginBottom: '8px'
        })}
      >
        <Icon
          marginRight="8px"
          type="stickers"
          color="purple9"
          height={DescFontSize}
        />
        <Text color="purple8" fontSize={DescFontSize}>
          {t('skypass.sticker')}
        </Text>
        {!!equippedItem && (
          <div
            className={clsx(
              Sprinkles({
                paddingX: '8px',
                paddingY: '4px',
                backgroundColor: 'cold9',
                marginLeft: '8px'
              }),
              EquipControlsBadge
            )}
          >
            <Text color="white" fontSize="12px">
              {t('generic.EQUIPPED')}
            </Text>
          </div>
        )}
      </div>
      <Text
        fontSize={FontSize}
        color="white"
        fontFamily="condensed"
        marginBottom="24px"
      >
        {sticker.name.toUpperCase()}
      </Text>
      {!!balance && (
        <Button
          colorType={!!equippedItem ? 'red' : 'blue'}
          frameType="default"
          text={!!equippedItem ? t('generic.Unequip') : t('generic.Equip')}
          onClick={onClick}
          height={isTabletWide ? '52px' : '36px'}
          leftAdornment={
            unequipItem.isLoading || equipItem.isLoading || equippedItem === undefined
              ? SpinnerIcon
              : !!equippedItem
              ? EquippedIcon
              : EquipIcon
          }
          disabled={
            unequipItem.isLoading || equipItem.isLoading || equippedItem === undefined
          }
          buttonClassName={EquipButtonStyle}
        />
      )}
    </div>
  )
})

EquipControls.displayName = 'EquipControls'
