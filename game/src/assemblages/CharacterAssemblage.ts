import { GameMode } from '@opensky/proto'
import { lerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { CardLibrary, isCharacter, isHero } from '@skyweaver/state-metadata'
import { Material, Mesh, MeshBasicMaterial, Vector3 } from 'three'

import {
  COLOR_BUFFED_TEXT,
  COLOR_NERFED_TEXT,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import CardComponent from '~/components/CardComponent'
import CardInstanceComponent, {
  RelaxedCardInstance
} from '~/components/CardInstanceComponent'
import CharacterComponent from '~/components/CharacterComponent'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import { HERO_ATTACK_FADED_OPACITY, RENDER_ORDERS } from '~/constants'
import { cardArtFolder, setupCardArt } from '~/helpers/cardArtHelpers'
import { gameMode } from '~/helpers/envGameModeHelpers'
import { managePrismGems } from '~/helpers/prismGems'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { accountsStore } from '~/state/AccountStore'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { Easing } from '~/systems/animation/Easing'
import { CompleteStatus } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import TextMesh from '~/systems/text/TextMesh'
import {
  makeAttackHealthNumberEffect,
  makeNullEffect
} from '~/systems/text/textMeshEffects'
import * as textOptions from '~/systems/text/TextOptions'
import { getTutorial } from '~/tutorial/Tutorial'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { cameraShaker } from '~/utils/cameraShaker'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import { InteractivesFactoryMethod } from '~/utils/helpers/InteractivesHelpers'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { addDynamicText } from '~/utils/textUtils'
import { findObject3DByName } from '~/utils/threeUtils'

import { getAssetsManager } from '../assets'
import { getBGAtlasKey, getCardAssetString } from '../materials'
import { CommonCardAssemblage } from './CardAssemblage'

const TEXT_DEPTH = 0.0032
const HEALTH_ATTACK_Y = 0.0085
const HEALTH_ATTACK_X = 0.0152

const __tooltipOffset = new Vector3(0, -0.001, 0)

export const createCharacterInteractives: InteractivesFactoryMethod = (
  card,
  owner
) => {
  const pivotName = isHero(card)
    ? 'hero'
    : card.state.view.traits.includes('guard')
    ? 'guard'
    : 'unit'

  const visualsRoot = getAssetsManager().fetchMeshDeepClone(
    'gamePiecesPhysical',
    pivotName
  )

  const artType = pivotName === 'hero' ? 'unit' : pivotName
  const cardArt = findObject3DByName(
    getAssetsManager().getAsset('gamePiecesGraphical'),
    `token-${artType}-art`
  ) as Mesh

  const assetName = getCardAssetString(card)
  const hero = isHero(card)
  const type =
    gameMode === GameMode.TUTORIAL &&
    getTutorial()?.config.botArt &&
    owner === 1
      ? 'unit'
      : card.state.view.type

  const bgUrl = `game/cards/art-full/bgs/${getBGAtlasKey(card)}.png`
  const fgUrl = assetName.startsWith('blob:')
    ? assetName
    : `game/cards/art-full/${cardArtFolder[type]}s/${assetName}.png`

  const cardArtCopy = setupCardArt(
    cameraShaker.camera,
    cardArt,
    card.state.view.element,
    type,
    bgUrl,
    fgUrl,
    undefined,
    undefined,
    !hero || queryParams.foilHero ? card.state.view.rarity : 'base',
    'token'
  )
  cardArtCopy.scale.multiplyScalar(0.37625)
  cardArtCopy.rotation.x = Math.PI * -0.5
  cardArtCopy.position.y += 0.00075
  cardArtCopy.position.z -= 0.001

  cardArtCopy.userData.isFrontFacing = true
  visualsRoot.add(cardArtCopy)
  registerMeshesToLCMaterials(visualsRoot)

  const collider = findObject3DByName<Mesh>(
    visualsRoot,
    pivotName + '-collider'
  )

  const highlight: Mesh = findObject3DByName(
    visualsRoot,
    pivotName + '-highlight'
  )
  if (highlight.material instanceof Material) {
    highlight.material = highlight.material.clone()
    highlight.material.opacity = 0
  }

  if (hero) {
    const prisms = accountsStore.accounts![owner].prisms
    managePrismGems(visualsRoot, prisms)
  }
  if (isCharacter(card)) {
    const pulseNumber = (baseVal?: number) => {
      return async (textMesh: TextMesh, newText: string, oldText: string) => {
        const newVal = Number.parseInt(newText, 10)
        const oldVal = Number.parseInt(oldText, 10)

        let color = newVal > oldVal ? COLOR_BUFFED_TEXT : COLOR_NERFED_TEXT

        simpleTweener.to({
          description: 'character text color',
          target: textMesh.material.color,
          propertyGoals: {
            r: color.r,
            g: color.g,
            b: color.b
          },
          duration: 100,
          easing: Easing.Linear
        })

        const status = await simpleTweener.to({
          description: 'character text scale',
          target: textMesh.scale,
          propertyGoals: {
            x: 1.6,
            y: 1.6
          },
          duration: 100,
          easing: Easing.Linear
        }).finished

        color = COLOR_WHITE
        if (newVal < 0) {
          color = COLOR_NERFED_TEXT
        } else if (baseVal !== undefined) {
          if (newVal > baseVal) {
            color = COLOR_BUFFED_TEXT
          } else if (newVal < baseVal) {
            color = COLOR_NERFED_TEXT
          }
        }

        if (status === CompleteStatus.Finished) {
          simpleTweener.to({
            description: 'character text color',
            target: textMesh.material.color,
            propertyGoals: {
              r: color.r,
              g: color.g,
              b: color.b
            },
            duration: 150,
            easing: Easing.Quadratic.In
          })

          await simpleTweener.to({
            description: 'character text scale',
            target: textMesh.scale,
            propertyGoals: {
              x: 1,
              y: 1
            },
            duration: 150,
            easing: Easing.Quadratic.In
          }).finished
        }

        textMesh.material.color = color

        textMesh.scale.setScalar(1)
      }
    }
    const texts = [
      {
        style: textOptions.characterAttackHealth,
        zo: 0.0002,
        yo: 0,
        effect: makeAttackHealthNumberEffect,
        isShadow: false
      },
      {
        style: textOptions.characterAttackHealthShadow,
        zo: 0,
        yo: -0.002,
        effect: makeNullEffect,
        isShadow: true
      }
    ].map(layer => {
      /// Attack
      const cardInfo = CardLibrary.get(card.base)
      const basePower = cardInfo ? Number.parseInt(`${cardInfo.power}`, 10) : 1
      const textPower = addDynamicText(
        visualsRoot,
        card.state.view,
        'power',
        {
          ...layer.style,
          onTextChanged: !layer.isShadow ? pulseNumber(basePower) : undefined
        },
        -HEALTH_ATTACK_X,
        TEXT_DEPTH + layer.zo,
        HEALTH_ATTACK_Y + layer.yo,
        layer.effect(basePower)
      )
      textPower.name = layer.isShadow ? 'textPowerShadow' : 'textPower'
      /// Health
      const baseHealth = isHero(card)
        ? undefined
        : Number.parseInt(`${(cardInfo || card.state.view).health}`, 10)
      const textHealth = addDynamicText(
        visualsRoot,
        card.state.view,
        'health',
        {
          ...layer.style,
          onTextChanged: !layer.isShadow ? pulseNumber(baseHealth) : undefined
        },
        HEALTH_ATTACK_X,
        TEXT_DEPTH + layer.zo,
        HEALTH_ATTACK_Y + layer.yo,
        layer.effect(baseHealth)
      )
      textHealth.name = layer.isShadow ? 'textHealthShadow' : 'textHealth'
      return { textPower, textHealth }
    })
    const textPower = texts[0].textPower

    texts[0].textPower.attach(texts[1].textPower)
    texts[0].textHealth.attach(texts[1].textHealth)

    if (hero) {
      const darkMat = new MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5
      })
      const darkener = new Mesh(getSharedPlaneBufferGeometry(), darkMat)
      darkener.renderOrder = RENDER_ORDERS.traits - 10
      darkener.position.copy(textPower.position)
      darkener.position.y -= 0.0004
      darkener.position.z -= 0.0062
      darkener.rotation.copy(textPower.rotation)
      darkener.scale.multiplyScalar(0.0048)
      textPower.parent!.add(darkener)
      const stateAnim = new AnimatedBool(
        amt => {
          const fade = lerp(HERO_ATTACK_FADED_OPACITY, 1, amt)
          darkMat.opacity = 1 - fade
          textPower!.opacity = fade
        },
        true,
        400
      )
      listenToProperty(
        matchInfoStore,
        'isPlayerTurn',
        (isPlayerTurn: boolean) =>
          (stateAnim.value = isPlayerTurn === (owner === store.player))
      )
    }
  }

  visualsRoot.traverse(obj => {
    if (obj.userData.isFrontFacing) {
      obj.visible = false
    }
  })

  return { visualsRoot, highlight, collider }
}

const CharacterAssemblage = (card: RelaxedCardInstance) => {
  return [
    ...CommonCardAssemblage(),
    new CharacterComponent(),
    new FrameStyleComponent(card.state.view.rarity),
    new CardInstanceComponent(card),
    new CardComponent()
  ]
}

export default CharacterAssemblage
