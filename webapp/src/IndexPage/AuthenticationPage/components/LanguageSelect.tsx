import {
  enabledLanguages,
  LANG_NAMES,
  multiLangIsRolledOut,
  supportedLanguages
} from '@opensky/language-manager'
import { isDevMode } from '@opensky/shared/devMode'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { LanguageSelectStyle } from './LanguageSelect.css'

const Adornment = {
  icon: {
    type: 'leaderboard'
  }
} as const

export const LanguageSelect = memo(() => {
  const { i18n } = useTranslation()

  const langs = useMemo(() => {
    const arr = isDevMode() ? supportedLanguages : enabledLanguages

    const enabled = enabledLanguages as readonly string[]
    return [...arr].sort(
      (a, b) => Number(enabled.includes(b)) - Number(enabled.includes(a))
    )
  }, [])

  const onChange = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang)
    },
    [i18n]
  )

  if (!(multiLangIsRolledOut || isDevMode())) {
    return null
  }

  return (
    <div className={clsx(Sprinkles({ marginTop: '20px' }), LanguageSelectStyle)}>
      <Select
        text={
          LANG_NAMES[i18n.language] +
          ((enabledLanguages as readonly string[]).includes(i18n.language)
            ? ''
            : ' DEV')
        }
        adornment={Adornment}
        onChange={onChange}
        colorType="default"
        value={i18n.language}
        isFullWidth
        optionsMatchParentWidth
      >
        {langs.map((l) => (
          <SelectOption
            key={l}
            text={
              LANG_NAMES[l] +
              ((enabledLanguages as readonly string[]).includes(l) ? '' : ' DEV')
            }
            value={l}
            adornment={Adornment}
          />
        ))}
      </Select>
    </div>
  )
})

LanguageSelect.displayName = 'LanguageSelect'
