import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'

import { ROW_ART_SIZES } from '../../constants'

export function compositeUnitRowCommand(
  rowPathSrc: string,
  cardID: BaseCard,
  size: keyof typeof ROW_ART_SIZES
) {
  const card = CardLibrary.get(cardID)!
  const fileName = `${card.artSlug}@${size}`

  const unitArtFile = `${rowPathSrc}/units-no-bg/${size}/${fileName}.png`

  const bgArtFile = `${rowPathSrc}/bgs/${size}/${card.backgroundArtSlug}@${size}.png`

  const outputFile = `${rowPathSrc}/units/${size}/${fileName}.png`

  return composeImageCommand([bgArtFile, unitArtFile], outputFile)
}

export function copySpellRowCommand(
  rowPathSrc: string,
  cardID: BaseCard,
  size: keyof typeof ROW_ART_SIZES
) {
  const card = CardLibrary.get(cardID)!
  const fileName = `${card.artSlug}@${size}`
  const spellArtFile = `${rowPathSrc}/spells/${size}/${fileName}.png`
  const outputFile = `${rowPathSrc}/units/${size}/${fileName}.png`
  return copyImageCommand(spellArtFile, outputFile)
}

export function composeImageCommand(fileLayers: string[], out: string) {
  return `magick convert ${fileLayers.join(
    ' '
  )} -gravity center -compose over -composite -define png:include-chunk=none ${out}`
}

function copyImageCommand(file: string, out: string) {
  return `cp ${file} ${out}`
}
