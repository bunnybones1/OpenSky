import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useUpdatedAuthedAccount } from '~/shared/mutations/useUpdateAuthedAccount'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { TitleSettingsListTitles } from './components/TitleSettingsListTitles'
import { SkyTagTitleSelectorStyle } from './shared/SkyTagTitleSelectorStyle.css'
import { TagSettingsListStyle } from './TitleSettingsList.css'

interface TitleSettingsListProps {
  returnToDefaultPage: () => void
}

export const TitleSettingsList = memo(
  ({ returnToDefaultPage }: TitleSettingsListProps) => {
    const { t } = useTranslation()
    const { data: authedAccount } = useAuthedAccount()

    const updateAuthedAccount = useUpdatedAuthedAccount()

    const onNoTitleSelect = useCallback(() => {
      updateAuthedAccount.mutate({
        titleID: undefined
      })
      returnToDefaultPage()
    }, [returnToDefaultPage, updateAuthedAccount])

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            width: 'full',
            height: 'full',
            overflow: 'auto',
            paddingX: '16px'
          }),
          TagSettingsListStyle
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              backgroundColor: 'purple4',
              border: '1px solid',
              borderColor: 'purple7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }),
            SkyTagTitleSelectorStyle,
            { isSelected: !authedAccount?.titleID }
          )}
          onClick={onNoTitleSelect}
        >
          <Text color="white" fontSize="14px" fontFamily="condensed">
            {t('account.CurrentRank')}
          </Text>
        </div>
        <TitleSettingsListTitles returnToDefaultPage={returnToDefaultPage} />
      </div>
    )
  }
)

TitleSettingsList.displayName = 'TitleSettingsList'
