import { Object3DAssetName } from '@opensky/shared/assets'
import { CardBack } from '@opensky/shared/constants'
import { cardBacks } from '@opensky/shared/cosmetics_data'
import { Player } from '@skyweaver/state-metadata'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets/index'
import { debugAccounts } from '~/debugAccounts'
import { accountsStore } from '~/state/AccountStore'
import { storeHelper } from '~/state/index'

export function getCardBack(player: Player): CardBack | null {
  const accounts = storeHelper.useFakeStoreData
    ? debugAccounts
    : accountsStore.accounts
  if (accounts) {
    return (
      cardBacks.find(s => accounts[player].deckEquipment?.cardBack == s.id) ||
      null
    )
  }
  return null
}
const cardBackLookup: { [K: string]: Object3DAssetName } = {
  'cardback-pablo-01': 'cardBackSkull',
  'cardback-pablo-02': 'cardBackFairy',
  'cardback-pablo-03': 'cardBackArcadeum',
  'cardback-pablo-06': 'cardBackScrappy',
  'cardback-pablo-04': 'cardBackClockwork',
  'cardback-pablo-05': 'cardBackReefus',
  'cardback-pablo-12': 'cardBackVacation',
  'cardback-giaco-01': 'cardBackFunGuy',
  'cardback-pablo-08': 'cardBackStinkyEye',
  'cardback-gname-01': 'cardBackTreasureMap',
  'cardback-pablo-07': 'cardBackPumpkin',
  'cardback-mara-03': 'cardBackArmis',
  'cardback-mara-02': 'cardBackCookie',
  'cardback-mara-06': 'cardBackWaterfulBalls',
  'cardback-gname-02': 'cardBackPicnicCake',
  'cardback-mara-07': 'cardBackMuralLotus',
  'cardback-mara-09': 'cardBackMuralAri'
}
function getCardBackAssetName(artID: string): Object3DAssetName {
  if (artID in cardBackLookup) {
    return cardBackLookup[artID]
  }
  throw new Error('unknown cardback')
}

export function possiblyGetCardBackMesh(
  cardBack: CardBack | null
): Promise<Object3D> | undefined {
  if (cardBack) {
    return getCardBackMesh(cardBack)
  } else {
    return undefined
  }
}

export async function getCardBackMesh(cardBack: CardBack): Promise<Object3D> {
  const cardBackAssetName = getCardBackAssetName(cardBack.artID)
  const asset = await getAssetsManager().loadAsset(cardBackAssetName)

  const edgeMesh = asset.children.find(
    child => child.name === 'card-back-edge-only'
  )
    ? asset.children
        .find(child => child.name === 'card-back-edge-only')!
        .clone()
    : asset.children[0].clone()

  const fullMesh = asset.children.find(child => child.name === 'card-back')
    ? asset.children.find(child => child.name === 'card-back')!.clone()
    : asset.children[0].clone()

  const flatMesh = asset.children.find(child => child.name === 'card-back-flat')
    ? asset.children.find(child => child.name === 'card-back-flat')!.clone()
    : asset.children[0].clone()

  const pivot = new Object3D()

  pivot.name = 'card-back-pivot'
  pivot.scale.multiplyScalar(0.0112)
  pivot.position.set(0, -0.0, -0.0021)
  pivot.rotation.set(0, 0, Math.PI)
  pivot.add(fullMesh)
  pivot.add(flatMesh)
  pivot.add(edgeMesh)
  flatMesh.visible = false
  edgeMesh.visible = false

  return pivot
}
