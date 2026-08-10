import clsx from 'clsx'
import { memo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { selectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CONFIRM_GOLD_CARDS_DIALOG_ID } from '../../shared/constants'
import { CartItemListHeaderStyle } from './ConfirmGoldsList.css'
import { ConfirmGoldsListRow } from './ConfirmGoldsListRow/ConfirmGoldsListRow'

const { closeDialog } = controlDialog(CONFIRM_GOLD_CARDS_DIALOG_ID)

export const BurnSilversList = memo(() => {
  const { selectedCards } = useSnapshot(selectGoldsState)

  const { t } = useTranslation()

  useEffect(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    if (!selectedCards.length) {
      closeDialog()
    }
  }, [selectedCards])

  if (!selectedCards.length) {
    return null
  }

  return (
    <div
      className={Sprinkles({
        width: 'full',
        flex: 1,
        overflow: 'auto',
        backgroundColor: 'purple1'
      })}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            paddingX: {
              base: '8px',
              mobile: '12px',
              tabletWide: '20px'
            },
            display: 'grid',
            alignItems: 'center',
            paddingTop: '8px'
          }),
          CartItemListHeaderStyle
        )}
      >
        <Text fontSize="14px" color="white">
          {t('generic.Item')}
        </Text>
        <Text fontSize="14px" color="white">
          {t('generic.UnitPrice')}
        </Text>
        <Text fontSize="14px" color="white">
          {t('generic.Quantity')}
        </Text>
        <Text fontSize="14px" color="white">
          {t('generic.Subtotal')}
        </Text>
      </div>
      {selectedCards.map((item) => (
        <ConfirmGoldsListRow
          key={item.tokenId}
          id={item.tokenId}
          quantity={item.amount}
        />
      ))}
    </div>
  )
})

BurnSilversList.displayName = 'BurnSilversList'
