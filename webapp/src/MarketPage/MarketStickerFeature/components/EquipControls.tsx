import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { AllStickers } from '~/shared/constants/stickers'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface EquipControlsProps {
  id: number
}

export const EquipControls = memo(({ id }: EquipControlsProps) => {
  const { t } = useTranslation()
  const sticker = useMemo(() => AllStickers.get(id), [id])

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
        <Icon marginRight="8px" type="stickers" color="purple9" height="16px" />
        <Text color="purple8" fontSize="16px">
          {t('skypass.sticker')}
        </Text>
      </div>
      <Text fontSize="40px" color="white" fontFamily="condensed" marginBottom="24px">
        {sticker.name.toUpperCase()}
      </Text>
    </div>
  )
})

EquipControls.displayName = 'EquipControls'
