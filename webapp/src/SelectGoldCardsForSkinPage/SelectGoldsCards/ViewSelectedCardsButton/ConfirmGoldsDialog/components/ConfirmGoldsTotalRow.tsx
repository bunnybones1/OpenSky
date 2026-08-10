import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { selectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ConfirmGoldsTotalRowStyle } from './ConfirmGoldsTotalRow.css'

const FONT_SIZE = { base: '14px', tabletWide: '16px' } as const

export const ConfirmGoldsTotalRow = memo(() => {
  const { t } = useTranslation()
  const { selectedCards } = useSnapshot(selectGoldsState)

  const totalCards = useMemo(() => {
    let count = 0

    // eslint-disable-next-line valtio/state-snapshot-rule
    selectedCards.forEach((card) => (count = count + card.amount))

    return count
  }, [selectedCards])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          backgroundColor: 'purple4',
          borderBottom: '1px solid',
          borderTop: '1px solid',
          borderColor: 'purple6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingX: '16px'
        }),
        ConfirmGoldsTotalRowStyle
      )}
    >
      <Text
        fontWeight="400"
        marginRight="8px"
        fontSize={FONT_SIZE}
        color="purple9"
        fontFamily="condensed"
      >
        {t('heroFeature.selectedCardsCount', { count: totalCards })}
      </Text>
    </div>
  )
})

ConfirmGoldsTotalRow.displayName = 'ConfirmGoldsTotalRow'
