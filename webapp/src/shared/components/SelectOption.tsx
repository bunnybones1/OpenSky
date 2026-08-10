import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { SpriteKeys } from '~/clients/SoundClient/types'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { SmallUnreadBadge } from '~/shared/components/SmallUnreadBadge'
import { useIconOrImage, UseIconOrImageProps } from '~/shared/hooks/ui/useIconOrImage'
import { IconSize } from '~/shared/style/IconSprinkles.css'
import { ButtonColorTypes } from '~/shared/style/SharedButtonStyles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'

import { SoundClient } from '../clients'
import { SelectOptionColorVariants, SelectOptionStyle } from './SelectOption.css'
import { Text } from './Text'

const FontSize = { mobile: '14px', tablet: '14px', desktop: '16px' } as const

export interface SelectOptionProps<T> {
  isActive?: boolean
  value: T
  onChange?: (value: T) => void
  text: string
  adornmentHeight?: IconSize
  adornment?: {
    icon?: { type: IconTypes | ImageIconTypes; color?: ThemeColorType }
    image?: string
  }
  colorType?: ButtonColorTypes
  unread?: number
  hoverSound?: SpriteKeys | null
  clickSound?: SpriteKeys | null
}

const _SelectOption = <T,>({
  isActive,
  text,
  onChange,
  value,
  colorType,
  adornment,
  adornmentHeight,
  unread,
  hoverSound = 'CursorMainHover',
  clickSound = 'CursorMainClick'
}: SelectOptionProps<T>) => {
  const adornmentOpts = useMemo<UseIconOrImageProps>(
    () => ({
      height: adornmentHeight || '16px',
      color: adornment?.icon?.color || 'white',
      paddingRight: '8px'
    }),
    [adornment?.icon?.color, adornmentHeight]
  )

  const Adornment = useIconOrImage(
    adornment?.icon?.type || adornment?.image,
    adornmentOpts
  )

  return (
    <div
      onClick={() => {
        if (onChange) onChange(value)
      }}
      className={clsx(
        SelectOptionStyle,
        SelectOptionColorVariants[colorType || 'default'],
        {
          isActive
        }
      )}
      onMouseEnter={() => {
        if (!!hoverSound) SoundClient.playSound(hoverSound)
      }}
      onMouseDown={() => {
        if (!!clickSound) SoundClient.playSound(clickSound)
      }}
    >
      {Adornment}
      <Text fontSize={FontSize} fontFamily="condensed" fontWeight="400" color="white">
        {text}
      </Text>
      <div className={Sprinkles({ opacity: !!isActive ? 1 : 0, marginLeft: 'auto' })}>
        <Icon paddingLeft="8px" type="check" height="16px" color="white" />
      </div>
      {!!unread && <SmallUnreadBadge unread={unread} />}
    </div>
  )
}

export const SelectOption = memo(_SelectOption)

SelectOption.displayName = 'SelectOption'
