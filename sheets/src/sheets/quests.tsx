import { questID } from '@opensky/design-data/schema/cellTypes'
import {
  heroes,
  questColumns,
  questDesignedDifficulties,
  questPeriodicity
} from '@opensky/design-data/schema/options'
import { Quest } from '@opensky/design-data/schema/quest/single/struct'
import * as t from 'myzod'
import { textEditor } from 'react-data-grid'

import { BooleanPreview } from '../cellRenderers/BooleanPreview'
import { CardIdAsCard } from '../cellRenderers/CardIdAsCard'
import { makeStaticListPicker } from '../cellRenderers/makeStaticListPicker'
import { makeNumberEditor } from '../cellRenderers/NumberEditor'
import { ColumnsWithIdAndFilter, SheetDescription } from './types'

const columns: ColumnsWithIdAndFilter<Quest> = [
  { key: 'id', name: 'ID', width: 160 },
  {
    key: 'periodicity',
    name: 'Periodicity',
    renderEditCell: makeStaticListPicker(
      questPeriodicity.map((q) => ({ value: q, name: q }))
    ),
    width: 80
  },
  {
    key: 'baseCardArt',
    name: 'Card for Art',
    renderCell: CardIdAsCard,
    width: 120
  },
  {
    key: 'rerollable',
    name: 'Rerollable',
    renderCell: BooleanPreview,
    renderEditCell: BooleanPreview,
    width: 10
  },
  { key: 'name', name: 'Name', width: 180, renderEditCell: textEditor },
  { key: 'description', name: 'Description', renderEditCell: textEditor },
  {
    key: 'designedDifficulty',
    name: 'Design Difficulty',
    renderEditCell: makeStaticListPicker(
      questDesignedDifficulties.map((diff) => ({ name: diff, value: diff }))
    ),
    width: 50
  },
  {
    key: 'column',
    name: 'Column',
    width: 50,
    renderEditCell: makeStaticListPicker(
      questColumns.map((col) => ({ name: col, value: col }))
    )
  },
  {
    key: 'rewardXp',
    name: 'Reward XP',
    width: 50,
    renderEditCell: makeNumberEditor(0, Infinity)
  },
  {
    key: 'startProgress',
    name: 'Start Progress',
    width: 50,
    renderEditCell: makeNumberEditor(0, Infinity)
  },
  {
    key: 'endProgress',
    name: 'End Progress',
    width: 50,
    renderEditCell: makeNumberEditor(0, Infinity)
  },
  {
    key: 'requiredHero',
    name: 'RQ Hero',
    width: 80,
    renderEditCell: makeStaticListPicker(
      heroes.map((hero) => ({ name: hero, value: hero })),
      { allowNull: true }
    )
  },
  { key: 'requiredCards', name: 'RQ Cards', width: 80 }, // TODO card-picker & multi-card-picker
  {
    key: 'requiredMinLevel',
    name: 'Min Level',
    width: 80,
    renderEditCell: makeNumberEditor(0, Infinity)
  },
  {
    key: 'requiredMaxLevel',
    name: 'Max Level',
    width: 80,
    renderEditCell: makeNumberEditor(0, Infinity)
  }
]

export const questsSheetDescription: SheetDescription<t.StringType, Quest> = {
  name: 'Quests',
  columns,
  sheetArray: 'quests',
  primaryKeySchema: questID,
  newRow: (_id) => ({
    baseCardArt: '',
    column: 'left',
    description: '',
    designedDifficulty: 'easy',
    endProgress: 0,
    name: '',
    periodicity: 'daily',
    requiredCards: [],
    rerollable: true,
    rewardXp: 0
  }),
  idsFromRange: (_start, _end) => []
}
