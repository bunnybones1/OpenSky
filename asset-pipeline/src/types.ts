import { CardDescriptionTextSegment } from '@opensky/parse-card-description'
import { BaseCard, CardMetadata } from '@skyweaver/state-metadata'
export type SizeConfigKey = '2x' | '4x' | '6x'
export type SmallSizeConfigKey = '1x' | '2x' | '4x' | '6x'
export type HeroSizeConfigKey = '2x' | '4x' | '6x' | '8x' | '10x'

export type SizeConfig = {
  [key in SizeConfigKey]: {
    width: number
    height: number
  }
}
export type SmallSizeConfig = {
  [key in SmallSizeConfigKey]: {
    width: number
    height: number
  }
}
export type HeroSizeConfig = {
  [key in HeroSizeConfigKey]: {
    width: number
    height: number
  }
}

export type CardMetadataWithRenderedDescription = CardMetadata & {
  renderedDescription?: CardDescriptionTextSegment[]
}
export interface CardLibJSON {
  cards: Array<{ id: number } & CardMetadata>
}

export type CardLib = Map<BaseCard, Readonly<CardMetadata>>
