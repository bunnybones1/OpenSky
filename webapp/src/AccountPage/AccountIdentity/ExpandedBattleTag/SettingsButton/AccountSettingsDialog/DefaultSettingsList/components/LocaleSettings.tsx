import {
  enabledLanguages,
  SupportedLanguage,
  supportedLanguages
} from '@opensky/language-manager'
import { isDevMode } from '@opensky/shared/devMode'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'
import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useUpdatedAuthedAccount } from '~/shared/mutations/useUpdateAuthedAccount'

export const LocaleSettings = memo(() => {
  const { t } = useTranslation()

  const { data: account } = useAuthedAccount()

  const updateAuthedAccount = useUpdatedAuthedAccount()

  const onChange = useCallback(
    (locale: SupportedLanguage) => {
      updateAuthedAccount.mutate({
        locale
      })
    },
    [updateAuthedAccount]
  )

  const currentLang = (account?.locale || 'en') as SupportedLanguage

  const langs = useMemo(() => {
    const arr = isDevMode() ? supportedLanguages : enabledLanguages

    const enabled = enabledLanguages as readonly string[]
    return [...arr].sort(
      (a, b) => Number(enabled.includes(b)) - Number(enabled.includes(a))
    )
  }, [])
  return (
    <FlexBox width="100%" type="centered-column" pt={48}>
      <Text mr="12px" fontSize={18} color="purple9" fontWeight="bold">
        {t('general.LOCALE')}
      </Text>
      <FlexBox type="centered-row" width="100%" padding={8}>
        <Select
          text={LANG_NAMES[currentLang]}
          title={t('generic.selectLanguage')}
          adornment={{
            icon: {
              type: 'leaderboard'
            }
          }}
          onChange={onChange}
          colorType="default"
          value={currentLang}
          optionsMatchParentWidth
        >
          {langs.map((l) => (
            <SelectOption
              key={l}
              text={
                ((enabledLanguages as readonly string[]).includes(l)
                  ? ''
                  : '[DEV] ') + LANG_NAMES[l]
              }
              value={l}
              adornment={{
                icon: {
                  type: 'leaderboard'
                }
              }}
            />
          ))}
        </Select>
      </FlexBox>
    </FlexBox>
  )
})

const LANG_NAMES: { [K in SupportedLanguage]: string } = {
  en: 'English',
  fr: 'Français',
  pig: 'Igpay Atinlay',
  'es-ES': 'Español (Castellano)',
  'pt-BR': 'Português (Brasileiro)',
  zh: '中文'
}

LocaleSettings.displayName = 'LocaleSettings'
