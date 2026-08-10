import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { isIOSUpdateNeeded } from '~/shared/constants/play'
import { trackTutorialStart } from '~/shared/helpers/analytics-old'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameModeDescription } from '../shared/components/GameModeDescription'
import { IOSAppUpdateDialog } from '../shared/components/IOSAppUpdateDialog'
import { PlayPageBackground } from '../shared/components/PlayPageBackground'
import { PlayPageInner } from '../shared/components/PlayPageInner'
import { IOS_APP_UPDATE_DIALOG_ID } from '../shared/constants'
import { useJoinQueue } from '../shared/hooks/useJoinQueue/useJoinQueue'
import {
  SharedPlayButtonStyle,
  SharedPlayPageStyle
} from '../shared/style/SharedPlayPageStyle.css'

export const Tutorial = memo(() => {
  const { t } = useTranslation()

  const isTabletWide = useResponsiveQuery('tabletWide')

  const { joinQueue } = useJoinQueue()

  const { Dialog, openDialog } = useDialog({
    Element: IOSAppUpdateDialog,
    id: IOS_APP_UPDATE_DIALOG_ID,
    isClickoffDisabled: true,
    isCloseButtonDisabled: true
  })

  const onPlayClick = useCallback(() => {
    trackTutorialStart(1)

    if (!!isIOSUpdateNeeded) {
      openDialog()
      return
    }

    joinQueue({ mode: GameMode.TUTORIAL })
  }, [joinQueue, openDialog])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          height: 'auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }),
        SharedPlayPageStyle
      )}
    >
      {Dialog}
      <PlayPageBackground bgUrl="webapp/backgrounds/tutorial.webp" />
      <PlayPageInner isGameTypeHidden bgUrl="webapp/backgrounds/tutorial.webp">
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: 'column',
            height: 'full',
            width: 'full'
          })}
        >
          <Text
            color="white"
            fontSize={{ base: '40px', tabletWide: '50px' }}
            fontWeight={{ base: '500', tabletWide: '700' }}
            fontFamily="condensed"
          >
            {t('general.TUTORIAL')}
          </Text>
          <GameModeDescription description={t('playPage.TUTORIAL.description')} />
          <div
            className={Sprinkles({
              marginTop: 'auto',
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            })}
          >
            <Button
              colorType="orange"
              frameType="default"
              height={isTabletWide ? '76px' : '52px'}
              className={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
              buttonClassName={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
              onClick={onPlayClick}
              buttonId="playButton"
              text={t('playPage.PlayTutorial')}
              clickSound="PlayStinger"
            />
          </div>
        </div>
      </PlayPageInner>
    </div>
  )
})

Tutorial.displayName = 'Tutorial'
