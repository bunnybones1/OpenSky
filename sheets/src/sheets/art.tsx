import { Art } from '@opensky/design-data/schema'
import { artSlug, ArtStatus, cardType } from '@opensky/design-data/schema/cellTypes'
import {
  ArtMarketingUsage,
  artMarketingUsages,
  artStatuses,
  elements,
  races
} from '@opensky/design-data/schema/options'
import { Type, ValidationError } from 'myzod'
import { textEditor } from 'react-data-grid'
import { useSnapshot } from 'valtio'

import { CARD_TYPE_COLORS } from '../assets/metadata'
import { ArtSlugPreview } from '../cellRenderers/ArtSlugPreview'
import { BackgroundEditor } from '../cellRenderers/BackgroundEditor'
import { ElementPreview } from '../cellRenderers/ElementPreview'
import { makeLookupValue } from '../cellRenderers/makeLookupValue'
import { makeStaticListPicker } from '../cellRenderers/makeStaticListPicker'
import { sheetsArrays } from '../stores/designData'
import { ColumnsWithIdAndFilter, SheetDescription } from './types'

const columns: ColumnsWithIdAndFilter<Art> = [
  {
    key: 'id',
    name: 'Art ID',
    renderCell: (props) => <ArtSlugPreview {...props} />,
    width: 120
  },
  {
    key: 'element',
    name: 'Element',
    renderCell: (props) => <ElementPreview {...props} />,
    renderEditCell: makeStaticListPicker(
      elements.map((p) => ({ name: p, value: p })),
      { allowNull: true }
    ),
    width: 50
  },
  {
    synthetic: true,
    key: 'type',
    name: 'Type',
    renderCell: ({ row }) => {
      const value = row.id.split('-')[0]
      const type = cardType.try(value)
      if (type instanceof ValidationError) {
        return <div>{value}</div>
      }
      return (
        <div className="full-cell" style={{ background: CARD_TYPE_COLORS[type] }}>
          {type}
        </div>
      )
    },
    width: 50
  },
  {
    synthetic: true,
    key: 'usedOnUnit',
    name: 'Used on Unit (s)',
    renderCell: function UnitsWithThisArt({ row }) {
      const sheets = useSnapshot(sheetsArrays)
      const units = sheets.cards.filter((c) => c.artSlug === row.id)
      const unitStrings = units.map((u) => `${u.name} (${u.id})`)
      return (
        <div className="full-cell">
          {unitStrings.map((str) => (
            <pre key={str} style={{ lineHeight: '0' }}>
              {str}
            </pre>
          ))}
        </div>
      )
    },
    width: 50
  },
  {
    key: 'status',
    name: 'Art Status',
    renderEditCell: makeStaticListPicker(
      artStatuses.map((p) => ({ name: p, value: p }))
    ),
    renderCell: makeLookupValue<ArtStatus>({
      Good: 'hsla(151, 51.20%, 60.00%, 0.5)',
      ToAdjust: 'transparent',
      ToRedesign: 'hsla(31, 98.70%, 79.60%, 0.5)',
      Trashed: 'hsla(0, 100.00%, 48.60%, 0.50)'
    }),
    width: 70
  },
  {
    key: 'race',
    name: 'Race',
    renderEditCell: makeStaticListPicker(
      races.map((p) => ({ name: p, value: p })),
      { allowNull: true }
    )
  },
  {
    key: 'marketing',
    name: 'Marketing',
    renderEditCell: makeStaticListPicker(
      artMarketingUsages.map((p) => ({ name: p, value: p }))
    ),
    renderCell: makeLookupValue<ArtMarketingUsage>({
      DontUse: 'hsla(0, 66.50%, 51.40%, 0.5)',
      TryAvoid: 'hsla(45, 92.10%, 55.10%, 0.5)',
      GoodToUse: 'hsla(151, 41.20%, 70.00%, 0.5)'
    })
  },
  { key: 'notes', name: 'Notes', renderEditCell: textEditor, width: 300 },

  {
    key: 'bgId',
    name: 'Background ID',
    renderCell: ArtSlugPreview,
    renderEditCell: BackgroundEditor
  }
]

export const artSheetDescription: SheetDescription<Type<string>, Art> = {
  name: 'Art',
  columns,
  sheetArray: 'art',
  primaryKeySchema: artSlug,
  newRow: (_id) => ({
    marketing: 'GoodToUse',
    status: 'Good'
  }),
  idsFromRange: (start, end) => {
    const prefix = start.split('-').slice(0, -1).join('-')
    const startNum = Number.parseInt(start.split('-').splice(-1)[0], 10)
    const endNum = Number.parseInt(end.split('-').splice(-1)[0], 10)
    if (Number.isNaN(startNum) || Number.isNaN(endNum)) {
      return []
    }
    const ids: string[] = []
    for (let i = startNum; i <= endNum; i++) {
      ids.push(`${prefix}-${i.toString().padStart(2, '0')}`)
    }
    return ids
  }
}
