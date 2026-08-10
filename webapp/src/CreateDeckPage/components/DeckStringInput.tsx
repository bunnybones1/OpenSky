import { decode } from '@opensky/deck-string-codec'
import { CardLibrary } from '@skyweaver/state-metadata'
import { debounce } from 'lodash-es'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Input } from '~/shared/components/Input/Input'
import { captureError } from '~/shared/helpers/sentry'
import { getDeckClassUnlockStatus } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  createDeckState,
  updateCreateDeckState
} from '../shared/state/create-deck-state'
import { DeckStringInputStyle } from './DeckStringInput.css'

export const DeckStringInput = memo(() => {
  const { t } = useTranslation()
  const { deckStringError, deckString } = useSnapshot(createDeckState)

  const validateDeckstring = useCallback(
    (newDeckString: string) => {
      try {
        if (!newDeckString) {
          return
        }
        const decoded = decode(CardLibrary, newDeckString)

        if (typeof decoded === 'string' || !decoded[2].length) {
          updateCreateDeckState('deckStringError', t('createDeck.invalidString'))
          return
        }

        const deckClassUnlockStatus = getDeckClassUnlockStatus()

        const deckCode = decoded[1]

        const hasUnlockedCode =
          !!deckClassUnlockStatus && !!deckClassUnlockStatus.includes(deckCode)

        updateCreateDeckState('deckClass', deckCode)

        if (!hasUnlockedCode) {
          updateCreateDeckState('deckStringError', t('createDeck.prismsLocked'))
        }
      } catch (err) {
        captureError(err, 'Validating deck string')
        return
      }
    },
    [t]
  )

  const debouncedValidateUserName = useMemo(
    () => debounce(validateDeckstring, 400),
    [validateDeckstring]
  )

  const onChange = useCallback(
    (value) => {
      updateCreateDeckState('deckStringError', undefined)
      updateCreateDeckState('deckString', value)
      debouncedValidateUserName(value)
    },
    [debouncedValidateUserName]
  )

  const onClear = useCallback(() => {
    updateCreateDeckState('deckString', '')
    updateCreateDeckState('deckStringError', undefined)
  }, [])

  return (
    <div className={DeckStringInputStyle}>
      <Input
        value={deckString}
        placeholder={t('createDeck.deckStringPlaceHolder')}
        onChange={onChange}
        onClear={onClear}
        errorMessage={deckStringError}
        inputClassname={Sprinkles({
          width: 'full'
        })}
        formClassName={Sprinkles({
          width: 'full'
        })}
        inputId="deckStringInput"
      />
    </div>
  )
})

DeckStringInput.displayName = 'DeckStringInput'
