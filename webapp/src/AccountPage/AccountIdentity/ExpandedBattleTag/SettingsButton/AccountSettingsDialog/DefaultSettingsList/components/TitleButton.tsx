import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { SkyTagTitle } from '~/shared/components/SkyTagTitle'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  TitleButtonButtonWrapper,
  TitleButtonSkyTag,
  TitleButtonStyle
} from './TitleButton.css'

interface TitleButtonProps {
  handleList: () => void
}

export const TitleButton = memo(({ handleList }: TitleButtonProps) => {
  const { t } = useTranslation()

  const { data: authedAccount } = useAuthedAccount()

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          border: '1px solid',
          borderColor: 'purple11',
          backgroundColor: 'purple3',
          position: 'relative'
        }),
        TitleButtonStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'full'
          }),
          TitleButtonSkyTag
        )}
      >
        {!!authedAccount?.titleID && (
          <SkyTagTitle id={authedAccount.titleID} fontSize="10px" />
        )}
      </div>
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute'
          }),
          TitleButtonButtonWrapper
        )}
      >
        <Button
          frameType="default"
          colorType="default"
          onClick={handleList}
          buttonClassName={FullWidthButtonStyle}
          className={FullWidthButtonStyle}
          buttonId="title-settings"
          text={t('account.ChangeTitle')}
        />
      </div>
    </div>
  )
})

TitleButton.displayName = 'TitleButton'
