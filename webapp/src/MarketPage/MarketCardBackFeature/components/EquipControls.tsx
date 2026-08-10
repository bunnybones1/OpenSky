import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { AllCardBacks } from '~/shared/constants/card-backs'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface EquipControlsProps {
  id: number
}

const DescFontSize = { base: '10px', tabletWide: '16px' } as const

export const EquipControls = memo(({ id }: EquipControlsProps) => {
  const { t } = useTranslation()
  const cardBack = useMemo(() => AllCardBacks.get(id), [id])

  if (!cardBack) return null

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
          type="card-back"
          color="purple9"
          height={DescFontSize}
        />
        <Text color="purple8" fontSize={DescFontSize}>
          {t('skypass.titles.SW_CARD_BACKS')}
        </Text>
      </div>
      <Text fontSize="40px" color="white" fontFamily="condensed" marginBottom="24px">
        {cardBack.name.toUpperCase()}
      </Text>
    </div>
  )
})

EquipControls.displayName = 'EquipControls'
