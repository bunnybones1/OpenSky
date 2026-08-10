import { Element } from '@skyweaver/state-metadata'

export interface IDeckBreakdownData {
  unitCounter: number
  spellCounter: number
  elementCounter: { [K in Element]: number }
  listenForChange: (cb: () => void, firstOneFree?: boolean) => void
}
