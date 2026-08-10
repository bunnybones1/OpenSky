import AssetHashManifest, {
  AssetsManifestTree,
  DummyAssetHashManifest
} from '@opensky/shared/AssetHashManifest'
import {
  AssetName,
  AssetNameStrings,
  assetPriorities,
  AssetPriority,
  assetTypes,
  assetUrls,
  isMeshAnimationAssetName,
  MeshAnimationAssetName
} from '@opensky/shared/assets'
import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { delayPromise } from '@opensky/shared/utils/async'
import { Howl, Howler, HowlOptions } from 'howler'
import {
  FileLoader,
  ImageLoader,
  IUniform,
  LinearFilter,
  LoadingManager,
  Material,
  Mesh,
  Object3D,
  ObjectLoader,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Texture,
  Uniform
} from 'three'

import { HowlWithVariations } from '~/data/AudioVariations'
import env from '~/env'
import { CompositionScene } from '~/helpers/CompositionScene'
import TextureCache from '~/helpers/TextureCache'
import queryParams from '~/queryParams'
import { html5Audio } from '~/userSettings'
import { promiseAllWithProgress } from '~/utils/asyncUtils'

import AssetLoadTask, { sortAssetLoadTasks } from './AssetLoadTask'
import { MultiFormatTextureLoader } from './MultiFormatTextureLoader'

const { ASSETS_URL } = env

/*

AssetManager Refactor
__

Goals:

[✔] Need to be able to group assets by their loading priority

[✔] Need to be able to load an individual asset

  await assetManagers.loadAsset(assetName)

[✔] Need to be able to preload assets by their priority

  await assetManagers.loadPriority(0)

[✔] Need to be able to preload all assets and respect their priorities

  await assetManagers.loadAll()

[✔] Need to know when an individual asset has been completed:

  await assetsManager.assetPending(assetName)

[✔] Need to known when a priority group has been completed

  await assetsManager.priorityPending(0)

[✔] Need to know when all assets have been completed

  await assetsManager.allPending()

*/

import {
  AudioSpriteAssetName,
  isBaseAudioSpriteAssetName,
  isMusicAssetName,
  isObject3DAssetName,
  isTextureAssetName,
  isVariationAudioSpriteAssetName,
  MusicAssetName,
  Object3DAssetName,
  TextureAssetName
} from '@opensky/shared/assets'
import { memoize } from '@opensky/shared/memoizer'
import { musicVolume, sfxVolume } from '@opensky/shared/userSettings'
import { audioLevelCurve } from '@opensky/shared/utils/math'
import { NearestFilter, Vector3 } from 'three'

import { isConquestIsland } from '~/arenaSettings'
import { GLTF } from '~/helpers/gltf'
import { GLTFLoader } from '~/helpers/GLTFLoader'
import Mesh2D from '~/meshes/Mesh2D'
// import { HowlWithVariations } from '~/data/AudioVariations'
import { unlockProp } from '~/utils/jsUtils'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { findObject3DByName } from '~/utils/threeUtils'
import { resetTransform } from '~/utils/transformUtils'

import { BasicMapMesh, PaletteMesh2D } from './MeshTypes'
import AxelCoinPostProcessor from './postProcessors/AxelCoinPostProcessor'
import CardBackPostProcessor from './postProcessors/CardBackPostProcessor'
import CarvedWallPostProcessor from './postProcessors/CarvedWallPostProcessor'
import FakeCylinderGlowPostProcessor from './postProcessors/FakeCylinderGlowPostProcessor'
import GameArmorEffectPostProcessor from './postProcessors/GameArmorEffectPostProcessor'
import GameArrowPostProcessor from './postProcessors/GameArrowPostProcessor'
import GameBoardPostProcessor from './postProcessors/GameBoardPostProcessor'
import GameHolographicGlowPostProcessor from './postProcessors/GameHolographicGlowPostProcessor'
import GamePiecesGraphicalPostProcessor from './postProcessors/GamePiecesGraphicalPostProcessor'
import GamePiecesPhysicalPostProcessor from './postProcessors/GamePiecesPhysicalPostProcessor'
import IslandPostProcessor from './postProcessors/IslandPostProcessor'
import ManaVialPostProcessor from './postProcessors/ManaVialPostProcessor'
import MeshAnimationPostProcessor from './postProcessors/MeshAnimationPostProcessor'
import PlaquePostProcessor from './postProcessors/PlaquePostProcessor'
import RepeatingTexturePostProcessor from './postProcessors/RepeatingTexturePostProcessor'
import StarterDeckPostProcessor from './postProcessors/StarterDeckPostProcessor'
import TestCentroidsPostProcessor from './postProcessors/TestCentroidsPostProcessor'
import TestLumpPostProcessor from './postProcessors/TestLumpPostProcessor'
import TutorialCubePostProcessor from './postProcessors/TutorialCubePostProcessor'
import UISmallPostProcessor from './postProcessors/UISmallPostProcessor'
import { TextureType } from './TextureType'

function persistentTexturePostProcessor(
  assetsManager: AssetsManager,
  name: AssetName,
  texture: Texture
) {
  texture.flipY = false
  getAssetsManager()
    .getTextureCache(TextureType.Default)
    .protect(assetUrls[name])
}

function persistentTexturePostProcessorNonFlipping(
  assetsManager: AssetsManager,
  name: AssetName
) {
  getAssetsManager()
    .getTextureCache(TextureType.Default)
    .protect(assetUrls[name])
}

function persistentTexturePostProcessorNonFlippingUnfiltered(
  assetsManager: AssetsManager,
  name: AssetName,
  texture: Texture
) {
  texture.flipY = false
  texture.generateMipmaps = false
  unlockProp(texture, 'magFilter')
  unlockProp(texture, 'minFilter')
  texture.magFilter = texture.minFilter = NearestFilter
  getAssetsManager()
    .getTextureCache(TextureType.Default)
    .protect(assetUrls[name])
}

function persistentTexturePostProcessorNonFlippingFiltered(
  assetsManager: AssetsManager,
  name: AssetName,
  texture: Texture
) {
  texture.flipY = false
  texture.generateMipmaps = false
  unlockProp(texture, 'magFilter')
  unlockProp(texture, 'minFilter')
  texture.magFilter = texture.minFilter = LinearFilter
  getAssetsManager()
    .getTextureCache(TextureType.Default)
    .protect(assetUrls[name])
}

function persistentRepeatingTexturePostProcessor(
  assetsManager: AssetsManager,
  name: AssetName,
  texture: Texture
) {
  RepeatingTexturePostProcessor(assetsManager, name, texture)
  persistentTexturePostProcessor(assetsManager, name, texture)
}

function musicPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  sound: Howl
) {
  musicVolume.listen(volume => sound.volume(audioLevelCurve(volume)))
}

function sfxPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  sound: Howl
) {
  sfxVolume.listen(volume => sound.volume(audioLevelCurve(volume)))
}

export const DECK_COUNTER_POSITIONS: Vector3[][] = []
for (let iz = 0; iz <= 1; iz++) {
  const arrX: Vector3[] = []
  DECK_COUNTER_POSITIONS.push(arrX)
  for (let ix = 0; ix <= 1; ix++) {
    const mx = ix * 2 - 1
    const mz = iz * 2 - 1
    if (isConquestIsland) {
      arrX.push(new Vector3(-mx * 0.2685 - 0.001, 0.005, -mz * 0.074 - 0.071))
    } else {
      arrX.push(new Vector3(-mx * 0.269 - 0.0015, 0.005, -mz * 0.0745 - 0.073))
    }
  }
}

type PostProcessCallback<K, T> = (
  assetsManager: AssetsManager,
  assetName: K,
  obj: T
) => any

const AudioSpritePostProcessors: Partial<{
  [K in Partial<AudioSpriteAssetName>]: PostProcessCallback<K, Howl>
}> = {
  audioFxCommon: sfxPostProcessor,
  audioFxTutorial: sfxPostProcessor,
  audioFxCommonVariations: sfxPostProcessor,
  audioFxCards: sfxPostProcessor,
  audioFxMatchEnd: sfxPostProcessor,
  audioFxMatchEndVariations: sfxPostProcessor
}

const Object3DPostProcessors: Partial<{
  [K in Object3DAssetName | MeshAnimationAssetName]: PostProcessCallback<
    K,
    Object3D
  >
}> = {
  uiPreloader: UISmallPostProcessor,
  gamePiecesGraphical: GamePiecesGraphicalPostProcessor,
  testCentroids: TestCentroidsPostProcessor,
  plaqueVictory: PlaquePostProcessor,
  plaqueDefeat: PlaquePostProcessor,
  carvedWall: CarvedWallPostProcessor,
  uiSmall: UISmallPostProcessor,
  cardBackArcadeum: CardBackPostProcessor,
  cardBackSkull: CardBackPostProcessor,
  cardBackScrappy: CardBackPostProcessor,
  cardBackClockwork: CardBackPostProcessor,
  cardBackReefus: CardBackPostProcessor,
  cardBackVacation: CardBackPostProcessor,
  cardBackFunGuy: CardBackPostProcessor,
  cardBackStinkyEye: CardBackPostProcessor,
  cardBackTreasureMap: CardBackPostProcessor,
  cardBackPumpkin: CardBackPostProcessor,
  cardBackArmis: CardBackPostProcessor,
  cardBackCookie: CardBackPostProcessor,
  cardBackWaterfulBalls: CardBackPostProcessor,
  cardBackPicnicCake: CardBackPostProcessor,
  cardBackMuralLotus: CardBackPostProcessor,
  cardBackMuralAri: CardBackPostProcessor,
  axel_coin: AxelCoinPostProcessor,
  fakeCylinderGlow: FakeCylinderGlowPostProcessor,
  gameArrow: GameArrowPostProcessor,
  gamePiecesPhysical: GamePiecesPhysicalPostProcessor,
  gameArmorEffect: GameArmorEffectPostProcessor,
  gameHolographicGlow: GameHolographicGlowPostProcessor,
  gameBoardBasicModel: GameBoardPostProcessor,
  gameBoardConquestModel: GameBoardPostProcessor,
  manaVial: ManaVialPostProcessor,
  starterDeckFrame: StarterDeckPostProcessor,
  islandBasicModel: IslandPostProcessor,
  islandConquest1Model: IslandPostProcessor,
  islandConquest2Model: IslandPostProcessor,
  islandConquest3Model: IslandPostProcessor,
  testLumpModel: TestLumpPostProcessor,
  tutorialCube: TutorialCubePostProcessor,
  meshAnimationAir01: MeshAnimationPostProcessor,
  meshAnimationAir02: MeshAnimationPostProcessor,
  meshAnimationAir03: MeshAnimationPostProcessor,
  meshAnimationAir09: MeshAnimationPostProcessor,
  meshAnimationAir11: MeshAnimationPostProcessor,
  meshAnimationAir14: MeshAnimationPostProcessor,
  meshAnimationAir15: MeshAnimationPostProcessor,
  meshAnimationAir16: MeshAnimationPostProcessor,
  meshAnimationAir17: MeshAnimationPostProcessor,
  meshAnimationAir18: MeshAnimationPostProcessor,
  meshAnimationAir19: MeshAnimationPostProcessor,
  meshAnimationAir20: MeshAnimationPostProcessor,
  meshAnimationAir22: MeshAnimationPostProcessor,
  meshAnimationAir23: MeshAnimationPostProcessor,
  meshAnimationAir24: MeshAnimationPostProcessor,
  meshAnimationAir25: MeshAnimationPostProcessor,
  meshAnimationEarth07: MeshAnimationPostProcessor,
  meshAnimationEarth09: MeshAnimationPostProcessor,
  meshAnimationEarth10: MeshAnimationPostProcessor,
  meshAnimationEarth11: MeshAnimationPostProcessor,
  meshAnimationEarth13: MeshAnimationPostProcessor,
  meshAnimationEnergy00: MeshAnimationPostProcessor,
  meshAnimationEnergy02: MeshAnimationPostProcessor,
  meshAnimationEnergy04: MeshAnimationPostProcessor,
  meshAnimationEnergy05: MeshAnimationPostProcessor,
  meshAnimationEnergy06: MeshAnimationPostProcessor,
  meshAnimationEnergy07: MeshAnimationPostProcessor,
  meshAnimationEnergy08: MeshAnimationPostProcessor,
  meshAnimationEnergy10: MeshAnimationPostProcessor,
  meshAnimationEnergy11: MeshAnimationPostProcessor,
  meshAnimationEnergy12: MeshAnimationPostProcessor,
  meshAnimationEnergy13: MeshAnimationPostProcessor,
  meshAnimationEnergy14: MeshAnimationPostProcessor,
  meshAnimationEnergy15: MeshAnimationPostProcessor,
  meshAnimationEnergy16: MeshAnimationPostProcessor,
  meshAnimationEnergy17: MeshAnimationPostProcessor,
  meshAnimationEnergy18: MeshAnimationPostProcessor,
  meshAnimationEnergy19: MeshAnimationPostProcessor,
  meshAnimationEnergy20: MeshAnimationPostProcessor,
  meshAnimationEnergy21: MeshAnimationPostProcessor,
  meshAnimationEnergy22: MeshAnimationPostProcessor,
  meshAnimationEnergy23: MeshAnimationPostProcessor,
  meshAnimationEnergy24: MeshAnimationPostProcessor,
  meshAnimationEnergy27: MeshAnimationPostProcessor,
  meshAnimationEnergy28: MeshAnimationPostProcessor,
  meshAnimationEnergy29: MeshAnimationPostProcessor,
  meshAnimationExplosion01: MeshAnimationPostProcessor,
  meshAnimationExplosion02: MeshAnimationPostProcessor,
  meshAnimationExplosion03: MeshAnimationPostProcessor,
  meshAnimationFire01: MeshAnimationPostProcessor,
  meshAnimationFire04: MeshAnimationPostProcessor,
  meshAnimationFire08: MeshAnimationPostProcessor,
  meshAnimationFire09: MeshAnimationPostProcessor,
  meshAnimationFire10: MeshAnimationPostProcessor,
  meshAnimationFire11: MeshAnimationPostProcessor,
  meshAnimationFire12: MeshAnimationPostProcessor,
  meshAnimationFire13: MeshAnimationPostProcessor,
  meshAnimationFire14: MeshAnimationPostProcessor,
  meshAnimationFire15: MeshAnimationPostProcessor,
  meshAnimationFire16: MeshAnimationPostProcessor,
  meshAnimationFire17: MeshAnimationPostProcessor,
  meshAnimationFire18: MeshAnimationPostProcessor,
  meshAnimationFire19: MeshAnimationPostProcessor,
  meshAnimationFire20: MeshAnimationPostProcessor,
  meshAnimationFire21: MeshAnimationPostProcessor,
  meshAnimationFire22: MeshAnimationPostProcessor,
  meshAnimationFire23: MeshAnimationPostProcessor,
  meshAnimationFire24: MeshAnimationPostProcessor,
  meshAnimationFire27: MeshAnimationPostProcessor,
  meshAnimationSmoke08: MeshAnimationPostProcessor,
  meshAnimationSmoke18: MeshAnimationPostProcessor,
  meshAnimationWater01: MeshAnimationPostProcessor,
  meshAnimationWater02: MeshAnimationPostProcessor,
  meshAnimationWater03: MeshAnimationPostProcessor,
  meshAnimationWater04: MeshAnimationPostProcessor,
  meshAnimationWater05: MeshAnimationPostProcessor,
  meshAnimationWater06: MeshAnimationPostProcessor,
  meshAnimationWater07: MeshAnimationPostProcessor,
  meshAnimationWater08: MeshAnimationPostProcessor,
  meshAnimationWater09: MeshAnimationPostProcessor,
  meshAnimationWater12: MeshAnimationPostProcessor,
  meshAnimationWater13: MeshAnimationPostProcessor,
  meshAnimationWater14: MeshAnimationPostProcessor,
  meshAnimationWater15: MeshAnimationPostProcessor,
  meshAnimationWater16: MeshAnimationPostProcessor,
  meshAnimationWater17: MeshAnimationPostProcessor,
  meshAnimationWater18: MeshAnimationPostProcessor,
  meshAnimationWater19: MeshAnimationPostProcessor,
  meshAnimationWater20: MeshAnimationPostProcessor,
  meshAnimationWater21: MeshAnimationPostProcessor,
  meshAnimationWater22: MeshAnimationPostProcessor,
  meshAnimationWater23: MeshAnimationPostProcessor,
  meshAnimationWater24: MeshAnimationPostProcessor,
  meshAnimationWater25: MeshAnimationPostProcessor,
  meshAnimationWater26: MeshAnimationPostProcessor,
  meshAnimationWater27: MeshAnimationPostProcessor,
  ground_crack: MeshAnimationPostProcessor,
  meshAnimationCrackTest: MeshAnimationPostProcessor,
  meshAnimationCrack2Test: MeshAnimationPostProcessor,
  meshAnimationShroudTest: MeshAnimationPostProcessor,
  meshAnimationShroud2Test: MeshAnimationPostProcessor,
  meshAnimationShroud3Test: MeshAnimationPostProcessor,
  meshAnimationElectricity015: MeshAnimationPostProcessor,
  meshAnimationElectricity043: MeshAnimationPostProcessor,
  meshAnimationElectricity048: MeshAnimationPostProcessor,
  meshAnimationElectricity049: MeshAnimationPostProcessor,
  meshAnimationElectricity051: MeshAnimationPostProcessor,
  meshAnimationEnergy008: MeshAnimationPostProcessor,
  meshAnimationEnergy015: MeshAnimationPostProcessor,
  meshAnimationEnergy020: MeshAnimationPostProcessor,
  meshAnimationEnergy021: MeshAnimationPostProcessor,
  meshAnimationEnergy025: MeshAnimationPostProcessor,
  meshAnimationEnergy027: MeshAnimationPostProcessor,
  meshAnimationEnergy031: MeshAnimationPostProcessor,
  meshAnimationEnergy060: MeshAnimationPostProcessor,
  meshAnimationEnergy064: MeshAnimationPostProcessor,
  meshAnimationExplosion019: MeshAnimationPostProcessor,
  meshAnimationFire001: MeshAnimationPostProcessor,
  meshAnimationFire017: MeshAnimationPostProcessor,
  meshAnimationFire026: MeshAnimationPostProcessor,
  meshAnimationFire089: MeshAnimationPostProcessor,
  meshAnimationFire107: MeshAnimationPostProcessor,
  meshAnimationFire116: MeshAnimationPostProcessor,
  meshAnimationLiquid017: MeshAnimationPostProcessor,
  meshAnimationLiquid037: MeshAnimationPostProcessor,
  meshAnimationLiquid056: MeshAnimationPostProcessor,
  meshAnimationFire119: MeshAnimationPostProcessor,
  meshAnimationSmoke002: MeshAnimationPostProcessor,
  meshAnimationSmoke004: MeshAnimationPostProcessor,
  meshAnimationSmoke012: MeshAnimationPostProcessor,
  meshAnimationSmoke016: MeshAnimationPostProcessor,
  meshAnimationSmoke022: MeshAnimationPostProcessor,
  meshAnimationSmoke026: MeshAnimationPostProcessor,
  meshAnimationSmoke027: MeshAnimationPostProcessor,
  meshAnimationSmoke031: MeshAnimationPostProcessor,
  meshAnimationSmoke041: MeshAnimationPostProcessor,
  meshAnimationSmoke064: MeshAnimationPostProcessor,
  meshAnimationSmoke066: MeshAnimationPostProcessor,
  meshAnimationSmoke068: MeshAnimationPostProcessor,
  fire_fragment_test: MeshAnimationPostProcessor,
  fire_vortex_test: MeshAnimationPostProcessor,
  fire_vortex2_test: MeshAnimationPostProcessor,
  smoke_bomb_test: MeshAnimationPostProcessor,
  fire_radial_glow_test: MeshAnimationPostProcessor,
  generic_AOE_v1: MeshAnimationPostProcessor,
  border_glint_guard: MeshAnimationPostProcessor,
  border_glint_unit: MeshAnimationPostProcessor,
  border_glint_spell: MeshAnimationPostProcessor,
  generic_trigger: MeshAnimationPostProcessor,
  water_trigger: MeshAnimationPostProcessor,
  light_trigger: MeshAnimationPostProcessor,
  fire_trigger: MeshAnimationPostProcessor,
  mind_trigger: MeshAnimationPostProcessor,
  metal_trigger: MeshAnimationPostProcessor,
  earth_trigger: MeshAnimationPostProcessor,
  knives: MeshAnimationPostProcessor,
  flames: MeshAnimationPostProcessor,
  glorious_mane: MeshAnimationPostProcessor,
  mad_vibes: MeshAnimationPostProcessor,
  glory_trigger: MeshAnimationPostProcessor,
  test_death_trigger: MeshAnimationPostProcessor,
  death_trigger_high: MeshAnimationPostProcessor,
  death_trigger_low: MeshAnimationPostProcessor,
  phoenix_plume_top: MeshAnimationPostProcessor,
  debuff_lines: MeshAnimationPostProcessor,
  hero_death_small_blast: MeshAnimationPostProcessor,
  hero_death_small_smoke: MeshAnimationPostProcessor,
  hero_death_big_black_smoke: MeshAnimationPostProcessor,
  hero_death_big_points: MeshAnimationPostProcessor,
  hero_death_big_ground_ring_3d: MeshAnimationPostProcessor,
  hero_death_big_flare: MeshAnimationPostProcessor,
  hero_death_big_clouds_A: MeshAnimationPostProcessor,
  hero_death_big_clouds_B: MeshAnimationPostProcessor,
  arrow: MeshAnimationPostProcessor,
  bite: MeshAnimationPostProcessor,
  claw: MeshAnimationPostProcessor,
  claw_impact: MeshAnimationPostProcessor,
  crow: MeshAnimationPostProcessor,
  ground_aura: MeshAnimationPostProcessor,
  siphon: MeshAnimationPostProcessor,
  stomp_impact: MeshAnimationPostProcessor,
  stomp_paw: MeshAnimationPostProcessor,
  twinkle: MeshAnimationPostProcessor,
  cog: MeshAnimationPostProcessor,
  hearts: MeshAnimationPostProcessor,
  feathers: MeshAnimationPostProcessor,
  music_notes: MeshAnimationPostProcessor,
  stealth_eye: MeshAnimationPostProcessor,
  main_shape: MeshAnimationPostProcessor,
  burst_shine: MeshAnimationPostProcessor,
  sparks: MeshAnimationPostProcessor,
  electricity: MeshAnimationPostProcessor,
  glow_bloom: MeshAnimationPostProcessor,
  card_flames: MeshAnimationPostProcessor,

  charge_up_energy_008: MeshAnimationPostProcessor,
  charge_up_energy_051: MeshAnimationPostProcessor,
  charge_up_energy_052: MeshAnimationPostProcessor,
  charge_up_energy_053: MeshAnimationPostProcessor,

  energy_tower_flames_base: MeshAnimationPostProcessor,
  energy_tower_flames_bloom: MeshAnimationPostProcessor,
  energy_tower_flames_trail: MeshAnimationPostProcessor,
  energy_tower_electricity: MeshAnimationPostProcessor,
  energy_tower_base_trail: MeshAnimationPostProcessor,

  explosion_base: MeshAnimationPostProcessor,
  explosion_bloom: MeshAnimationPostProcessor,
  explosion_poof: MeshAnimationPostProcessor,
  explosion_trace: MeshAnimationPostProcessor,

  lava_puddle_bubbles_base: MeshAnimationPostProcessor,
  lava_puddle_bubbles_trail: MeshAnimationPostProcessor,
  lava_puddle_crack: MeshAnimationPostProcessor,
  lava_puddle_embers: MeshAnimationPostProcessor,
  lava_puddle_flames_base: MeshAnimationPostProcessor,
  lava_puddle_flames_bloom: MeshAnimationPostProcessor,
  lava_puddle_flames_trace: MeshAnimationPostProcessor,
  lava_puddle_main_bubble: MeshAnimationPostProcessor,

  ada_empower_base: MeshAnimationPostProcessor,
  ada_empower_bloom: MeshAnimationPostProcessor,

  bouran_ritualize_back_flames_base: MeshAnimationPostProcessor,
  bouran_ritualize_back_flames_bloom: MeshAnimationPostProcessor,
  bouran_ritualize_circle_inner: MeshAnimationPostProcessor,
  bouran_ritualize_circle_moon_sun: MeshAnimationPostProcessor,
  bouran_ritualize_circle_outer: MeshAnimationPostProcessor,
  bouran_ritualize_embers: MeshAnimationPostProcessor,
  bouran_ritualize_front_flames_base: MeshAnimationPostProcessor,
  bouran_ritualize_front_flames_bloom: MeshAnimationPostProcessor,
  bouran_ritualize_glow: MeshAnimationPostProcessor,

  samya_teleport_base: MeshAnimationPostProcessor,
  samya_teleport_bloom: MeshAnimationPostProcessor,
  samya_teleport_dust: MeshAnimationPostProcessor,
  samya_teleport_energy: MeshAnimationPostProcessor,

  ari_fabricate_base: MeshAnimationPostProcessor,
  ari_fabricate_fill: MeshAnimationPostProcessor,

  hero_ability_trigger: MeshAnimationPostProcessor,

  lotus_petals_1: MeshAnimationPostProcessor,
  lotus_petals_2: MeshAnimationPostProcessor,
  lotus_petals_3: MeshAnimationPostProcessor,
  lotus_petals_4: MeshAnimationPostProcessor,
  lotus_petals_5: MeshAnimationPostProcessor,

  magma_chasm_base: MeshAnimationPostProcessor,
  magma_chasm_bloom: MeshAnimationPostProcessor,
  magma_chasm_bubbles: MeshAnimationPostProcessor,
  magma_chasm_burst: MeshAnimationPostProcessor,
  magma_chasm_smoke: MeshAnimationPostProcessor,

  trident_base: MeshAnimationPostProcessor,
  trident_bloom: MeshAnimationPostProcessor,

  fox_packmaster_buff: MeshAnimationPostProcessor,
  fox_packmaster_clash: MeshAnimationPostProcessor,
  fox_packmaster_fox: MeshAnimationPostProcessor,

  sitti_psychomancy_fire: MeshAnimationPostProcessor,
  sitti_psychomancy_skulls: MeshAnimationPostProcessor,
  sitti_psychomancy_smoke: MeshAnimationPostProcessor,

  titus_nurturer_energize: MeshAnimationPostProcessor,
  iris_meditation: MeshAnimationPostProcessor,
  mai_gadgeteer: MeshAnimationPostProcessor,
  zoey_live_fast: MeshAnimationPostProcessor,
  banjo_mercurial: MeshAnimationPostProcessor,

  horik_vengeance_axe: MeshAnimationPostProcessor,
  horik_vengeance_buff: MeshAnimationPostProcessor,
  horik_vengeance_impact: MeshAnimationPostProcessor,
  horik_vengeance_strike: MeshAnimationPostProcessor,
  horik_vengeance_slice: MeshAnimationPostProcessor,

  axel_glow_slide: MeshAnimationPostProcessor,
  axel_intro_flame: MeshAnimationPostProcessor,
  axel_outro_flame: MeshAnimationPostProcessor,
  axel_shine: MeshAnimationPostProcessor,
  axel_trail: MeshAnimationPostProcessor,
  axel_spectral_coins: MeshAnimationPostProcessor
}
const TexturePostProcessors: Partial<{
  [K in TextureAssetName]: PostProcessCallback<K, Texture>
}> = {
  lightCacheDaylight: persistentTexturePostProcessor,
  uvTest: persistentRepeatingTexturePostProcessor,
  smoke: persistentTexturePostProcessor,
  dayNightColorStrip: persistentTexturePostProcessorNonFlipping,
  uiPalette: persistentTexturePostProcessorNonFlippingUnfiltered,
  effectPalette: persistentTexturePostProcessorNonFlippingFiltered,
  iconPalette: persistentTexturePostProcessorNonFlippingUnfiltered,
  deckFramePalette: persistentTexturePostProcessorNonFlippingUnfiltered,
  shroudUv: persistentTexturePostProcessor,
  noise3Map: persistentRepeatingTexturePostProcessor,
  noise3dNormalizedFullMap: persistentRepeatingTexturePostProcessor,
  noiseyTriangles3dNormalizedFullMap: persistentRepeatingTexturePostProcessor,
  noiseyScales3dNormalizedFullMap: persistentRepeatingTexturePostProcessor,
  noiseyScales23dNormalizedFullMap: persistentRepeatingTexturePostProcessor,
  foilStarsMap: persistentRepeatingTexturePostProcessor,
  noise3dNormalizedHalfMap: persistentRepeatingTexturePostProcessor,
  noise3dNormalizedQuarterMap: persistentRepeatingTexturePostProcessor,
  fireEffectSourceMap: persistentRepeatingTexturePostProcessor,
  fogEffectSourceMap: persistentRepeatingTexturePostProcessor,
  layeredNoise3Map: persistentRepeatingTexturePostProcessor,
  particle: persistentTexturePostProcessor,
  particle2: persistentTexturePostProcessor,
  witherParticleSpritesheet: persistentTexturePostProcessor,
  fireSpritesheet: persistentTexturePostProcessor,
  brushStroke: persistentTexturePostProcessor,
  keywordArmorAnimation: persistentTexturePostProcessor,
  keywordBannerAnimation: persistentTexturePostProcessor,
  keywordLifestealAnimation: persistentTexturePostProcessor,
  keywordWitherAnimation: persistentTexturePostProcessor,
  sleepingAnimation: persistentTexturePostProcessor,
  damageAnimation: persistentTexturePostProcessor,
  damageFatigueAnimation: persistentTexturePostProcessor,
  triggerAnimation: persistentTexturePostProcessor,
  auraTriggerAnimation: persistentTexturePostProcessor,
  buffGenericAnimation: persistentTexturePostProcessor,
  'keyword-conjure-icon': persistentTexturePostProcessor,
  'keyword-draw-icon': persistentTexturePostProcessor,
  'trait-wither-icon': persistentTexturePostProcessor,
  'trigger-death-icon': persistentTexturePostProcessor,
  'keyword-dust-icon': persistentTexturePostProcessor,
  'trait-armor-icon': persistentTexturePostProcessor,
  'trait-banner-icon': persistentTexturePostProcessor,
  'trigger-glory-icon': persistentTexturePostProcessor,
  'trait-guard-icon': persistentTexturePostProcessor,
  'trait-lifesteal-icon': persistentTexturePostProcessor,
  'trait-stealth-icon': persistentTexturePostProcessor,
  'trigger-inspire-icon': persistentTexturePostProcessor,
  'keyword-mulligan-icon': persistentTexturePostProcessor,
  'trigger-generic-icon': persistentTexturePostProcessor,
  'trigger-sunset-icon': persistentTexturePostProcessor,
  'trigger-sunrise-icon': persistentTexturePostProcessor,
  'trait-dash-icon': persistentTexturePostProcessor,
  'trigger-slay-icon': persistentTexturePostProcessor,
  enchantmentAnima: persistentTexturePostProcessor,
  enchantmentBarrier: persistentTexturePostProcessor,
  enchantmentBlind: persistentTexturePostProcessor,
  enchantmentChains: persistentTexturePostProcessor,
  enchantmentDazed: persistentTexturePostProcessor,
  enchantmentFate: persistentTexturePostProcessor,
  enchantmentFlames: persistentTexturePostProcessor,
  enchantmentFrozen: persistentTexturePostProcessor,
  enchantmentFury: persistentTexturePostProcessor,
  enchantmentHex: persistentTexturePostProcessor,
  enchantmentLead: persistentTexturePostProcessor,
  enchantmentRoots: persistentTexturePostProcessor,
  enchantmentShield: persistentTexturePostProcessor,
  enchantmentShroud: persistentTexturePostProcessor,
  enchantmentSilence: persistentTexturePostProcessor,
  enchantmentVapors: persistentTexturePostProcessor,
  cardAspectArrow: persistentTexturePostProcessorNonFlipping,
  cardAspectArrowGreen: persistentTexturePostProcessorNonFlipping,
  uiPreviewDeath: persistentTexturePostProcessor,
  uiPreviewDust: persistentTexturePostProcessor,
  uiPreviewDraw: persistentTexturePostProcessor,
  uiPreviewMulligan: persistentTexturePostProcessor,
  uiPreviewReturnToHand: persistentTexturePostProcessor,
  uiPreviewSendToDeck: persistentTexturePostProcessor,
  uiPreviewSendToGraveyard: persistentTexturePostProcessor,
  uiPreviewSummon: persistentTexturePostProcessor,
  bgLoading: persistentTexturePostProcessor,
  spellLoading: persistentTexturePostProcessor,
  unitLoading: persistentTexturePostProcessor
}
const MusicPostProcessors: Partial<{
  [K in MusicAssetName]: PostProcessCallback<K, Howl>
}> = {
  musicGame: musicPostProcessor,
  musicVictory: musicPostProcessor,
  musicDefeat: musicPostProcessor
}

function getPostProcessor(assetName: AssetName) {
  if (isTextureAssetName(assetName)) {
    return TexturePostProcessors[assetName]
  } else if (
    isObject3DAssetName(assetName) ||
    isMeshAnimationAssetName(assetName)
  ) {
    return Object3DPostProcessors[assetName]
  } else if (isMusicAssetName(assetName)) {
    return MusicPostProcessors[assetName]
  } else if (
    isBaseAudioSpriteAssetName(assetName) ||
    isVariationAudioSpriteAssetName(assetName)
  ) {
    return AudioSpritePostProcessors[assetName]
  }
  throw new Error(`unknown type of asset for asset ${assetName}`)
}

const MAX_PARALLEL = 2

window.H = Howler
Howler.html5PoolSize = 5

type Priority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

interface AssetLoaders {
  json: (url: string) => Promise<object>
  uiPack: (url: string) => Promise<CompositionScene>
  texture: (url: string) => Promise<Texture>
  textureBig: (url: string) => Promise<Texture>
  textureSmall: (url: string) => Promise<Texture>
  textureUI: (url: string) => Promise<Texture>
  textureSmallUI: (url: string) => Promise<Texture>
  gltf: (url: string) => Promise<Object3D>
  image: (url: string) => Promise<HTMLImageElement>
  sound: (url: string) => Promise<Howl>
  soundSprite: (url: string) => Promise<Howl>
  soundSpriteVariations: (url: string) => Promise<HowlWithVariations>
  music: (url: string) => Promise<Howl>
}

const __loadingManager = new LoadingManager()
let __imageLoader: ImageLoader | undefined
function getImageLoader() {
  if (!__imageLoader) {
    __imageLoader = new ImageLoader(__loadingManager)
  }
  return __imageLoader
}
let __multiFormatTextureLoader: MultiFormatTextureLoader | undefined
function getMultiFormatTextureLoader(urlResolver: (url: string) => string) {
  if (!__multiFormatTextureLoader) {
    __multiFormatTextureLoader = new MultiFormatTextureLoader(
      __loadingManager,
      urlResolver
    )
  }
  return __multiFormatTextureLoader
}
let __fileLoader: FileLoader | undefined
function getFileLoader() {
  if (!__fileLoader) {
    __fileLoader = new FileLoader(__loadingManager)
  }
  return __fileLoader
}
let __gltfLoader: GLTFLoader | undefined
function getGltfLoader(urlResolver: (url: string) => string) {
  if (!__gltfLoader) {
    __gltfLoader = new GLTFLoader(
      __loadingManager,
      getMultiFormatTextureLoader(urlResolver),
      urlResolver
    )
  }
  return __gltfLoader!
}
let __objLoader: ObjectLoader | undefined
function getObjLoader() {
  if (!__objLoader) {
    __objLoader = new ObjectLoader(__loadingManager)
  }
  return __objLoader
}

function getProxyServerUrl() {
  const RE_PROXY_SERVER_URL = /proxyServerUrl=(.+)/gi

  const match = RE_PROXY_SERVER_URL.exec(
    window.navigator.userAgent.toLowerCase()
  )

  if (!match) {
    return null
  }

  return match[1] || null
}

interface Options {
  errorHandler: (error: any, url: string) => void
}

type PromiseResolver = (
  value?: ((v: unknown) => void) | PromiseLike<any> | undefined
) => void

enum AssetStatus {
  NotStarted,
  Pending,
  Ready
}

export class AssetsManager {
  getFileSize(basePath: string) {
    if (this.manifestData) {
      return this.manifestData.getFilesize(basePath)
    } else {
      return 0
    }
  }
  getAssetFullUrl(asset: AssetName) {
    return this.getFullUrl(assetUrls[asset])
  }
  assetsInReattemptMode = 0

  options: Options = {
    errorHandler: (err, url) => {
      throw new Error(`Could not load asset at ${url}. Reason: ${err.message}`)
    }
  }
  private _cache = new Map<string, AssetLoadTask<any>>()
  private _queue: Array<AssetLoadTask<any>> = []
  private _active: Array<AssetLoadTask<any>> = []

  private status: { [name in AssetName]: AssetStatus } = {} as any
  private assets: { [name in AssetName]: any } = {} as any
  private promises: { [name in AssetName]: Promise<any> } = {} as any
  private resolvers: { [name in AssetName]: PromiseResolver } = {} as any
  private priorities: Array<Array<AssetName>> = new Array(
    AssetPriority.None + 1
  )
    .fill(0)
    .map(() => [])

  private manifestLoadStarted = false
  manifestData: AssetHashManifest | undefined
  private _assetLoaders: AssetLoaders = {
    json: this._loadJson.bind(this),
    uiPack: this._loadUiPack.bind(this),
    texture: this._loadTexture.bind(this, TextureType.Default),
    textureBig: this._loadTexture.bind(this, TextureType.Big),
    textureSmall: this._loadTexture.bind(this, TextureType.Small),
    textureUI: this._loadTexture.bind(this, TextureType.UI),
    textureSmallUI: this._loadTexture.bind(this, TextureType.SmallUI),
    gltf: this._loadGLTF.bind(this),
    image: this._loadImage.bind(this),
    sound: this._loadSound.bind(this),
    soundSprite: this._loadSoundSprite.bind(this),
    soundSpriteVariations: this._loadSoundSpriteVariations.bind(this),
    music: this._loadMusic.bind(this)
  }

  private _currentlyLoadingTextureResolvers = new Map<
    TextureType,
    Map<string, Array<(texture: Texture) => void>>
  >()
  private _textureCaches = new Map<TextureType, TextureCache>()

  constructor(options?: Partial<Options>) {
    Object.assign(this.options, options)

    for (const assetName of AssetNameStrings) {
      const p = new Promise(resolver => {
        this.resolvers[assetName] = resolver
      })
      this.promises[assetName] = p
      p.then(() => {
        this.status[assetName] = AssetStatus.Ready
      })

      this.status[assetName] = AssetStatus.NotStarted

      this.priorities[assetPriorities[assetName]].push(assetName)
    }
  }
  changePriority(assetName: AssetName, newPriority: AssetPriority) {
    if (assetPriorities[assetName] !== newPriority) {
      removeFromArray(this.priorities[assetPriorities[assetName]], assetName)
      this.priorities[newPriority].push(assetName)
      assetPriorities[assetName] = newPriority
    }
  }
  getFullUrl = (url: string) => {
    if (url.startsWith('blob:')) {
      return url
    }
    if (this.manifestData) {
      return this.manifestData.getFullUrl(url)
    } else {
      return `${ASSETS_URL}/${url}`
    }
  }

  async priorityPending(priority: Priority): Promise<void> {
    await Promise.all(this.priorities[priority].map(key => this.promises[key]))
  }

  async allPending(): Promise<void> {
    const promises: Array<Promise<any>> = []
    for (let p = 0; p <= (AssetPriority.Game as number); p++) {
      const assetNames = this.priorities[p]
      for (const assetName of assetNames) {
        promises.push(this.promises[assetName])
      }
    }
    await Promise.all(promises)
  }

  loadAsset<T extends AssetName>(assetName: T, priority?: Priority) {
    if (priority !== undefined) {
      //@ts-ignore
      assetPriorities[assetName] = priority
    }
    const type = assetTypes[assetName]

    const postProcess:
      | ((assetsManager: AssetsManager, name: AssetName, obj: any) => void)
      | undefined = getPostProcessor(assetName)

    if (this.status[assetName] === AssetStatus.NotStarted) {
      this.status[assetName] = AssetStatus.Pending
      this.load(type, assetUrls[assetName], undefined, priority).then(asset => {
        this.assets[assetName] =
          (postProcess && postProcess(this, assetName, asset)) || asset
        this.resolvers[assetName](this.assets[assetName])
      })
    }

    return this.promises[assetName] as Promise<
      Awaited<ReturnType<AssetLoaders[(typeof assetTypes)[T]]>>
    >
  }

  getAsset<T extends AssetName>(assetName: T) {
    if (!this.assets[assetName]) {
      throw new Error(`Cannot get ${assetName}. It hasn't been loaded yet.`)
    }
    return this.assets[assetName] as Awaited<
      ReturnType<AssetLoaders[(typeof assetTypes)[T]]>
    >
  }

  maybeGetAsset<T extends AssetName>(assetName: T) {
    if (!this.assets[assetName]) {
      return undefined
    }
    return this.assets[assetName] as Awaited<
      ReturnType<AssetLoaders[(typeof assetTypes)[T]]>
    >
  }

  async loadPriority(
    priority: Priority,
    onProgress?: (ev: ProgressEvent) => void
  ): Promise<void> {
    promiseAllWithProgress(
      this.priorities[priority].map(assetName => this.loadAsset(assetName)),
      onProgress ||
        (() => {
          return
        })
    )

    await this.priorityPending(priority)
  }

  async loadAll(
    onProgress?: (ev: ProgressEvent) => void,
    additionalPromises: Array<Promise<any>> = []
  ): Promise<void> {
    const promises: Array<Promise<any>> = [...additionalPromises]
    for (const assetName of AssetNameStrings) {
      if (assetPriorities[assetName] <= AssetPriority.Game) {
        promises.push(this.promises[assetName])
      }
    }
    promiseAllWithProgress(
      promises,
      onProgress ||
        (() => {
          return
        })
    )

    for (
      let priority = 0;
      priority <= (AssetPriority.Game as number);
      priority++
    ) {
      await this.loadPriority(priority as Priority)
    }
  }

  async load<T extends keyof AssetLoaders>(
    type: T,
    url: string,
    bypassManifest = false,
    priority = 0,
    errorHandler?: (error: any, url: string) => void,
    maxLoadAttempts?: number
  ): Promise<Awaited<ReturnType<AssetLoaders[T]>>> {
    while (!bypassManifest && this.manifestData === undefined) {
      this.attemptToLoadManifest()
      await delayPromise(100)
    }
    const typeUrl = type + ':' + url
    if (this._cache.has(typeUrl)) {
      return this._cache.get(typeUrl)?.finished
    }

    const t = new AssetLoadTask(
      this,
      this._assetLoaders[type],
      url,
      priority,
      errorHandler || this.options.errorHandler,
      maxLoadAttempts
    )
    this._queue.push(t)
    this._cache.set(typeUrl, t)
    this._bumpQueue()
    return t.finished as Promise<Awaited<ReturnType<AssetLoaders[T]>>>
  }

  getTextureCache(type: TextureType) {
    if (!this._textureCaches.has(type)) {
      this._textureCaches.set(type, new TextureCache())
    }
    return this._textureCaches.get(type)!
  }
  getCurrentlyLoadingTextureResolvers(type: TextureType) {
    if (!this._currentlyLoadingTextureResolvers.has(type)) {
      this._currentlyLoadingTextureResolvers.set(type, new Map())
    }
    return this._currentlyLoadingTextureResolvers.get(type)!
  }
  private async _bumpQueue() {
    if (this._queue.length > 0 && this._active.length < MAX_PARALLEL) {
      this._queue.sort(sortAssetLoadTasks)
      const p = this._queue.shift()!
      this._active.push(p)
      await p.attempt()
      removeFromArray(this._active, p)
      if (!p.success && !p.definitelyFailed) {
        this._queue.push(p)
      }
      this._bumpQueue()
    }
  }
  private attemptToLoadManifest() {
    if (!this.manifestLoadStarted) {
      this.manifestLoadStarted = true
      this.actuallyLoadManifest()
    }
  }
  private async actuallyLoadManifest() {
    const proxyServerUrl = getProxyServerUrl()

    const urlPrefix = !!proxyServerUrl
      ? `${proxyServerUrl}?path=${env.ASSETS_URL}`
      : ASSETS_URL

    if (env.ASSETS_MANIFEST_GAME_HASH && !queryParams.assetsDirect) {
      this.manifestData = new AssetHashManifest(
        urlPrefix,
        (await this.load(
          'json',
          `asset-manifests/assets-manifest.game.tree.${env.ASSETS_MANIFEST_GAME_HASH}.json`,
          true
        )) as AssetsManifestTree
      )
    } else {
      this.manifestData = new DummyAssetHashManifest(urlPrefix)
      console.warn(
        'Not using manifest. File paths will be taken at face value.'
      )
    }
  }

  private _loadJson(url: string): Promise<object> {
    return new Promise<object>((resolve, reject) =>
      getFileLoader().load(
        this.getFullUrl(url),
        fileContents => resolve(JSON.parse(fileContents as string) as object),
        undefined,
        reject
      )
    )
  }

  private _loadGLTF(url: string): Promise<Object3D> {
    return new Promise<Object3D>(
      (resolve: (value: Object3D) => void, reject: (reason: any) => void) => {
        const onLoad = (gltf: GLTF) => {
          resolve(gltf.scene)
        }
        const loader = getGltfLoader(this.getFullUrl)
        loader.load(url, onLoad, undefined, reject)
      }
    )
  }

  private _loadPack<T>(url: string, PackClass: any): Promise<T> {
    return new Promise<T>(
      (resolve: (value: T) => void, reject: (reason: any) => void) => {
        function onLoad(obj: Object3D) {
          if (obj instanceof Scene) {
            resolve(new PackClass(obj) as T)
          } else {
            throw new Error('Root object is not a Scene')
          }
        }
        getObjLoader().load(this.getFullUrl(url), onLoad, undefined, reject)
      }
    )
  }

  private async _loadUiPack(url: string): Promise<CompositionScene> {
    const pack = await this._loadPack<CompositionScene>(url, CompositionScene)
    await this._loadPackTextures([pack.scene], `game/ui`)
    return pack
  }

  private async _loadPackTextures(scenes: Scene[], basePath: string) {
    const uniformsThatNeedTextures = new Map<string, IUniform[]>()
    for (const scene of scenes) {
      scene.traverse(o => {
        if (o instanceof Mesh && o.material instanceof ShaderMaterial) {
          const key = o.material.userData['uniform-mapTexture'] as string
          const unis = o.material.uniforms
          if (!uniformsThatNeedTextures.has(key)) {
            uniformsThatNeedTextures.set(key, [unis.mapTexture])
          } else {
            uniformsThatNeedTextures.get(key)!.push(unis.mapTexture)
          }
          if (unis.nineSliceXPadding) {
            unis.nineSliceXPadding.value.x *= 0.5
            unis.nineSliceXPadding.value.w *= 0.5
          }
          if (unis.nineSliceYPadding) {
            unis.nineSliceYPadding.value.x *= 0.5
            unis.nineSliceYPadding.value.w *= 0.5
          }
        }
      })
    }
    const keys = Array.from(uniformsThatNeedTextures.keys())
    const uniforms = Array.from(uniformsThatNeedTextures.values())
    for (let i = 0; i < keys.length; i++) {
      const url = `${basePath}/${keys[i]}`
      const texture = (await this.load('texture', url)) as Texture
      this.getTextureCache(TextureType.Default)!.protect(url)
      safelyResetFlipY(texture)
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      texture.generateMipmaps = false
      texture.minFilter = LinearFilter
      texture.magFilter = LinearFilter

      for (const uniform of uniforms[i]) {
        uniform.value = texture
      }
    }
  }

  private async _loadTexture(
    type: TextureType = TextureType.Default,
    url: string
  ): Promise<Texture> {
    let promise: Promise<Texture>
    const texCache = this.getTextureCache(type)
    const cltr = this.getCurrentlyLoadingTextureResolvers(type)
    if (texCache.hasTexture(url)) {
      return texCache.getTexture(url)
    } else if (cltr.has(url)) {
      promise = new Promise<Texture>(resolve => {
        cltr.get(url)!.push(resolve)
      })
    } else {
      promise = new Promise<Texture>((resolve, reject) => {
        cltr.set(url, [resolve])
        const onLoad = (texture: Texture) => {
          // texture.needsUpdate = true
          texture.name = url
          // texture.encoding = sRGBEncoding
          texCache!.setTexture(url, texture)
          // XXX Using this filter to get rid of NPOT warnings, is not best quality fix later
          // texture.minFilter = NearestFilter
          // texture.magFilter = NearestFilter
          cltr.get(url)!.forEach(resolve => resolve(texture))
          cltr.delete(url)
        }
        const onError = (reason: any) => {
          reject(reason)
          cltr.delete(url)
        }
        getMultiFormatTextureLoader(this.getFullUrl.bind(this)).load(
          url,
          onLoad,
          undefined,
          onError,
          type
        )
      })
    }
    return promise
  }

  private _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      getImageLoader().load(this.getFullUrl(url), resolve, undefined, reject)
    })
  }

  private _loadSound(url: string): Promise<Howl> {
    return Promise.resolve(
      new Howl({ src: this.getFullUrl(url), html5: html5Audio.value })
    )
  }

  private async _loadSoundSprite(url: string): Promise<Howl> {
    const config = (await this._loadJson(url)) as HowlOptions & {
      urls: string[]
    }

    const urls = config.urls.map(url => this.getFullUrl(url))

    const howl = new Howl({ ...config, src: urls })

    return new Promise(resolve => {
      howl.on('load', () => resolve(howl))
    })
  }

  private async _loadSoundSpriteVariations(
    url: string
  ): Promise<HowlWithVariations> {
    const config = (await this._loadJson(url)) as HowlOptions & {
      urls: string[]
    } & { variations: { [index: string]: number } }

    const urls = (config.urls as string[]).map(url => this.getFullUrl(url))

    const howl = new Howl({ ...config, src: urls })

    const withVariations: HowlWithVariations = howl as any
    withVariations.variations = config.variations

    return new Promise(resolve => {
      howl.on('load', () => resolve(withVariations))
    })
  }

  private _loadMusic(url: string): Promise<Howl> {
    return Promise.resolve(
      new Howl({
        src: this.getFullUrl(url),
        html5: html5Audio.value,
        loop: true
      })
    )
  }

  getLazyTextureAssetUniform(name: TextureAssetName) {
    const uniform = new Uniform(getTempTexture())
    const loadTex = async () => {
      await this.loadAsset(name)
      const tex = getAssetsManager().getAsset(name)
      uniform.value = tex
    }
    loadTex()
    return uniform
  }

  getLazyTextureUrlUniform(url: string) {
    const uniform = new Uniform(getTempTexture())
    this.load('texture', url).then(texture => {
      uniform.value = texture
      RepeatingTexturePostProcessor(this, '', texture)
      // persistentTexturePostProcessor('', texture)
      texture.flipY = false
    })
    return uniform
  }

  fetchProtoMesh(collectionName: Object3DAssetName, objName: string) {
    if (!__cache.has(collectionName)) {
      __cache.set(collectionName, new Map<string, Object3D>())
    }
    const subCache = __cache.get(collectionName)!
    if (!subCache.has(objName)) {
      const obj3D = this.getAsset(collectionName)
      if (obj3D.type === 'Object3D' || obj3D.type === 'Group') {
        const protoVis = findObject3DByName(
          this.getAsset(collectionName) as Object3D,
          objName
        )
        // protoVis.position.set(0, 0, 0)
        // protoVis.rotation.set(0, 0, 0)
        // protoVis.scale.set(1, 1, 1)
        subCache.set(objName, protoVis)
      } else {
        console.error('Not Object3D:', obj3D)
        throw new Error(
          `Asset ${collectionName} ${objName} is not an Object3D.`
        )
      }
    }
    return subCache.get(objName)!
  }

  fetchMeshDeepClone(
    collectionName: 'uiSmall' | 'uiPreloader',
    objName: string,
    uniqueMaterial?: boolean,
    resetTransforms?: boolean
  ): PaletteMesh2D
  fetchMeshDeepClone(
    collectionName: 'starterDeckFrame',
    objName: string,
    uniqueMaterial?: boolean,
    resetTransforms?: boolean
  ): BasicMapMesh
  fetchMeshDeepClone(
    collectionName: 'manaVial',
    objName: string,
    uniqueMaterial?: boolean,
    resetTransforms?: boolean
  ): Mesh2D
  fetchMeshDeepClone(
    collectionName: Object3DAssetName,
    objName: string,
    uniqueMaterial?: boolean,
    resetTransforms?: boolean
  ): Object3D
  fetchMeshDeepClone(
    collectionName: Object3DAssetName,
    objName: string,
    uniqueMaterial = false,
    resetTransforms = false
  ) {
    const mesh = this.fetchProtoMesh(collectionName, objName)
    const obj = mesh.clone(true)
    obj.name = objName
    if (
      uniqueMaterial &&
      obj instanceof Mesh &&
      obj.material instanceof Material
    ) {
      obj.material = obj.material.clone()
    }
    if (resetTransforms) {
      resetTransform(obj)
    }
    return obj
  }
}

export const getAssetsManager = memoize(() => new AssetsManager())

const __cache = new Map<string, Map<string, Object3D>>()
