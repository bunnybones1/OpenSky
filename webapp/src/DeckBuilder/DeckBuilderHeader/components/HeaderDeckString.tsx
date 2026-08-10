import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { deckBuilderDeckStringSelector } from '~/DeckBuilder/shared/selectors'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { HeaderDeckStringStyle } from './HeaderDeckString.css'

export const HeaderDeckString = memo(() => {
  const { t } = useTranslation()
  const deckString = useSelector(deckBuilderDeckStringSelector)
  const [isCopied, setIsCopied] = useState(false)
  const timer = useRef<number | null>(null)

  const choppedDeckString = useMemo(() => {
    if (!deckString) return
    if (deckString.length <= 10) return deckString

    return deckString.slice(0, 10)
  }, [deckString])

  useEffect(() => {
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current)
      }
    }
  }, [])

  const copyDeckString = useCallback(async () => {
    if (!deckString) return
    try {
      await navigator.clipboard.writeText(deckString)
      setIsCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setIsCopied(false)
      }, 1000)
    } catch (error) {
      setIsCopied(false)
    }
  }, [deckString])

  if (!choppedDeckString) return null

  return (
    <Tooltip isVisible={isCopied} tooltip={t('generic.COPIED')} placement="left">
      <div
        onClick={copyDeckString}
        className={clsx(
          HeaderDeckStringStyle,
          Sprinkles({
            marginLeft: '12px',
            color: 'purple7',
            cursor: 'pointer',
            fontFamily: 'condensed',
            fontSize: { base: '18px', tabletWide: '32px' },
            fontWeight: '400'
          })
        )}
      >
        {`${choppedDeckString}...`}
      </div>
    </Tooltip>
  )
})

HeaderDeckString.displayName = 'HeaderDeckString'
