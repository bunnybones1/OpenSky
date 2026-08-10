import { textSegmentsOrError } from '@opensky/parse-card-description'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { sheetsDerivedDataStore } from '../stores/designData'
import { RCProps } from './utils'

export function CardDescriptionText({ row, column }: RCProps) {
  const { t } = useTranslation()
  const { getCard } = useSnapshot(sheetsDerivedDataStore)
  const getCardName = useCallback(
    (id: string) =>
      getCard(id)?.name ??
      (() => {
        throw new Error(`Invalid Card ID ${id}`)
      })(),
    [getCard]
  )
  const value = row[column.key]
  if (typeof value !== 'string') {
    return <div>{`${value}`}</div>
  }
  const segments = textSegmentsOrError(value ?? '', getCardName, t)
  if (!segments.length) {
    return null
  }

  return (
    <div className="cardText">
      {segments.map((s, i) => (
        <span
          key={i}
          className={s.fontWeight && s.fontWeight > 1 ? 'bold' : ''}
          style={{
            color: typeof s.color === 'number' ? `#${s.color.toString(16)}` : s.color,
            fontStyle: s.italicSkew ? 'italic' : 'normal'
          }}
        >
          {s.text}
        </span>
      ))}
    </div>
  )
}
