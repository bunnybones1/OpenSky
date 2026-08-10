import clsx from 'clsx'
import { memo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { selectSilversState } from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BURN_SILVERS_DIALOG_ID } from '../../shared/constants'
import { BurnSilverListRow } from './BurnSilverListRow/BurnSilverListRow'
import { CartItemListHeaderStyle } from './BurnSilversList.css'

const { closeDialog } = controlDialog(BURN_SILVERS_DIALOG_ID)

export const BurnSilversList = memo(() => {
  const { selectedCards } = useSnapshot(selectSilversState)

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
        <BurnSilverListRow key={item.id} id={item.id} quantity={item.quantity} />
      ))}
    </div>
  )
})

BurnSilversList.displayName = 'BurnSilversList'
