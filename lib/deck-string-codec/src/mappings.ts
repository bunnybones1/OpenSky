import { DeckClass } from '@opensky/proto'

// sync with DeckClass enum in proto
export const DECK_CLASS_MAPPINGS: { [key in DeckClass]: DeckClass[] } = {
  [DeckClass.UNKNOWN_CLASS]: [DeckClass.UNKNOWN_CLASS],
  //Single class
  [DeckClass.STR]: [DeckClass.STR],
  [DeckClass.HRT]: [DeckClass.HRT],
  [DeckClass.AGY]: [DeckClass.AGY],
  [DeckClass.INT]: [DeckClass.INT],
  [DeckClass.WIS]: [DeckClass.WIS],
  //Multi class
  [DeckClass.STH]: [DeckClass.STR, DeckClass.HRT],
  [DeckClass.STA]: [DeckClass.STR, DeckClass.AGY],
  [DeckClass.STI]: [DeckClass.STR, DeckClass.INT],
  [DeckClass.STW]: [DeckClass.STR, DeckClass.WIS],
  [DeckClass.HRA]: [DeckClass.HRT, DeckClass.AGY],
  [DeckClass.HRI]: [DeckClass.HRT, DeckClass.INT],
  [DeckClass.HRW]: [DeckClass.HRT, DeckClass.WIS],
  [DeckClass.AGI]: [DeckClass.AGY, DeckClass.INT],
  [DeckClass.AGW]: [DeckClass.AGY, DeckClass.WIS],
  [DeckClass.INW]: [DeckClass.INT, DeckClass.WIS]
}
