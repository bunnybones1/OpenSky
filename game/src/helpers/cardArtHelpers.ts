import { Element, Rarity, Type } from '@skyweaver/state-metadata'
import { Camera, Color, Mesh, Texture, Vector4 } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { modifyColorByHSL } from '~/colors/utils'
import { elementColors } from '~/constants'
import { FoilContextType } from '~/foils/FoilKitTypeHelpers'
import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'
import {
  addOverloadToWorldMatrixUpdate,
  makeCameraUpdateRenderOrderBasedOnRenderZ
} from '~/utils/matrixUtils'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'

export function setupCardArt(
  camera: Camera,
  cardArt: Mesh,
  element: Element | Color,
  cardType: Type,
  bgUrl: string,
  fgUrl: string,
  overrideColor?: Color,
  deepenColor = false,
  rarity: Rarity = 'base',
  foilContext: FoilContextType = 'inspecting',
  accentColor?: Vector4
) {
  const isSpell = cardType === 'spell' || cardType === 'enchant' // XXX Treat enchants as spells until we add different styling
  let color = element instanceof Color ? element : elementColors[element]
  if (deepenColor) {
    color = modifyColorByHSL(color.clone(), 0, 0.2, -0.2)
  }
  const texCache = getAssetsManager().getTextureCache(TextureType.Default)

  function asyncLoadArt() {
    cardArtMatCopy.bgTexture = getTempTexture() //temp black texture
    cardArtMatCopy.fgTexture = getTempTexture() //temp black texture

    const loadTexture = async (url: string) =>
      texCache.hasTexture(url)
        ? texCache.getTexture(url)
        : ((await getAssetsManager().load('texture', url)) as Texture)

    async function bgs() {
      await getAssetsManager()
        .loadAsset('bgLoading')
        .then(() => {
          const texture = getAssetsManager().getAsset('bgLoading') //temp placeholder bg
          cardArtMatCopy.bgTexture = texture
        })

      await loadTexture(bgUrl).then(texture => {
        cardArtMatCopy.bgTexture = texture
        safelyResetFlipY(cardArtMatCopy.bgTexture)
      })
    }
    async function fgs() {
      if (isSpell) {
        await getAssetsManager()
          .loadAsset('spellLoading')
          .then(() => {
            const texture = getAssetsManager().getAsset('spellLoading') //temp placeholder fg
            cardArtMatCopy.fgTexture = texture
          })
      } else {
        await getAssetsManager()
          .loadAsset('unitLoading')
          .then(() => {
            const texture = getAssetsManager().getAsset('unitLoading') //temp placeholder fg
            cardArtMatCopy.fgTexture = texture
          })
      }

      await loadTexture(fgUrl).then(texture => {
        cardArtMatCopy.fgTexture = texture
        safelyResetFlipY(cardArtMatCopy.fgTexture)
      })
    }

    fgs()

    if (!isSpell) {
      bgs()
    }
  }

  const cardArtCopy = cardArt.clone()
  const cardArtMat = cardArt.material as CardArtMeshMaterial
  const cardArtMatCopy = cardArtMat.variant({
    rarity,
    foilContext,
    accentColor
  })
  asyncLoadArt()
  cardArtCopy.material = cardArtMatCopy
  cardArtMatCopy.decalColor = overrideColor || color

  addOverloadToWorldMatrixUpdate(
    cardArtCopy,
    makeCameraUpdateRenderOrderBasedOnRenderZ(camera)
  )

  return cardArtCopy
}

export const cardArtTypes: {
  [K in Type]: 'unit' | 'spell' | 'enchant'
} = {
  hero: 'unit',
  unit: 'unit',
  spell: 'spell',
  enchant: 'enchant',
  heroAbility: 'spell'
}

export const cardArtFolder: {
  [K in Type]: 'unit' | 'spell' | 'heroe'
} = {
  hero: 'heroe',
  unit: 'unit',
  spell: 'spell',
  enchant: 'spell',
  heroAbility: 'spell'
}

export const randomArtNames = {
  bgs: [
    'bg-air-01',
    'bg-air-02',
    'bg-air-03',
    'bg-dark-01',
    'bg-dark-02',
    'bg-dark-03',
    'bg-earth-01',
    'bg-earth-02',
    'bg-earth-03',
    'bg-fire-01',
    'bg-fire-02',
    'bg-fire-03',
    'bg-light-01',
    'bg-light-02',
    'bg-light-03',
    'bg-metal-01',
    'bg-metal-02',
    'bg-metal-03',
    'bg-mind-01',
    'bg-mind-02',
    'bg-mind-03',
    'bg-water-01',
    'bg-water-02',
    'bg-water-03'
  ],
  fgs: [
    'unit-desir-30',
    'unit-desir-31',
    'unit-evst-01',
    'unit-evst-05',
    'unit-giaco-05',
    'unit-giaco-06',
    'unit-giaco-07',
    'unit-giaco-08',
    'unit-giaco-10',
    'unit-haru-01',
    'unit-kalani-01',
    'unit-kalani-02',
    'unit-kalani-05',
    'unit-kalani-07',
    'unit-laur-01',
    'unit-laur-02',
    'unit-lobo-02',
    'unit-lobo-04',
    'unit-lobo-05',
    'unit-lobo-06',
    'unit-lobo-07',
    'unit-lobo-09',
    'unit-lobo-12',
    'unit-lobo-13',
    'unit-lobo-14',
    'unit-lobo-16',
    'unit-lobo-17',
    'unit-lobo-18',
    'unit-lobo-19',
    'unit-lobo-20',
    'unit-lobo-23',
    'unit-lobo-24'
  ],
  spells: [
    'spell-desir-04',
    'spell-desir-05',
    'spell-desir-06',
    'spell-hans-01',
    'spell-hans-03',
    'spell-hans-04',
    'spell-hans-05',
    'spell-hans-06',
    'spell-hans-07',
    'spell-hans-08',
    'spell-ksen-01',
    'spell-ksen-02',
    'spell-ksen-05',
    'spell-ksen-06',
    'spell-ksen-07',
    'spell-ksen-08',
    'spell-miche-01',
    'spell-panou-01',
    'spell-panou-02',
    'spell-panou-03',
    'spell-panou-04',
    'spell-panou-05',
    'spell-panou-06',
    'spell-panou-07',
    'spell-panou-08',
    'spell-rubio-03',
    'spell-rubio-04',
    'spell-rubio-05',
    'spell-rubio-06',
    'spell-rubio-07',
    'spell-rubio-11'
  ]
}
