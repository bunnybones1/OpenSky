import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CONFIRM_GOLD_CARDS_DIALOG_ID } from '../shared/constants'
import { ConfirmGoldsControlsRow } from './components/ConfirmGoldsControlsRow'
import { ConfirmGoldsTotalRow } from './components/ConfirmGoldsTotalRow'
import {
  BackButton,
  ConfirmGoldsDialogStyle,
  Wrapper
} from './ConfirmGoldsDialog.css'
import { BurnSilversList } from './ConfirmGoldsList/ConfirmGoldsList'

const { closeDialog } = controlDialog(CONFIRM_GOLD_CARDS_DIALOG_ID)

export const ConfirmGoldsDialog = memo(() => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { t } = useTranslation()

  const onBackClick = useCallback(() => {
    closeDialog()
  }, [])

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          flexWrap: 'nowrap'
        }),
        ConfirmGoldsDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative',
            borderBottom: '1px solid',
            borderColor: 'purple6',
            backgroundColor: 'purple2'
          }),
          Wrapper
        )}
      >
        <TitleDetail title={t('heroFeature.confirmGoldCards')} rightDisabled={true} />
        {!isTabletWide && (
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                top: 0,
                height: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }),
              BackButton
            )}
          >
            <Button
              onClick={onBackClick}
              frameType="default"
              colorType="default"
              leftAdornment={{ icon: 'arrow-back' }}
              text={t('general.Back')}
              clickSound="BackReturnSwipe"
              hoverSound={null}
            />
          </div>
        )}
      </div>
      <BurnSilversList />
      <ConfirmGoldsTotalRow />
      <ConfirmGoldsControlsRow />
    </div>
  )
})

ConfirmGoldsDialog.displayName = 'ConfirmGoldsDialog'
