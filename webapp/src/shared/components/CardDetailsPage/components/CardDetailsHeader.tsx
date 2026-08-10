import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { go } from 'redux-first-history'

import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardDetailsHeaderStyle } from './CardDetailsHeader.css'

interface CardDetailsHeaderProps {
  name: string
  grade: ItemType
}

const BackButtonIcon = { icon: 'arrow-back' } as const

export const CardDetailsHeader = memo(({ name, grade }: CardDetailsHeaderProps) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const goBack = useCallback(() => {
    dispatch(go(-1))
  }, [dispatch])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'sticky',
          top: 0,
          borderBottom: '1px solid',
          borderColor: 'purple7',
          backgroundColor: 'purple2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingX: '16px',
          zIndex: 2
        }),
        CardDetailsHeaderStyle
      )}
    >
      <Button
        onClick={goBack}
        text={t('general.Back')}
        frameType="default"
        colorType="default"
        leftAdornment={BackButtonIcon}
        clickSound="BackReturnSwipe"
        hoverSound={null}
      />
      <Text
        color="white"
        fontSize="34px"
        fontWeight="500"
        fontFamily="condensed"
        marginLeft="16px"
      >
        {name.toUpperCase()}
      </Text>
      <Text
        color={
          grade === ItemType.SW_SILVER_CARDS
            ? 'gray8'
            : grade === ItemType.SW_GOLD_CARDS
            ? 'warm5'
            : 'purple9'
        }
        fontSize="34px"
        fontFamily="condensed"
        marginLeft="8px"
        data-card-details-grade={grade}
      >
        {t(
          `cards.grades.${
            grade === ItemType.SW_SILVER_CARDS
              ? 'Silver'
              : grade === ItemType.SW_GOLD_CARDS
              ? 'Gold'
              : 'Base'
          }`
        ).toUpperCase()}
      </Text>
    </div>
  )
})

CardDetailsHeader.displayName = 'CardDetailsHeader'
