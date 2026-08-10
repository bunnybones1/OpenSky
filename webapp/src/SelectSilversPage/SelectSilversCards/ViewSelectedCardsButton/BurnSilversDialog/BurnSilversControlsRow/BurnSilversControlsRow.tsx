import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import {
  selectSilversState,
  updateSelectSilversState
} from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  CartControlsRowStyle,
  RightAdornmentStyle
} from './BurnSilversControlsRow.css'
import { ConfirmConvertSilverCardsDialog } from './components/ConfirmConvertSilverCardsDialog'
import { CONFIRM_CONVERT_SILVER_CARDS_DIALOG } from './shared/constants'

const RightAdornmentComponent = memo(() => {
  const { getAssetUrl } = useGetAssetContext()

  if (!getAssetUrl) return null

  return (
    <img
      className={clsx(Sprinkles({ marginLeft: '4px' }), RightAdornmentStyle)}
      src={getAssetUrl('webapp/icons/conquest-ticket.webp')}
    />
  )
})

RightAdornmentComponent.displayName = 'RightAdornmentComponent'

const RightAdornment = { component: RightAdornmentComponent } as const

export const BurnSilversControlsRow = memo(() => {
  const { t } = useTranslation()
  const { selectedCards } = useSnapshot(selectSilversState)

  const {
    Dialog: _ConfirmConvertSilverCardsDialog,
    openDialog: openConfirmConvertDialog
  } = useDialog({
    Element: ConfirmConvertSilverCardsDialog,
    id: CONFIRM_CONVERT_SILVER_CARDS_DIALOG,
    isCloseButtonDisabled: true,
    isClickoffDisabled: true
  })

  const onClear = useCallback(() => {
    updateSelectSilversState('selectedCards', [])
  }, [])

  const totalCards = useMemo(() => {
    let count = 0

    // eslint-disable-next-line valtio/state-snapshot-rule
    selectedCards.forEach((card) => (count = count + card.quantity))

    return count
  }, [selectedCards])

  const onSubmit = useCallback(() => {
    openConfirmConvertDialog()
  }, [openConfirmConvertDialog])

  return (
    <>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingX: '16px',
            backgroundColor: 'purple1'
          }),
          CartControlsRowStyle
        )}
      >
        <div
          className={Sprinkles({
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
          onClick={onClear}
        >
          <Icon type="trash" color="purple9" height="16px" marginRight="4px" />
          <Text fontSize="16px" color="purple9">
            {t('generic.Clear')}
          </Text>
        </div>
        <Button
          colorType="blue"
          onClick={onSubmit}
          disabled={!selectedCards.length}
          frameType="default"
          text={t('play.convertTo', { count: totalCards })}
          rightAdornment={RightAdornment}
        />
      </div>
      {_ConfirmConvertSilverCardsDialog}
    </>
  )
})

BurnSilversControlsRow.displayName = 'BurnSilversControlsRow'
