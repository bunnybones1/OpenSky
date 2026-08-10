import { getRandom } from '@opensky/shared/utils/arrayUtils'
import {
  getUrlParam,
  queryStringUrlReplacement
} from '@opensky/shared/utils/location'
import { Mesh, Object3D, Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { elementsArr, lineworkSettingsLib } from '~/constants'
import { randomArtNames, setupCardArt } from '~/helpers/cardArtHelpers'
import { CardVisType, castCardVisType } from '~/helpers/CardVisType'
import UpdateManager from '~/systems/UpdateManager'
import { create3DLocationGrid } from '~/utils/mathThree'
import NiceMethod from '~/utils/NiceMethod'
import { modify3DObjectsWhoseNamesInclude } from '~/utils/threeUtils'

import { TestLightCacheSkyScene } from './TestLightCacheSkyScene'

class TestNoAtlasCardsScene extends TestLightCacheSkyScene {
  constructor() {
    super()
    const initCards = async () => {
      await getAssetsManager().loadAsset('gamePiecesPhysical')
      const cardsNode = getAssetsManager().getAsset('gamePiecesPhysical')
      modify3DObjectsWhoseNamesInclude<Mesh>(
        cardsNode,
        '-art',
        mesh => (mesh.visible = false)
      )
      const t = cardsNode.children.length
      cardsNode.scale.multiplyScalar(1.6)
      for (let i = 0; i < t; i++) {
        const child = cardsNode.children[i]
        child.position.y += 0.05
        child.rotation.x += Math.PI * 0.3
        child.position.x = (i - t * 0.45) * 0.05
      }
      UpdateManager.register({
        update: (dt: number) => {
          for (const child of cardsNode.children) {
            child.rotation.z += Math.PI * 0.125 * dt
          }
        }
      })

      // this.scene.add(cardsNode)

      await getAssetsManager().loadAsset('gamePiecesGraphical')

      const cardArtObjs = getAssetsManager().getAsset(
        'gamePiecesGraphical'
      ).children

      function getChildrenNamedLike(str: string) {
        return cardArtObjs.filter(m => m.name.includes(str))
      }

      const tokens = getChildrenNamedLike('token')
      const cards = getChildrenNamedLike('card')
      const rowsDesktop = getChildrenNamedLike('row-desktop')
      const rowsMobile = getChildrenNamedLike('row-mobile')
      const rowsMini = getChildrenNamedLike('row-mini')
      const rowsGold = getChildrenNamedLike('row-gold')
      const rowsSilver = getChildrenNamedLike('row-silver')

      class TestSettings {
        constructor(
          public gridSize: number,
          public flipYZ: boolean,
          public collection: Object3D[],
          public itemScale: number,
          public spacingZ = 1,
          public useRowArtMaterial = false
        ) {
          //
        }
      }

      const testSettingsLib: { [K in CardVisType]: TestSettings } = {
        card: new TestSettings(0.55, false, cards, 0.5),
        token: new TestSettings(0.45, false, tokens, 0.5),
        rowDesktop: new TestSettings(0.85, true, rowsDesktop, 1.5, 0.25, true),
        rowMobile: new TestSettings(0.5, true, rowsMobile, 1.5, 0.25, true),
        rowMini: new TestSettings(0.15, true, rowsMini, 1.5, 1, true),
        rowGold: new TestSettings(0.15, true, rowsGold, 1.5, 1, true),
        rowSilver: new TestSettings(0.15, true, rowsSilver, 1.5, 1, true)
      }

      let limit = 40
      const mode: CardVisType =
        castCardVisType(getUrlParam('lineworkTest') || 'card') || 'card'
      const testSettings = testSettingsLib[mode]
      const lineworkSettings = lineworkSettingsLib[mode]
      for (const pos of create3DLocationGrid(
        testSettings.gridSize,
        7,
        new Vector3(10, 1, 10)
      )) {
        limit--
        if (limit === 0) {
          break
        }
        const cardArt = getRandom(testSettings.collection) as Mesh

        let cardArtCopy: Mesh | undefined
        const element = getRandom(elementsArr)

        if (testSettings.useRowArtMaterial) {
          return
          // TODO
          // const isSpell = Math.random() > 0.5
          // const fgUrl = `game/cards/art-rows/${
          //   isSpell ? 'spells' : 'units'
          // }/${getRandom(
          //   isSpell ? randomArtNames.spells : randomArtNames.fgs
          // )}.png`
          // cardArtCopy = setupRowArt(
          //   this.camera,
          //   cardArt,
          //   element,
          //   fgUrl,
          //   lineworkSettings.overrideColor,
          //   lineworkSettings.deepenColor
          // )
        } else {
          const isSpell = cardArt.name.includes('spell')
          const bgUrl = `game/cards/art-full/bgs/${getRandom(
            randomArtNames.bgs
          )}.png`
          const fgUrl = isSpell
            ? `game/cards/art-full/spells/${getRandom(
                randomArtNames.spells
              )}.png`
            : `game/cards/art-full/units/${getRandom(randomArtNames.fgs)}.png`

          cardArtCopy = setupCardArt(
            this.camera,
            cardArt,
            element,
            isSpell ? 'spell' : 'unit',
            bgUrl,
            fgUrl,
            lineworkSettings.overrideColor,
            lineworkSettings.deepenColor
          )
        }

        this.scene.add(cardArtCopy)
        cardArtCopy.scale.multiplyScalar(testSettings.itemScale)
        const cardPos = cardArtCopy.position
        cardPos.copy(pos)
        cardPos.y += 0.05
        if (testSettings.flipYZ) {
          const temp = cardPos.y
          cardPos.y = cardPos.z * testSettings.spacingZ + 0.1
          cardPos.z = temp
        }
      }
    }
    initCards()

    function testReload(type: CardVisType) {
      setTimeout(() => {
        location.href = queryStringUrlReplacement(
          location.href,
          'lineworkTest',
          type
        )
      }, 200)
    }

    function addLineworkOpt(type: CardVisType, label: string) {
      new NiceMethod('', () => testReload(type), label, 'linework', 0)
    }

    addLineworkOpt('card', 'Cards')
    addLineworkOpt('token', 'Tokens')
    addLineworkOpt('rowDesktop', 'Rows Desktop')
    addLineworkOpt('rowMobile', 'Rows Mobile')
    addLineworkOpt('rowMini', 'Rows Mini')
  }
}

export const scene = TestNoAtlasCardsScene
