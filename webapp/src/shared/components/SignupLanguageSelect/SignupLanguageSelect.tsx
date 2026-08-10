import {
  enabledLanguages,
  LANG_NAMES,
  multiLangIsRolledOut,
  supportedLanguages
} from '@opensky/language-manager'
import { isDevMode } from '@opensky/shared/devMode'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '../Select'
import { SelectOption } from '../SelectOption'

export function SignupLanguageSelect() {
  const { i18n } = useTranslation()

  const langs = useMemo(() => {
    const arr = isDevMode() ? supportedLanguages : enabledLanguages

    const enabled = enabledLanguages as readonly string[]
    return [...arr].sort(
      (a, b) => Number(enabled.includes(b)) - Number(enabled.includes(a))
    )
  }, [])
  if (!(multiLangIsRolledOut || isDevMode())) {
    return null
  }
  return (
    <Select
      text={
        LANG_NAMES[i18n.language] +
        ((enabledLanguages as readonly string[]).includes(i18n.language)
          ? ''
          : ' DEV')
      }
      adornment={{
        icon: {
          type: 'leaderboard'
        }
      }}
      onChange={(l) => i18n.changeLanguage(l)}
      colorType="default"
      value={i18n.language}
      isFullWidth
    >
      {langs.map((l) => (
        <SelectOption
          key={l}
          text={
            LANG_NAMES[l] +
            ((enabledLanguages as readonly string[]).includes(l) ? '' : ' DEV')
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
  )
}
