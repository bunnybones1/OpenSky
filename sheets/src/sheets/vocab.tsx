import { vocabIcons, vocabType } from '@opensky/design-data/schema/options'
import { Vocab } from '@opensky/design-data/schema/vocab'
import * as t from 'myzod'
import { textEditor } from 'react-data-grid'

import { makeStaticListPicker } from '../cellRenderers/makeStaticListPicker'
import { ColumnsWithIdAndFilter, SheetDescription } from './types'

const columns: ColumnsWithIdAndFilter<Vocab> = [
  { key: 'id', name: 'ID', width: 10 },
  {
    key: 'pattern',
    name: 'Pattern',
    renderEditCell: textEditor
  },
  {
    key: 'title',
    name: 'Title',
    renderEditCell: textEditor
  },
  {
    key: 'text',
    name: 'Text',
    renderEditCell: textEditor
  },
  {
    key: 'type',
    name: 'Type',
    renderEditCell: makeStaticListPicker(
      vocabType.map((t) => ({ name: t, value: t }))
    )
  },
  {
    key: 'icon',
    name: 'Icon',
    renderEditCell: makeStaticListPicker(
      vocabIcons.map((t) => ({ name: t, value: t }))
    )
  }
]

export const vocabSheetDescription: SheetDescription<t.StringType, Vocab> = {
  name: 'Vocab',
  columns,
  sheetArray: 'vocab',
  primaryKeySchema: t.string(),
  newRow: (_id) => ({
    pattern: '',
    text: '',
    title: '',
    type: 'keyword'
  }),
  idsFromRange: (_start, _end) => []
}
