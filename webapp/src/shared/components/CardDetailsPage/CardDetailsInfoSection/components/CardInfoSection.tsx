import { BASE_CODE_LABELS } from '@opensky/shared/constants'
import clsx from 'clsx'
import { capitalize } from 'lodash-es'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { Text } from '~/shared/components/Text'
import { Cards, PRISM_ICON_TYPES } from '~/shared/constants/cards'
import { useCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardInfoSectionRow, CardInfoSectionStyle } from './CardInfoSection.css'

interface CardInfoSectionProps {
  id: number
}

export const CardInfoSection = memo(({ id }: CardInfoSectionProps) => {
  const card = useMemo(() => Cards.get(id), [id])
  const { t } = useTranslation()

  const cardTexts = useCardTexts(card?.baseId)

  if (!card || !cardTexts) return null

  const isEnchant = card.type === 'enchant'
  const isToken = card.prism === 'tok' && !isEnchant

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          border: '1px solid',
          borderColor: 'purple5',
          display: 'grid'
        }),
        CardInfoSectionStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({ display: 'grid', alignItems: 'center', paddingLeft: '12px' }),
          CardInfoSectionRow
        )}
      >
        <Text color="white" fontSize="14px">
          {t('general.name')}
        </Text>
        <Text color="purple9" fontSize="14px">
          {cardTexts.name}
        </Text>
      </div>
      <div
        className={clsx(
          Sprinkles({ display: 'grid', alignItems: 'center', paddingLeft: '12px' }),
          CardInfoSectionRow
        )}
      >
        <Text color="white" fontSize="14px">
          {t('generic.Prism')}
        </Text>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
        >
          <>
            <Text color="purple9" fontSize="14px">
              {isEnchant || isToken
                ? t('generic.NotApplicable')
                : capitalize(BASE_CODE_LABELS[card.prism.toUpperCase()] || '')}
            </Text>
            {!isEnchant && !isToken && (
              <Icon
                type={PRISM_ICON_TYPES[card.prism.toUpperCase()]}
                height="14px"
                color="purple9"
                marginLeft="8px"
              />
            )}
          </>
        </div>
      </div>
      <div
        className={clsx(
          Sprinkles({ display: 'grid', alignItems: 'center', paddingLeft: '12px' }),
          CardInfoSectionRow
        )}
      >
        <Text color="white" fontSize="14px">
          {t('general.element')}
        </Text>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
        >
          <>
            <Text color="purple9" fontSize="14px">
              {capitalize(card.element)}
            </Text>
            <ImageIcon
              type={`element-${card.element}` as ImageIconTypes}
              height="14px"
              marginLeft="8px"
            />
          </>
        </div>
      </div>
      <div
        className={clsx(
          Sprinkles({ display: 'grid', alignItems: 'center', paddingLeft: '12px' }),
          CardInfoSectionRow
        )}
      >
        <Text color="white" fontSize="14px">
          {t('generic.Cost')}
        </Text>
        <Text color="purple9" fontSize="14px">
          {card.cost === 'X'
            ? t('generic.Variable')
            : card.cost === 'no'
            ? t('generic.NotApplicable')
            : card.cost}
        </Text>
      </div>
      <div
        className={clsx(
          Sprinkles({ display: 'grid', alignItems: 'center', paddingLeft: '12px' }),
          CardInfoSectionRow
        )}
      >
        <Text color="white" fontSize="14px">
          {t('generic.Type')}
        </Text>
        <Text color="purple9" fontSize="14px">
          {isToken ? t('generic.Token') : card.type}
        </Text>
      </div>
      {card.type === 'unit' && (
        <>
          <div
            className={clsx(
              Sprinkles({
                display: 'grid',
                alignItems: 'center',
                paddingLeft: '12px'
              }),
              CardInfoSectionRow
            )}
          >
            <Text color="white" fontSize="14px">
              {t('cards.Power')}
            </Text>
            <Text color="purple9" fontSize="14px">
              {card.power || 0}
            </Text>
          </div>
          <div
            className={clsx(
              Sprinkles({
                display: 'grid',
                alignItems: 'center',
                paddingLeft: '12px'
              }),
              CardInfoSectionRow
            )}
          >
            <Text color="white" fontSize="14px">
              {t('cards.Health')}
            </Text>
            <Text color="purple9" fontSize="14px">
              {card.health || 0}
            </Text>
          </div>
        </>
      )}
    </div>
  )
})

CardInfoSection.displayName = 'CardInfoSection'
