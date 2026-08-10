import { HeroSizeConfig, SizeConfig, SmallSizeConfig } from './types'

export const FULL_CARD_SIZES: SizeConfig = {
  '6x': {
    width: 553,
    height: 850
  },
  '4x': {
    width: 346,
    height: 532
  },
  '2x': {
    width: 173,
    height: 266
  }
}

const baseUnitArtSize = {
  width: 108,
  height: 182
}

const baseSpellArtSize = {
  width: 108,
  height: 108
}

export const UNIT_ART_SIZES: SizeConfig = {
  '6x': {
    width: baseUnitArtSize.width * 6,
    height: baseUnitArtSize.height * 6
  },
  '4x': {
    width: baseUnitArtSize.width * 4,
    height: baseUnitArtSize.height * 4
  },
  '2x': {
    width: baseUnitArtSize.width * 2,
    height: baseUnitArtSize.height * 2
  }
}

export const SPELL_ART_SIZES: SizeConfig = {
  '6x': {
    width: baseSpellArtSize.width * 6,
    height: baseSpellArtSize.height * 6
  },
  '4x': {
    width: baseSpellArtSize.width * 4,
    height: baseSpellArtSize.height * 4
  },
  '2x': {
    width: baseSpellArtSize.width * 2,
    height: baseSpellArtSize.height * 2
  }
}

export const HERO_ART_SIZES: HeroSizeConfig = {
  '10x': {
    width: baseUnitArtSize.width * 10,
    height: baseUnitArtSize.height * 10
  },
  '8x': {
    width: baseUnitArtSize.width * 8,
    height: baseUnitArtSize.height * 8
  },
  ...UNIT_ART_SIZES
}

export const ROW_ART_SIZES: SizeConfig = {
  '6x': {
    width: 1324,
    height: 240
  },
  '4x': {
    width: 883,
    height: 160
  },
  '2x': {
    width: 441,
    height: 80
  }
}

export const TITLE_FRAME_SIZES: SizeConfig = {
  '6x': {
    width: 616,
    height: 448
  },
  '4x': {
    width: 352,
    height: 256
  },
  '2x': {
    width: 264,
    height: 192
  }
}

export const HERO_ROW_ART_SIZES: SmallSizeConfig = {
  ...ROW_ART_SIZES,
  '1x': {
    width: 220,
    height: 40
  }
}

export const QUEST_THUMBNAIL_SIZES: SizeConfig = {
  '6x': {
    width: 360,
    height: 192
  },
  '4x': {
    width: 240,
    height: 128
  },
  '2x': {
    width: 120,
    height: 64
  }
}

export const ELEMENT_COLORS = {
  air: {
    primary: '#71C6B8',
    secondary: '#2B685C'
  },
  dark: {
    primary: '#6D3A70',
    secondary: '#2E1730'
  },
  earth: {
    primary: '#32C11E',
    secondary: '#155B09'
  },
  fire: {
    primary: '#f40b0b',
    secondary: '#380303'
  },
  water: {
    primary: '#6299E8',
    secondary: '#1D487C'
  },
  light: {
    primary: '#DDBF2A',
    secondary: '#665305'
  },
  metal: {
    primary: '#B5B58F',
    secondary: '#5B5A3B'
  },
  mind: {
    primary: '#8830EF',
    secondary: '#280B54'
  }
}

export const STICKER_SIZES: SizeConfig = {
  '6x': {
    height: 240,
    width: 240
  },
  '4x': {
    height: 160,
    width: 160
  },
  '2x': {
    height: 80,
    width: 80
  }
}

export const CARD_BACK_SIZES: SizeConfig = {
  '6x': {
    height: 1200,
    width: 774
  },
  '4x': {
    height: 800,
    width: 516
  },
  '2x': {
    height: 400,
    width: 258
  }
}

export const DECK_COVER_IMAGE_SIZES: SizeConfig = {
  '6x': {
    width: 552,
    height: 804
  },
  '4x': {
    width: 368,
    height: 534
  },
  '2x': {
    width: 184,
    height: 268
  }
}
