import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BURN_SILVERS_DIALOG_ID } from '../shared/constants'
import { BurnSilversControlsRow } from './BurnSilversControlsRow/BurnSilversControlsRow'
import { BackButton, BurnSilversDialogStyle, Wrapper } from './BurnSilversDialog.css'
import { BurnSilversList } from './BurnSilversList/BurnSilversList'
import { BurnSilversTotalRow } from './components/BurnSilversTotalRow'

const { closeDialog } = controlDialog(BURN_SILVERS_DIALOG_ID)

export const BurnSilversDialog = memo(() => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { t } = useTranslation()

  const onClose = useCallback(() => closeDialog(), [])

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
        BurnSilversDialogStyle
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
        <TitleDetail title={t('play.chooseSilverCard')} rightDisabled={true} />
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
              onClick={onClose}
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
      <BurnSilversTotalRow />
      <BurnSilversControlsRow />
    </div>
  )
})

BurnSilversDialog.displayName = 'BurnSilversDialog'
