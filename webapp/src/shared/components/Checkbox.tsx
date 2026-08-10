import clsx from 'clsx'
import { memo, MouseEvent, useCallback, useMemo } from 'react'

import { SpriteKeys } from '~/clients/SoundClient/types'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { useIconOrImage, UseIconOrImageProps } from '~/shared/hooks/ui/useIconOrImage'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SoundClient } from '../clients'
import { ThemeColorType } from '../style/Theme'
import { CheckboxStyle, CheckboxWrapperStyle, RoundedCheckmark } from './Checkbox.css'
import { ImageIconTypes } from './ImageIcon/ImageIconConfig'
import { Text } from './Text'

export interface CheckboxProps<T> {
  value: T
  text: string
  onChange?: (value: T) => void
  isActive?: boolean
  isDisabled?: boolean
  clickSound?: SpriteKeys | null
  hoverSound?: SpriteKeys | null
  adornment?: {
    icon?: {
      type: ImageIconTypes | IconTypes
      color?: ThemeColorType
    }
    image?: string
  }
  isRounded?: boolean
  isBlue?: boolean
}

const _Checkbox = <T,>({
  value,
  onChange,
  text,
  isActive,
  isDisabled,
  isRounded,
  clickSound = 'CursorMainClick',
  hoverSound = 'CursorMainHover',
  isBlue,
  adornment
}: CheckboxProps<T>) => {
  const onClick = useCallback(() => {
    if (isActive) {
      SoundClient.playSound('CursorUnselectClick')
    } else if (!!clickSound) {
      SoundClient.playSound(clickSound)
    }
    if (onChange) onChange(value)
  }, [isActive, clickSound, onChange, value])

  const onContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault()
  }, [])

  const adornmentOpts = useMemo<UseIconOrImageProps>(
    () => ({
      marginRight: '4px',
      height: '16px',
      color: adornment?.icon?.color || 'white'
    }),
    [adornment?.icon?.color]
  )

  const ButtonIcon = useIconOrImage(
    adornment?.icon?.type || adornment?.image,
    adornmentOpts
  )

  return (
    <div
      onClick={!!isDisabled ? undefined : onClick}
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }),
        CheckboxWrapperStyle,
        { isDisabled }
      )}
      onContextMenu={onContextMenu}
      onMouseEnter={() => {
        if (!isActive && !!hoverSound) SoundClient.playSound(hoverSound)
      }}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }),
          CheckboxStyle,
          { isActive, isDisabled, isRounded, isBlue }
        )}
      >
        {!!isActive &&
          (isRounded ? (
            <div className={clsx(RoundedCheckmark, { isDisabled })} />
          ) : (
            <Icon
              type="check"
              color={isDisabled ? 'purple6' : 'white'}
              height="12px"
            />
          ))}
      </div>
      {ButtonIcon}
      <Text fontSize="14px" color={isDisabled ? 'purple6' : 'white'} fontWeight="400">
        {text}
      </Text>
    </div>
  )
}

export const Checkbox = memo(_Checkbox)

Checkbox.displayName = 'Checkbox'
