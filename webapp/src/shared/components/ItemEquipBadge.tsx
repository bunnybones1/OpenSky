import clsx from 'clsx'
import { memo } from 'react'

import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useImageIsLoaded } from '../hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '../hooks/useGetAssetContext'
import {
  BadgeImage,
  ItemEquipBadgeStyle,
  ItemEquipBadgeTooltip,
  ItemEquipBadgeTooltipWrapper
} from './ItemEquipBadge.css'

interface ItemEquipBadgeProps {
  className?: Parameters<typeof clsx>[0]
}

export const ItemEquipBadge = memo(({ className }: ItemEquipBadgeProps) => {
  const { getAssetUrl } = useGetAssetContext()

  const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          bottom: 0,
          zIndex: 3,
          pointerEvents: 'none'
        }),
        ItemEquipBadgeStyle,
        className
      )}
    >
      {!!getAssetUrl && (
        <img
          src={getAssetUrl('webapp/misc/equip-badge.webp')}
          onLoad={handleLoad}
          ref={imgRef}
          className={clsx(
            Sprinkles({
              width: 'full',
              opacity: isLoaded ? 1 : 0
            }),
            BadgeImage
          )}
        />
      )}
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            zIndex: 1,
            height: 'full',
            top: 0,
            right: 0
          }),
          ItemEquipBadgeTooltipWrapper
        )}
      >
        <Tooltip
          placement="top-start"
          tooltip="Equipped items are randonly chosen at match start"
          className={clsx(
            Sprinkles({
              width: 'full',
              position: 'absolute',
              zIndex: 1,
              pointerEvents: 'all'
            }),
            ItemEquipBadgeTooltip
          )}
        >
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full'
            })}
          />
        </Tooltip>
      </div>
    </div>
  )
})

ItemEquipBadge.displayName = 'ItemEquipBadge'
