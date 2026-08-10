import { Howl } from 'howler'

export interface HowlWithVariations extends Howl {
  variations: {
    [key: string]: number
  }
}
