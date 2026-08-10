import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  QuestNewBadgeInner,
  QuestNewBadgeStyle,
  QuestNewBadgeText
} from './QuestNewBadge.css'

export const QuestNewBadge = memo(() => {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'purple1'
        }),
        QuestNewBadgeStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'warm6'
          }),
          QuestNewBadgeInner
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              fontWeight: '700',
              color: 'purple1'
            }),
            QuestNewBadgeText
          )}
        >
          {t('generic.NEW')}
        </div>
      </div>
    </div>
  )
})

QuestNewBadge.displayName = 'QuestNewBadge'
