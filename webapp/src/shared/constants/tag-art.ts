import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'

import { ELEMENTS } from './cards'

export interface TagArt {
  id: string
  artUrl: string
  type: 'bg' | 'spell' | 'unit'
  cardId?: BaseCard
  cardName?: string
  bg?: string
  largeBg?: string
  cardSeason?: number
  smallBg?: string
}

export const TAG_ART = new Map<string, TagArt>()

for (const [id, card] of CardLibrary) {
  if (card.prism === 'tok' || card.prism === 'tut' || card.type === 'enchant') {
    continue
  }

  const tagArtId = card.artSlug
  const bgId = card.backgroundArtSlug

  const smallBg = `webapp/cards/art-rows/bgs/2x/${bgId}@2x.webp`

  const bg = `webapp/cards/art-rows/bgs/4x/${bgId}@4x.webp`

  const largeBg = `webapp/backgrounds/${bgId}.webp`
  const type = card.type === 'spell' ? 'spell' : 'unit'

  const artUrl = `webapp/cards/art-rows/${type}s/4x/${tagArtId}@4x.webp`

  TAG_ART.set(tagArtId, {
    id: tagArtId,
    artUrl,
    type,
    cardId: id,
    bg,
    cardSeason: card.releaseSeason,
    largeBg,
    smallBg
  })
}

ELEMENTS.forEach((element) => {
  TAG_ART.set(`bg-${element}-01`, {
    id: `bg-${element}-01`,
    type: 'bg',
    largeBg: `webapp/backgrounds/bg-${element}-01.webp`,
    artUrl: `webapp/cards/art-rows/bgs/4x/bg-${element}-01@4x.webp`
  })

  TAG_ART.set(`bg-${element}-02`, {
    id: `bg-${element}-02`,
    type: 'bg',
    largeBg: `webapp/backgrounds/bg-${element}-02.webp`,
    artUrl: `webapp/cards/art-rows/bgs/4x/bg-${element}-02@4x.webp`
  })

  TAG_ART.set(`bg-${element}-03`, {
    id: `bg-${element}-03`,
    type: 'bg',
    largeBg: `webapp/backgrounds/bg-${element}-03.webp`,
    artUrl: `webapp/cards/art-rows/bgs/4x/bg-${element}-03@4x.webp`
  })
})
