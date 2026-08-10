import { MeshAnimationAssetName } from '@opensky/shared/assets'
import { DEGREES_TO_RADIANS } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import {
  BufferGeometry,
  Euler,
  Matrix4,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer
} from 'three'

import { getAssetsManager } from '~/assets'
import { atmosphereColorForIsland } from '~/colors/colorLibrary'
import ZPaletteMappedMeshMaterial, {
  ZPaletteShaderOptions
} from '~/materials/ZPaletteMappedMeshMaterial'
import { scene } from '~/scenes/arena/scene'
import { Easing } from '~/systems/animation/Easing'
import { MeshEffect } from '~/systems/animation/meshAnimationTypes'
import { AnimatedObject, CompleteStatus } from '~/systems/animation/RawTweener'
import { TargetTransform } from '~/systems/animation/transform'
import { simpleTweener } from '~/systems/animation/tweeners'
import { cameraShaker } from '~/utils/cameraShaker'
import { padLeadingZeros } from '~/utils/stringUtils'
import {
  findObject3DsWhoseNamesInclude,
  removeFromParent
} from '~/utils/threeUtils'
import { copyTransform } from '~/utils/transformUtils'

const __mat = new Matrix4()
const __mat2 = new Matrix4()
export const paletteRangeMapperLibrary: Map<MeshAnimationAssetName, Vector3> =
  new Map()

paletteRangeMapperLibrary.set('meshAnimationSmoke08', new Vector3(0, 1.3, 0))
paletteRangeMapperLibrary.set('meshAnimationWater22', new Vector3(0, 1.1, 0))
paletteRangeMapperLibrary.set('meshAnimationEnergy08', new Vector3(0, 1, -0.5))
paletteRangeMapperLibrary.set('meshAnimationEnergy14', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationFire119', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationFire27', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationCrackTest', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationCrack2Test', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationSmoke18', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationAir16', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationFire026', new Vector3(0, 1.1, 0))
paletteRangeMapperLibrary.set('meshAnimationFire017', new Vector3(0, 1.1, 0))
paletteRangeMapperLibrary.set('fire_radial_glow_test', new Vector3(0, 1, 0))
paletteRangeMapperLibrary.set('meshAnimationFire107', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('meshAnimationFire001', new Vector3(0, 1, 0))
paletteRangeMapperLibrary.set('meshAnimationLiquid056', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('ground_crack', new Vector3(0, 1.2, 0))
paletteRangeMapperLibrary.set('stomp_paw', new Vector3(0, 1.2, 0))

export const basicZPaletteMaterialOptions: ZPaletteShaderOptions = {
  paletteMap: 'effectPalette',
  paletteMapRowCount: 256,
  paletteMapRow: 0,
  paletteRangeMapper: new Vector3(0, 1, 0),
  screenSpace: true,
  paletteMapRowAnimLength: 0,
  paletteMapRowAnimDuration: 5
}

export class MeshPaletteEffect {
  constructor(
    public effect: MeshEffect,
    public paletteAnim: AnimatedObject<any>
  ) {
    //
  }
}

const frameGeometryLibrary: Map<MeshAnimationAssetName, BufferGeometry[]> =
  new Map()

const pendingEffectLoaders: Map<
  MeshAnimationAssetName,
  Promise<any>
> = new Map()

class PaletteSettings {
  get row(): number {
    return this._row
  }
  set row(value: number) {
    this._row = value
  }
  constructor(
    protected _row: number,
    public animRows = 0,
    public animDuration = 1
  ) {
    //
  }
}

export const dayOrNight = {
  night: false
}

class DayNightPaletteSettings extends PaletteSettings {
  get row(): number {
    return dayOrNight.night ? this.rowNight : this.rowDay
  }
  set row(value: number) {
    this._row = value
  }

  constructor(
    private rowDay: number,
    private rowNight: number,
    animRows = 0,
    animDuration = 1
  ) {
    super(0, animRows, animDuration)
  }
}

export const paletteLibrary = {
  fire: new PaletteSettings(0),
  water: new PaletteSettings(1),
  light: new PaletteSettings(2),
  mind: new PaletteSettings(3),
  air: new PaletteSettings(4),
  earth: new PaletteSettings(5),
  metal: new PaletteSettings(6),
  dark: new PaletteSettings(7),
  sky: new PaletteSettings(8),
  crackedFloor: new PaletteSettings(9),
  crackedSandstone: new PaletteSettings(14),
  fire2: new PaletteSettings(10),
  water2: new PaletteSettings(11),
  light2: new PaletteSettings(12),
  mind2: new PaletteSettings(13),
  earth2: new PaletteSettings(15),
  metal2: new PaletteSettings(16),

  poison: new PaletteSettings(18),
  lightning: new PaletteSettings(19),
  fadedPurple: new PaletteSettings(20),
  cyan: new PaletteSettings(21),
  teal: new PaletteSettings(22),
  lightClay: new PaletteSettings(23),
  shimmerFire: new PaletteSettings(24),

  glory: new PaletteSettings(25),
  grave: new PaletteSettings(26),
  death_trigger_high: new PaletteSettings(27),
  death_trigger_low: new PaletteSettings(28),
  slay_trigger: new PaletteSettings(29),

  air_mane: new PaletteSettings(30),
  light_mane: new PaletteSettings(31),
  earth_mane: new PaletteSettings(32),
  mind_mane: new PaletteSettings(33),
  fire_mane: new PaletteSettings(34),
  metal_mane: new PaletteSettings(35),
  water_mane: new PaletteSettings(36),
  dark_mane: new PaletteSettings(37),

  blight: new PaletteSettings(38),

  AoE_explosion: new PaletteSettings(39),

  hex: new PaletteSettings(40),

  hero_death_small_blast: new PaletteSettings(41, 3, 2),
  ice: new PaletteSettings(44),
  hero_death_small_smoke: new PaletteSettings(45),

  hero_death_big_black_smoke: new PaletteSettings(46),
  hero_death_big_points: new PaletteSettings(47),
  hero_death_big_ground_ring: new PaletteSettings(48),
  hero_death_big_clouds_B: new PaletteSettings(49),
  hero_death_big_flare: new PaletteSettings(50),
  hero_death_big_clouds_A: new PaletteSettings(52, 3, 4),
  bite_mulch: new PaletteSettings(51),
  transparent_air: new PaletteSettings(55),
  bite_original: new PaletteSettings(56),
  crow_original: new PaletteSettings(57),
  crow_brood: new PaletteSettings(58),
  food_chain: new PaletteSettings(59),
  cog: new PaletteSettings(60),
  feathers: new PaletteSettings(61),
  cog_dmg: new PaletteSettings(62),
  music_light: new PaletteSettings(63),
  hearts: new PaletteSettings(64),
  music_earth: new PaletteSettings(65),
  stealth_eye_original: new PaletteSettings(66),
  stealth_eye_improved: new PaletteSettings(67),

  main_shape_base: new PaletteSettings(68),
  main_shape_silver: new PaletteSettings(69),
  main_shape_gold: new PaletteSettings(70),
  burst_shine_silver: new PaletteSettings(71),
  burst_shine_gold: new PaletteSettings(72),
  sparks_silver: new PaletteSettings(73),
  sparks_gold: new PaletteSettings(74),
  electricity_silver: new PaletteSettings(75),
  electricity_gold: new PaletteSettings(76),
  glow_bloom_gold: new PaletteSettings(77),
  card_flames_gold: new PaletteSettings(78),

  energy_tower_flames_base: new PaletteSettings(79),
  energy_tower_flames_bloom: new PaletteSettings(80),
  energy_tower_flames_trail: new PaletteSettings(81),
  energy_tower_base_trail: new PaletteSettings(82),
  energy_tower_electricity: new PaletteSettings(83),

  explosion_base: new PaletteSettings(84),
  explosion_trace: new PaletteSettings(85),
  explosion_bloom: new PaletteSettings(86),
  explosion_poof: new PaletteSettings(87),

  lava_puddle_bubbles_base: new PaletteSettings(92),
  lava_puddle_bubbles_trail: new PaletteSettings(93),
  lava_puddle_crack: new PaletteSettings(88),
  lava_puddle_embers: new PaletteSettings(88),
  lava_puddle_flames_base: new PaletteSettings(91),
  lava_puddle_flames_bloom: new PaletteSettings(90),
  lava_puddle_flames_trace: new PaletteSettings(89),
  lava_puddle_main_bubble: new PaletteSettings(88),

  lava_puddle_main_bubble_poison: new PaletteSettings(94),
  lava_puddle_bubbles_base_poison: new PaletteSettings(99),
  explosion_poof_poison: new PaletteSettings(100),
  lava_puddle_bubbles_trail_poison: new PaletteSettings(95),
  lava_puddle_flames_trace_poison: new PaletteSettings(96),
  lava_puddle_flames_bloom_poison: new PaletteSettings(97),
  lava_puddle_flames_base_poison: new PaletteSettings(98),

  ada_empower_base: new PaletteSettings(101),
  ada_empower_bloom: new PaletteSettings(90),

  bouran_ritualize_flames_base: new PaletteSettings(102),
  bouran_ritualize_flames_bloom: new PaletteSettings(103),
  bouran_ritualize_glow: new PaletteSettings(103),
  bouran_ritualize_embers: new PaletteSettings(104),
  bouran_ritualize_circle: new PaletteSettings(106),

  samya_teleport_base: new PaletteSettings(101),
  samya_teleport_bloom: new PaletteSettings(107),
  samya_teleport_dust: new PaletteSettings(109),
  samya_teleport_energy: new PaletteSettings(108),

  ari_fabricate_base: new PaletteSettings(110),
  ari_fabricate_fill: new PaletteSettings(111),

  hero_ability_trigger: new PaletteSettings(112),
  lotus_petals: new PaletteSettings(113),

  magma_chasm_base: new PaletteSettings(114),
  magma_chasm_bloom: new PaletteSettings(115),
  magma_chasm_bubbles: new PaletteSettings(114),
  magma_chasm_burst: new PaletteSettings(116),
  magma_chasm_smoke: new PaletteSettings(117),

  trident_base: new PaletteSettings(118),
  trident_bloom: new PaletteSettings(119),

  fox_packmaster_buff: new PaletteSettings(121),
  fox_packmaster_clash: new PaletteSettings(120),
  fox_packmaster_fox: new PaletteSettings(120),

  sitti_psychomancy_fire: new PaletteSettings(125),
  sitti_psychomancy_skulls: new PaletteSettings(126),
  sitti_psychomancy_smoke: new PaletteSettings(127),

  horik_vengeance_axe: new PaletteSettings(129),
  horik_vengeance_buff: new PaletteSettings(130),
  horik_vengeance_impact: new PaletteSettings(133),
  horik_vengeance_strike: new PaletteSettings(132),
  horik_vengeance_slice: new PaletteSettings(131),

  titus_nurturer_energize: new PaletteSettings(122),
  iris_meditation: new PaletteSettings(124),
  mai_gadgeteer: new PaletteSettings(123),
  zoey_live_fast: new PaletteSettings(16),
  banjo_mercurial: new PaletteSettings(128),

  axel_glow_slide: new PaletteSettings(134),
  axel_intro_flame: new PaletteSettings(136),
  axel_outro_flame: new PaletteSettings(136),
  axel_shine: new PaletteSettings(134),
  axel_trail: new PaletteSettings(135),
  axel_spectral_coins: new PaletteSettings(137),

  // rainbow2: new PaletteSettings(21),
  // smoldering: new PaletteSettings(23, 8, 3),
  dayNightTest: new DayNightPaletteSettings(0, 1)
} as const
export type PaletteName = keyof typeof paletteLibrary

export class EffectSettings {
  constructor(
    public meshName: MeshAnimationAssetName,
    public paletteName: PaletteName,
    public description?: string
  ) {
    //
  }
}
export const effectLibrary = {
  darkStreak_MSA: new EffectSettings(
    'meshAnimationEnergy16',
    'dark',
    'animation for Scythe Mantis inspire'
  ),
  clawSwipe_MSA: new EffectSettings(
    'meshAnimationEnergy020',
    'teal',
    'animation for Claw Swipe'
  ),
  airRadialBlip_MSA: new EffectSettings(
    'meshAnimationEnergy025',
    'air',
    'animation for Speed Boots'
  ),
  knives_MSA: new EffectSettings('knives', 'air'),
  fire_plume_MSA: new EffectSettings('phoenix_plume_top', 'fire2'),
  magicWhisp_MSA: new EffectSettings(
    'meshAnimationEnergy027',
    'light',
    'animation for Gift of Qai + Fun Guy'
  ),
  poisonCloud_MSA: new EffectSettings(
    'meshAnimationExplosion019',
    'poison',
    'animation for Vile Vial'
  ),
  flames_MSA: new EffectSettings(
    'flames',
    'fire2',
    'animation for cards receiving damage from Flames on Sunrise'
  ),

  hero_death_small_blast_MSA: new EffectSettings(
    'hero_death_small_blast',
    'hero_death_small_blast'
  ),
  hero_death_small_smoke_MSA: new EffectSettings(
    'hero_death_small_smoke',
    'hero_death_small_smoke'
  ),

  hero_death_big_black_smoke_MSA: new EffectSettings(
    'hero_death_big_black_smoke',
    'hero_death_big_black_smoke'
  ),
  hero_death_big_points_MSA: new EffectSettings(
    'hero_death_big_points',
    'hero_death_big_points'
  ),
  hero_death_big_ground_ring_3d_MSA: new EffectSettings(
    'hero_death_big_ground_ring_3d',
    'hero_death_big_ground_ring'
  ),
  hero_death_big_flare_MSA: new EffectSettings(
    'hero_death_big_flare',
    'hero_death_big_flare'
  ),
  hero_death_big_clouds_A_MSA: new EffectSettings(
    'hero_death_big_clouds_A',
    'hero_death_big_clouds_A'
  ),
  hero_death_big_clouds_B_MSA: new EffectSettings(
    'hero_death_big_clouds_B',
    'hero_death_big_clouds_B'
  ),

  basicCrack_MSA: new EffectSettings('ground_crack', 'crackedFloor'),
  conquestCrack_MSA: new EffectSettings('ground_crack', 'crackedSandstone'),

  generic_trigger_MSA: new EffectSettings('meshAnimationEnergy060', 'air'),
  water_trigger_MSA: new EffectSettings('water_trigger', 'water2'),
  light_trigger_MSA: new EffectSettings('light_trigger', 'light'),
  fire_trigger_MSA: new EffectSettings('fire_trigger', 'fire2'),
  mind_trigger_MSA: new EffectSettings('mind_trigger', 'mind2'),
  metal_trigger_MSA: new EffectSettings('metal_trigger', 'metal2'),
  earth_trigger_MSA: new EffectSettings('earth_trigger', 'earth2'),
  glorious_mane_MSA: new EffectSettings('glorious_mane', 'earth2'),
  mad_vibes_MSA: new EffectSettings('mad_vibes', 'mind2'),
  glory_trigger_MSA: new EffectSettings('glory_trigger', 'glory'),
  death_trigger_high_MSA: new EffectSettings(
    'death_trigger_high',
    'death_trigger_high'
  ),
  death_trigger_low_MSA: new EffectSettings(
    'death_trigger_low',
    'death_trigger_low'
  ),
  slay_trigger_MSA: new EffectSettings('slay_trigger', 'slay_trigger'),

  debuff_lines_MSA: new EffectSettings('debuff_lines', 'air_mane'),

  arrow_MSA: new EffectSettings('arrow', 'ice'),
  bite_MSA: new EffectSettings('bite', 'hex'),
  claw_MSA: new EffectSettings('claw', 'hex'),
  claw_impact_MSA: new EffectSettings('claw_impact', 'hex'),
  crow_MSA: new EffectSettings('crow', 'crow_original'),
  ground_aura_MSA: new EffectSettings('ground_aura', 'hex'),
  siphon_MSA: new EffectSettings('siphon', 'hex'),
  stomp_paw_MSA: new EffectSettings('stomp_paw', 'hex'),
  stomp_impact_MSA: new EffectSettings('stomp_impact', 'hex'),
  twinkle_MSA: new EffectSettings('twinkle', 'hex'),

  cog_MSA: new EffectSettings('cog', 'cog'),
  feathers_MSA: new EffectSettings('feathers', 'feathers'),
  hearts_MSA: new EffectSettings('hearts', 'hearts'),
  music_notes_MSA: new EffectSettings('music_notes', 'ice'),
  stealth_eye_MSA: new EffectSettings('stealth_eye', 'stealth_eye_improved'),

  border_glint_guard_MSA: new EffectSettings(
    'border_glint_guard',
    'light_mane'
  ),
  border_glint_unit_MSA: new EffectSettings('border_glint_unit', 'light_mane'),
  border_glint_spell_MSA: new EffectSettings(
    'border_glint_spell',
    'light_mane'
  ),

  main_shape_base_MSA: new EffectSettings('main_shape', 'main_shape_base'),
  main_shape_silver_MSA: new EffectSettings('main_shape', 'main_shape_silver'),
  main_shape_gold_MSA: new EffectSettings('main_shape', 'main_shape_gold'),
  burst_shine_silver_MSA: new EffectSettings(
    'burst_shine',
    'burst_shine_silver'
  ),
  burst_shine_gold_MSA: new EffectSettings('burst_shine', 'burst_shine_gold'),
  sparks_silver_MSA: new EffectSettings('sparks', 'sparks_silver'),
  sparks_gold_MSA: new EffectSettings('sparks', 'sparks_gold'),
  electricity_silver_MSA: new EffectSettings(
    'electricity',
    'electricity_silver'
  ),
  electricity_gold_MSA: new EffectSettings('electricity', 'electricity_gold'),
  glow_bloom_gold_MSA: new EffectSettings('glow_bloom', 'glow_bloom_gold'),
  card_flames_gold_MSA: new EffectSettings('card_flames', 'card_flames_gold'),

  charge_up_energy_008_MSA: new EffectSettings('charge_up_energy_008', 'ice'),
  charge_up_energy_051_MSA: new EffectSettings('charge_up_energy_051', 'ice'),
  charge_up_energy_052_MSA: new EffectSettings('charge_up_energy_052', 'ice'),
  charge_up_energy_053_MSA: new EffectSettings('charge_up_energy_053', 'ice'),

  energy_tower_flames_base_MSA: new EffectSettings(
    'energy_tower_flames_base',
    'energy_tower_flames_base'
  ),
  energy_tower_flames_bloom_MSA: new EffectSettings(
    'energy_tower_flames_bloom',
    'energy_tower_flames_bloom'
  ),
  energy_tower_flames_trail_MSA: new EffectSettings(
    'energy_tower_flames_trail',
    'energy_tower_flames_trail'
  ),
  energy_tower_electricity_MSA: new EffectSettings(
    'energy_tower_electricity',
    'energy_tower_electricity'
  ),
  energy_tower_base_trail_MSA: new EffectSettings(
    'energy_tower_base_trail',
    'energy_tower_base_trail'
  ),

  explosion_base_MSA: new EffectSettings('explosion_base', 'explosion_base'),
  explosion_trace_MSA: new EffectSettings('explosion_trace', 'explosion_trace'),
  explosion_bloom_MSA: new EffectSettings('explosion_bloom', 'explosion_bloom'),
  explosion_poof_MSA: new EffectSettings('explosion_poof', 'explosion_poof'),

  lava_puddle_bubbles_base_MSA: new EffectSettings(
    'lava_puddle_bubbles_base',
    'lava_puddle_bubbles_base'
  ),
  lava_puddle_bubbles_trail_MSA: new EffectSettings(
    'lava_puddle_bubbles_trail',
    'lava_puddle_bubbles_trail'
  ),
  lava_puddle_crack_MSA: new EffectSettings(
    'lava_puddle_crack',
    'lava_puddle_crack'
  ),
  lava_puddle_embers_MSA: new EffectSettings(
    'lava_puddle_embers',
    'lava_puddle_embers'
  ),
  lava_puddle_flames_base_MSA: new EffectSettings(
    'lava_puddle_flames_base',
    'lava_puddle_flames_base'
  ),
  lava_puddle_flames_bloom_MSA: new EffectSettings(
    'lava_puddle_flames_bloom',
    'lava_puddle_flames_bloom'
  ),
  lava_puddle_flames_trace_MSA: new EffectSettings(
    'lava_puddle_flames_trace',
    'lava_puddle_flames_trace'
  ),
  lava_puddle_main_bubble_MSA: new EffectSettings(
    'lava_puddle_main_bubble',
    'lava_puddle_main_bubble'
  ),

  lava_puddle_bubbles_base_poison_MSA: new EffectSettings(
    'lava_puddle_bubbles_base',
    'lava_puddle_bubbles_base_poison'
  ),
  lava_puddle_bubbles_trail_poison_MSA: new EffectSettings(
    'lava_puddle_bubbles_trail',
    'lava_puddle_bubbles_trail_poison'
  ),
  lava_puddle_crack_poison_MSA: new EffectSettings(
    'lava_puddle_crack',
    'lava_puddle_main_bubble_poison'
  ),
  lava_puddle_flames_base_poison_MSA: new EffectSettings(
    'lava_puddle_flames_base',
    'lava_puddle_flames_base_poison'
  ),
  lava_puddle_flames_bloom_poison_MSA: new EffectSettings(
    'lava_puddle_flames_bloom',
    'lava_puddle_flames_bloom_poison'
  ),
  lava_puddle_flames_trace_poison_MSA: new EffectSettings(
    'lava_puddle_flames_trace',
    'lava_puddle_flames_trace_poison'
  ),
  lava_puddle_main_bubble_poison_MSA: new EffectSettings(
    'lava_puddle_main_bubble',
    'lava_puddle_main_bubble_poison'
  ),
  explosion_poof_poison_MSA: new EffectSettings(
    'explosion_poof',
    'explosion_poof_poison'
  ),

  ada_empower_base_MSA: new EffectSettings(
    'ada_empower_base',
    'ada_empower_base'
  ),
  ada_empower_bloom_MSA: new EffectSettings(
    'ada_empower_bloom',
    'ada_empower_bloom'
  ),

  bouran_ritualize_back_flames_base_MSA: new EffectSettings(
    'bouran_ritualize_back_flames_base',
    'bouran_ritualize_flames_base'
  ),
  bouran_ritualize_back_flames_bloom_MSA: new EffectSettings(
    'bouran_ritualize_back_flames_bloom',
    'bouran_ritualize_flames_bloom'
  ),
  bouran_ritualize_circle_inner_MSA: new EffectSettings(
    'bouran_ritualize_circle_inner',
    'bouran_ritualize_circle'
  ),
  bouran_ritualize_circle_moon_sun_MSA: new EffectSettings(
    'bouran_ritualize_circle_moon_sun',
    'bouran_ritualize_circle'
  ),
  bouran_ritualize_circle_outer_MSA: new EffectSettings(
    'bouran_ritualize_circle_outer',
    'bouran_ritualize_circle'
  ),
  bouran_ritualize_embers_MSA: new EffectSettings(
    'bouran_ritualize_embers',
    'bouran_ritualize_embers'
  ),
  bouran_ritualize_front_flames_base_MSA: new EffectSettings(
    'bouran_ritualize_front_flames_base',
    'bouran_ritualize_flames_base'
  ),
  bouran_ritualize_front_flames_bloom_MSA: new EffectSettings(
    'bouran_ritualize_front_flames_bloom',
    'bouran_ritualize_flames_bloom'
  ),
  bouran_ritualize_glow_MSA: new EffectSettings(
    'bouran_ritualize_glow',
    'bouran_ritualize_glow'
  ),

  samya_teleport_base_MSA: new EffectSettings(
    'samya_teleport_base',
    'samya_teleport_base'
  ),
  samya_teleport_bloom_MSA: new EffectSettings(
    'samya_teleport_bloom',
    'samya_teleport_bloom'
  ),
  samya_teleport_dust_MSA: new EffectSettings(
    'samya_teleport_dust',
    'samya_teleport_dust'
  ),
  samya_teleport_energy_MSA: new EffectSettings(
    'samya_teleport_energy',
    'samya_teleport_energy'
  ),
  ari_fabricate_fill_MSA: new EffectSettings(
    'ari_fabricate_fill',
    'ari_fabricate_fill'
  ),
  ari_fabricate_base_MSA: new EffectSettings(
    'ari_fabricate_base',
    'ari_fabricate_base'
  ),
  hero_ability_trigger_MSA: new EffectSettings(
    'hero_ability_trigger',
    'hero_ability_trigger'
  ),

  lotus_petals_1_MSA: new EffectSettings('lotus_petals_1', 'lotus_petals'),
  lotus_petals_2_MSA: new EffectSettings('lotus_petals_2', 'lotus_petals'),
  lotus_petals_3_MSA: new EffectSettings('lotus_petals_3', 'lotus_petals'),
  lotus_petals_4_MSA: new EffectSettings('lotus_petals_4', 'lotus_petals'),
  lotus_petals_5_MSA: new EffectSettings('lotus_petals_5', 'lotus_petals'),

  magma_chasm_base_MSA: new EffectSettings(
    'magma_chasm_base',
    'magma_chasm_base'
  ),
  magma_chasm_bloom_MSA: new EffectSettings(
    'magma_chasm_bloom',
    'magma_chasm_bloom'
  ),
  magma_chasm_bubbles_MSA: new EffectSettings(
    'magma_chasm_bubbles',
    'magma_chasm_bubbles'
  ),
  magma_chasm_burst_MSA: new EffectSettings(
    'magma_chasm_burst',
    'magma_chasm_burst'
  ),
  magma_chasm_smoke_MSA: new EffectSettings(
    'magma_chasm_smoke',
    'magma_chasm_smoke'
  ),
  trident_base_MSA: new EffectSettings('trident_base', 'trident_base'),
  trident_bloom_MSA: new EffectSettings('trident_bloom', 'trident_bloom'),

  fox_packmaster_buff_MSA: new EffectSettings(
    'fox_packmaster_buff',
    'fox_packmaster_buff'
  ),
  fox_packmaster_clash_MSA: new EffectSettings(
    'fox_packmaster_clash',
    'fox_packmaster_clash'
  ),
  fox_packmaster_fox_MSA: new EffectSettings(
    'fox_packmaster_fox',
    'fox_packmaster_fox'
  ),

  sitti_psychomancy_fire_MSA: new EffectSettings(
    'sitti_psychomancy_fire',
    'sitti_psychomancy_fire'
  ),
  sitti_psychomancy_skulls_MSA: new EffectSettings(
    'sitti_psychomancy_skulls',
    'sitti_psychomancy_skulls'
  ),
  sitti_psychomancy_smoke_MSA: new EffectSettings(
    'sitti_psychomancy_smoke',
    'sitti_psychomancy_smoke'
  ),

  horik_vengeance_axe_MSA: new EffectSettings(
    'horik_vengeance_axe',
    'horik_vengeance_axe'
  ),
  horik_vengeance_buff_MSA: new EffectSettings(
    'horik_vengeance_buff',
    'horik_vengeance_buff'
  ),
  horik_vengeance_slice_MSA: new EffectSettings(
    'horik_vengeance_slice',
    'horik_vengeance_slice'
  ),
  horik_vengeance_strike_MSA: new EffectSettings(
    'horik_vengeance_strike',
    'horik_vengeance_strike'
  ),
  horik_vengeance_impact_MSA: new EffectSettings(
    'horik_vengeance_impact',
    'horik_vengeance_impact'
  ),
  titus_nurturer_energize_MSA: new EffectSettings(
    'titus_nurturer_energize',
    'titus_nurturer_energize'
  ),

  axel_glow_slide_MSA: new EffectSettings('axel_glow_slide', 'axel_glow_slide'),
  axel_intro_flame_MSA: new EffectSettings(
    'axel_intro_flame',
    'axel_intro_flame'
  ),
  axel_outro_flame_MSA: new EffectSettings(
    'axel_outro_flame',
    'axel_outro_flame'
  ),
  axel_shine_MSA: new EffectSettings('axel_shine', 'axel_shine'),
  axel_trail_MSA: new EffectSettings('axel_trail', 'axel_trail'),
  axel_spectral_coins_MSA: new EffectSettings(
    'axel_spectral_coins',
    'axel_spectral_coins'
  ),

  iris_meditation_MSA: new EffectSettings('iris_meditation', 'iris_meditation'),
  mai_gadgeteer_MSA: new EffectSettings('mai_gadgeteer', 'mai_gadgeteer'),
  zoey_live_fast_MSA: new EffectSettings('zoey_live_fast', 'zoey_live_fast'),
  banjo_mercurial_MSA: new EffectSettings('banjo_mercurial', 'banjo_mercurial')
} as const
export type EffectName = keyof typeof effectLibrary
const effectLibrarySafety: { [K: string]: EffectSettings } = effectLibrary
effectLibrarySafety

const TransformsLibraryFor3D: Map<MeshAnimationAssetName, TargetTransform> =
  new Map()
class Transform implements TargetTransform {
  position = new Vector3()
  quaternion = new Quaternion()
  scale = new Vector3(1, 1, 1)
  translate(x: number, y: number, z: number) {
    this.position.x += x
    this.position.y += y
    this.position.z += z
    return this
  }
  rescale(x: number, y: number, z: number) {
    this.scale.x *= x
    this.scale.y *= y
    this.scale.z *= z
    return this
  }
  rotate(x: number, y: number, z: number) {
    const q = new Quaternion().setFromEuler(new Euler(x, y, z))
    this.quaternion.multiply(q)
    return this
  }
}
const actually3DMeshes: Array<MeshAnimationAssetName> = [
  'meshAnimationSmoke18',
  'meshAnimationCrackTest',
  'meshAnimationCrack2Test',
  'meshAnimationFire001',
  'meshAnimationEnergy060',
  'meshAnimationLiquid056',
  'water_trigger',
  'light_trigger',
  'fire_trigger',
  'mind_trigger',
  'metal_trigger',
  'earth_trigger',
  'flames',

  'border_glint_guard',
  'border_glint_unit',
  'border_glint_spell',
  'debuff_lines',
  'hero_death_big_ground_ring_3d',
  'ground_crack',

  'glory_trigger',
  'slay_trigger',
  // 'AoE_generic',
  'arrow',
  'bite',
  'claw',
  'claw_impact',
  'crow',
  'ground_aura',
  'siphon',
  'stomp_paw',
  'stomp_impact',
  'twinkle',

  'cog',
  'feathers',
  'hearts',
  'music_notes',
  'stealth_eye',

  'main_shape',
  'burst_shine',
  'sparks',
  'electricity',
  'glow_bloom',
  'card_flames',

  'charge_up_energy_008',
  'charge_up_energy_051',
  'charge_up_energy_052',
  'charge_up_energy_053',

  'energy_tower_flames_base',
  'energy_tower_flames_bloom',
  'energy_tower_flames_trail',
  'energy_tower_electricity',
  'energy_tower_base_trail',

  'lava_puddle_bubbles_base',
  'lava_puddle_bubbles_trail',
  'lava_puddle_crack',
  'lava_puddle_embers',
  'lava_puddle_flames_base',
  'lava_puddle_flames_bloom',
  'lava_puddle_flames_trace',
  'lava_puddle_main_bubble',

  'ada_empower_base',
  'ada_empower_bloom',

  'bouran_ritualize_back_flames_base',
  'bouran_ritualize_back_flames_bloom',
  'bouran_ritualize_circle_inner',
  'bouran_ritualize_circle_moon_sun',
  'bouran_ritualize_circle_outer',
  'bouran_ritualize_embers',
  'bouran_ritualize_front_flames_base',
  'bouran_ritualize_front_flames_bloom',
  'bouran_ritualize_glow',

  'samya_teleport_base',
  'samya_teleport_bloom',
  'samya_teleport_dust',
  'samya_teleport_energy',

  'ari_fabricate_base',
  'ari_fabricate_fill',

  'hero_ability_trigger',

  'lotus_petals_1',
  'lotus_petals_2',
  'lotus_petals_3',
  'lotus_petals_4',
  'lotus_petals_5',

  'magma_chasm_base',
  'magma_chasm_bloom',
  'magma_chasm_bubbles',
  'magma_chasm_burst',
  'magma_chasm_smoke',

  'trident_base',
  'trident_bloom',

  'fox_packmaster_buff',
  'fox_packmaster_clash',
  'fox_packmaster_fox',

  'sitti_psychomancy_fire',
  'sitti_psychomancy_skulls',
  'sitti_psychomancy_smoke',

  'horik_vengeance_axe',
  'horik_vengeance_buff',
  'horik_vengeance_impact',
  'horik_vengeance_strike',
  'horik_vengeance_slice',

  'axel_glow_slide',
  'axel_intro_flame',
  'axel_outro_flame',
  'axel_shine',
  'axel_trail',
  'axel_spectral_coins',

  'titus_nurturer_energize',
  'iris_meditation',
  'mai_gadgeteer',
  'zoey_live_fast',
  'banjo_mercurial'
]
TransformsLibraryFor3D.set(
  'ground_crack',
  new Transform()
    .rescale(0.06, 0.06, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(-0.002, 0, 0.031)
)
TransformsLibraryFor3D.set(
  'meshAnimationCrackTest',
  new Transform()
    .rescale(0.06, 0.06, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(-0.002, 0, 0.031)
)
TransformsLibraryFor3D.set(
  'meshAnimationCrack2Test',
  new Transform()
    .rescale(0.06, 0.06, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(-0.002, 0, 0.031)
)
TransformsLibraryFor3D.set(
  'meshAnimationSmoke18',
  new Transform()
    .rescale(0.075, 0.075, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, 0)
)
TransformsLibraryFor3D.set(
  'meshAnimationFire001',
  new Transform()
    .rescale(0.03, 0.08, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, 0)
)
TransformsLibraryFor3D.set(
  'meshAnimationEnergy060',
  new Transform()
    .rescale(0.035, 0.02, 0.085)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.005)
)
TransformsLibraryFor3D.set(
  'meshAnimationLiquid056',
  new Transform()
    .rescale(0.035, 0.02, 0.12)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.03)
)
TransformsLibraryFor3D.set(
  'water_trigger',
  new Transform()
    .rescale(0.06, 0.02, 0.12)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.027)
)
TransformsLibraryFor3D.set(
  'light_trigger',
  new Transform()
    .rescale(0.07, 0.02, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.002)
)
TransformsLibraryFor3D.set(
  'fire_trigger',
  new Transform()
    .rescale(0.07, 0.08, 0.12)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(-0.002, 0, -0.02)
)
TransformsLibraryFor3D.set(
  'flames',
  new Transform()
    .rescale(0.07, 0, 0.08)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, 0)
)
TransformsLibraryFor3D.set(
  'mind_trigger',
  new Transform()
    .rescale(0.09, 0.08, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.01)
)
TransformsLibraryFor3D.set(
  'metal_trigger',
  new Transform()
    .rescale(0.12, 0.08, 0.08)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.01)
)
TransformsLibraryFor3D.set(
  'earth_trigger',
  new Transform()
    .rescale(0.07, 0.08, 0.09)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.022)
)
TransformsLibraryFor3D.set(
  'glory_trigger',
  new Transform()
    .rescale(0.07, 0.08, 0.09)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0.004, -0.022)
)
TransformsLibraryFor3D.set(
  'slay_trigger',
  new Transform()
    .rescale(0.1, 0.1, 0.1)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.014, 0, -0.018)
)
// TransformsLibraryFor3D.set(
//   'AoE_generic',
//   new Transform()
//     .rescale(0.07, 0.08, 0.09)
//     .rotate(-Math.PI / 4, 0, 0)
//     .translate(0, 0, -0.022)
// )
TransformsLibraryFor3D.set(
  'debuff_lines',
  new Transform()
    .rescale(0.08, 0.08, 0.065)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, 0)
)
TransformsLibraryFor3D.set(
  'arrow',
  new Transform()
    .rescale(0.15, 0.15, 0.15)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.012, 0.004, -0.003)
)
TransformsLibraryFor3D.set(
  'bite',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.006, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'claw',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.006, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'claw_impact',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.006, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'crow',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.006, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'ground_aura',
  new Transform().rescale(0.4, 0.4, 0.4).rotate(0, 0, 0).translate(0, 0, 0)
)
TransformsLibraryFor3D.set(
  'siphon',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.006, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'stomp_paw',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(0, 0, 0)
    .translate(0, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'cog',
  new Transform()
    .rescale(0.09, 0.09, 0.09)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.011, 0.002, -0.018)
)
TransformsLibraryFor3D.set(
  'feathers',
  new Transform()
    .rescale(0.09, 0.09, 0.09)
    .rotate(0, 0, 0)
    .translate(0.003, 0.002, -0.015)
)
TransformsLibraryFor3D.set(
  'hearts',
  new Transform()
    .rescale(0.09, 0.09, 0.09)
    .rotate(0, 0, 0)
    .translate(0, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'music_notes',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(0, 0, 0)
    .translate(0, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'stealth_eye',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(0, 0, 0)
    .translate(0, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'stomp_impact',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0, 0, -0.008)
)
TransformsLibraryFor3D.set(
  'twinkle',
  new Transform()
    .rescale(0.11, 0.11, 0.11)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0.006, 0, -0.008)
)

const border_glint_MSAs: MeshAnimationAssetName[] = [
  'border_glint_guard',
  'border_glint_unit',
  'border_glint_spell'
]
for (const assetName of border_glint_MSAs) {
  TransformsLibraryFor3D.set(
    assetName as MeshAnimationAssetName,
    new Transform()
      .rescale(0.0725, 0.072, 0.073)
      .rotate(-Math.PI / 4, 0, 0)
      .translate(0 + 0.0007, -0.00095, -0.0055 + 0.0009)
  )
}

const card_casting_MSAs: MeshAnimationAssetName[] = [
  'main_shape',
  'burst_shine',
  'sparks',
  'electricity',
  'glow_bloom',
  'card_flames'
]

for (const assetName of card_casting_MSAs) {
  TransformsLibraryFor3D.set(
    assetName as MeshAnimationAssetName,
    new Transform()
      .rescale(0.122, 0, 0.122)
      .rotate(0, 0, 0)
      .translate(-0.0005, 0, -0.005)
  )
}

const charge_up_MSAs: MeshAnimationAssetName[] = [
  'charge_up_energy_008',
  'charge_up_energy_051',
  'charge_up_energy_052',
  'charge_up_energy_053'
]

for (const assetName of charge_up_MSAs) {
  TransformsLibraryFor3D.set(
    assetName as MeshAnimationAssetName,
    new Transform()
      .rescale(0.11, 0, 0.11)
      .rotate(0, 0, 0)
      .translate(0, 0, -0.005)
  )
}

const energy_tower_MSAs: MeshAnimationAssetName[] = [
  'energy_tower_flames_base',
  'energy_tower_flames_bloom',
  'energy_tower_flames_trail',
  'energy_tower_electricity',
  'energy_tower_base_trail'
]

for (const assetName of energy_tower_MSAs) {
  TransformsLibraryFor3D.set(
    assetName as MeshAnimationAssetName,
    new Transform().rescale(0.11, 0, 0.11).rotate(0, 0, 0).translate(0, 0, 0)
  )
}

const lava_puddle_MSAs: MeshAnimationAssetName[] = [
  'lava_puddle_bubbles_base',
  'lava_puddle_bubbles_trail',
  'lava_puddle_crack',
  'lava_puddle_embers',
  'lava_puddle_flames_base',
  'lava_puddle_flames_bloom',
  'lava_puddle_flames_trace',
  'lava_puddle_main_bubble'
]

for (const assetName of lava_puddle_MSAs) {
  TransformsLibraryFor3D.set(
    assetName as MeshAnimationAssetName,
    new Transform().rescale(0.122, 0, 0.122).rotate(0, 0, 0).translate(0, 0, 0)
  )
}

const groundRingScale = 4
TransformsLibraryFor3D.set(
  'hero_death_big_ground_ring_3d',
  new Transform()
    .rescale(0.0725 * groundRingScale, 0.072, 0.11 * groundRingScale)
    .rotate(-Math.PI / 4, 0, 0)
    .translate(0 + 0.0007, -0.00095, -0.0055 + 0.0009)
)

for (const asset of ['ada_empower_base', 'ada_empower_bloom'] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.14, 0, 0.14)
      .rotate(0, 0, 0)
      .translate(0, 0, -0.008)
  )
}

for (const asset of [
  'bouran_ritualize_back_flames_base',
  'bouran_ritualize_back_flames_bloom',
  'bouran_ritualize_circle_inner',
  'bouran_ritualize_circle_moon_sun',
  'bouran_ritualize_circle_outer',
  'bouran_ritualize_embers',
  'bouran_ritualize_front_flames_base',
  'bouran_ritualize_front_flames_bloom',
  'bouran_ritualize_glow'
] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.165, 0, 0.165)
      .rotate(0, 0, 0)
      .translate(0, 0, -0.008)
  )
}

for (const asset of [
  'samya_teleport_base',
  'samya_teleport_bloom',
  'samya_teleport_dust',
  'samya_teleport_energy'
] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.14, 0, 0.14)
      .rotate(0, 0, 0)
      .translate(0, 0, -0.008)
  )
}

for (const asset of ['ari_fabricate_base', 'ari_fabricate_fill'] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.31, 0, 0.31)
      .rotate(0, 0, 0)
      .translate(0.05, 0, -0.12)
  )
}

TransformsLibraryFor3D.set(
  'hero_ability_trigger',
  new Transform().rescale(0.2, 0.2, 0.2).rotate(0, 0, 0).translate(0, 0, 0)
)

for (const asset of [
  'lotus_petals_1',
  'lotus_petals_2',
  'lotus_petals_3',
  'lotus_petals_4',
  'lotus_petals_5'
] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.15, 0, 0.15)
      .rotate(0, 0, 0)
      .translate(0, -0.0001, -0.06)
  )
}

for (const asset of [
  'magma_chasm_base',
  'magma_chasm_bloom',
  'magma_chasm_bubbles',
  'magma_chasm_burst',
  'magma_chasm_smoke'
] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform().rescale(0.13, 0, 0.13).rotate(0, 0, 0).translate(0, 0, 0)
  )
}

for (const asset of ['trident_base', 'trident_bloom'] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.11, 0, 0.11)
      .rotate(0, Math.PI / 2, 0)
      .translate(0.001, 0.2, 0.035)
  )
}

for (const asset of [
  'fox_packmaster_buff',
  'fox_packmaster_clash',
  'fox_packmaster_fox'
] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.24, 0, 0.24)
      .rotate(0, 0, 0)
      .translate(0.003, 0.01, -0.02)
  )
}

for (const asset of [
  'sitti_psychomancy_fire',
  'sitti_psychomancy_skulls',
  'sitti_psychomancy_smoke'
] as const) {
  TransformsLibraryFor3D.set(
    asset,
    new Transform()
      .rescale(0.14, 0, 0.14)
      .rotate(0, 0, 0)
      .translate(asset !== 'sitti_psychomancy_fire' ? -0.005 : 0, 0.01, -0.02)
  )
}

for (const asset of [
  'horik_vengeance_axe',
  'horik_vengeance_buff',
  'horik_vengeance_slice',
  'horik_vengeance_strike',
  'horik_vengeance_impact'
] as const) {
  TransformsLibraryFor3D.set(asset, new Transform().rescale(0.22, 0, 0.22))
}
for (const asset of [
  'axel_glow_slide',
  'axel_intro_flame',
  'axel_outro_flame',
  'axel_shine',
  'axel_trail',
  'axel_spectral_coins'
] as const) {
  TransformsLibraryFor3D.set(asset, new Transform().rescale(0.22, 0, 0.22))
}

TransformsLibraryFor3D.set(
  'titus_nurturer_energize',
  new Transform().rescale(0.15, 0, 0.15).rotate(0, 0, 0).translate(0, 0, 0)
)
TransformsLibraryFor3D.set(
  'iris_meditation',
  new Transform()
    .rescale(0.09, 0, 0.09)
    .rotate(0, 0, 0)
    .translate(0.001, 0, -0.02)
)
TransformsLibraryFor3D.set(
  'mai_gadgeteer',
  new Transform()
    .rescale(0.14, 0, 0.14)
    .rotate(0, 0, 0)
    .translate(-0.0018, -0.005, -0.001)
)
TransformsLibraryFor3D.set(
  'zoey_live_fast',
  new Transform().rescale(0.11, 0, 0.11).rotate(0, 0, 0).translate(0, 0, -0.01)
)
TransformsLibraryFor3D.set(
  'banjo_mercurial',
  new Transform()
    .rescale(0.08, 0, 0.08)
    .rotate(0, 0, 0)
    .translate(0.0015, 0, -0.003)
)

const defaultMeshAnimationFPS = 12
const meshAnimationFPSLookUp: Partial<{
  [K in MeshAnimationAssetName]: number
}> = {
  meshAnimationWater22: 24,
  meshAnimationEnergy027: 24,
  fire_vortex_test: 60,
  fire_vortex2_test: 30,
  smoke_bomb_test: 45,
  fire_radial_glow_test: 30,
  meshAnimationFire001: 24,
  meshAnimationEnergy060: 24,
  meshAnimationEnergy16: 8,
  fire_trigger: 24,
  water_trigger: 16,
  mind_trigger: 18,
  earth_trigger: 18,
  meshAnimationEnergy021: 18,
  phoenix_plume_top: 20,
  knives: 18,
  flames: 18,
  mad_vibes: 20,
  border_glint_guard: 45,
  border_glint_unit: 45,
  border_glint_spell: 30,
  hero_death_small_blast: 30,
  hero_death_small_smoke: 30,
  hero_death_big_black_smoke: 30,
  hero_death_big_points: 30,
  hero_death_big_ground_ring_3d: 30,
  hero_death_big_flare: 45,
  hero_death_big_clouds_A: 30,
  hero_death_big_clouds_B: 30,
  slay_trigger: 24,
  glory_trigger: 24,
  test_death_trigger: 20,
  death_trigger_high: 20,
  death_trigger_low: 20,
  // AoE_generic: 20,
  debuff_lines: 30,
  arrow: 16,
  bite: 24,
  claw: 24,
  claw_impact: 24,
  crow: 30,
  ground_aura: 30,
  siphon: 30,
  stomp_paw: 24,
  stomp_impact: 24,
  twinkle: 24,
  cog: 30,
  feathers: 20,
  hearts: 24,
  music_notes: 24,
  stealth_eye: 24,

  main_shape: 18,
  burst_shine: 18,
  sparks: 18,
  electricity: 18,
  glow_bloom: 18,
  card_flames: 18,

  charge_up_energy_008: 18,
  charge_up_energy_051: 18,
  charge_up_energy_052: 18,
  charge_up_energy_053: 18,

  energy_tower_flames_base: 21,
  energy_tower_flames_bloom: 21,
  energy_tower_flames_trail: 21,
  energy_tower_electricity: 21,
  energy_tower_base_trail: 21,

  explosion_base: 18,
  explosion_trace: 18,
  explosion_bloom: 18,
  explosion_poof: 18,

  lava_puddle_bubbles_base: 18,
  lava_puddle_bubbles_trail: 18,
  lava_puddle_crack: 18,
  lava_puddle_embers: 18,
  lava_puddle_flames_base: 18,
  lava_puddle_flames_bloom: 18,
  lava_puddle_flames_trace: 18,
  lava_puddle_main_bubble: 18,

  ada_empower_base: 20,
  ada_empower_bloom: 20,

  bouran_ritualize_back_flames_base: 24,
  bouran_ritualize_back_flames_bloom: 24,
  bouran_ritualize_circle_inner: 24,
  bouran_ritualize_circle_moon_sun: 24,
  bouran_ritualize_circle_outer: 24,
  bouran_ritualize_embers: 24,
  bouran_ritualize_front_flames_base: 24,
  bouran_ritualize_front_flames_bloom: 24,
  bouran_ritualize_glow: 24,

  samya_teleport_base: 16,
  samya_teleport_bloom: 16,
  samya_teleport_dust: 16,
  samya_teleport_energy: 16,

  ari_fabricate_base: 16,
  ari_fabricate_fill: 16,

  hero_ability_trigger: 45,

  lotus_petals_1: 24,
  lotus_petals_2: 24,
  lotus_petals_3: 24,
  lotus_petals_4: 24,
  lotus_petals_5: 24,

  magma_chasm_base: 18,
  magma_chasm_bloom: 18,
  magma_chasm_bubbles: 18,
  magma_chasm_burst: 18,
  magma_chasm_smoke: 18,

  trident_base: 24,
  trident_bloom: 24,

  fox_packmaster_buff: 12,
  fox_packmaster_clash: 8,
  fox_packmaster_fox: 20,

  sitti_psychomancy_fire: 24,
  sitti_psychomancy_skulls: 24,
  sitti_psychomancy_smoke: 24,

  horik_vengeance_axe: 18,
  horik_vengeance_buff: 18,
  horik_vengeance_impact: 18,
  horik_vengeance_strike: 18,
  horik_vengeance_slice: 18,

  axel_glow_slide: 18,
  axel_intro_flame: 18,
  axel_outro_flame: 18,
  axel_shine: 18,
  axel_trail: 18,
  axel_spectral_coins: 18,

  titus_nurturer_energize: 20,
  iris_meditation: 20,
  mai_gadgeteer: 20,
  zoey_live_fast: 20,
  banjo_mercurial: 20
}
function getFPS(name: MeshAnimationAssetName) {
  return meshAnimationFPSLookUp[name] || defaultMeshAnimationFPS
}

const prescaleLookUp: Partial<{
  [K in MeshAnimationAssetName]: number | Vector2
}> = {
  hero_death_small_blast: 1.5,
  hero_death_small_smoke: 1.5,

  hero_death_big_black_smoke: 3,
  hero_death_big_points: new Vector2(2, 3.5),
  hero_death_big_flare: new Vector2(6, 3),
  hero_death_big_clouds_A: 3,
  hero_death_big_clouds_B: 3,

  meshAnimationEnergy21: 3,
  meshAnimationEnergy015: new Vector2(0.7, 1).multiplyScalar(0.9),
  meshAnimationExplosion019: new Vector2(0.8, 1).multiplyScalar(0.8),
  meshAnimationElectricity043: new Vector2(0.75, 1),

  explosion_base: new Vector2(2, 2),
  explosion_trace: new Vector2(2, 2),
  explosion_bloom: new Vector2(2, 2),
  explosion_poof: new Vector2(2, 2)
}
function getPrescale(name: MeshAnimationAssetName) {
  return prescaleLookUp[name] || new Vector2(1, 1)
}

type AnimationDurations = { in: number; out: number }
const defaultMeshAnimationDurations: AnimationDurations = {
  in: 1000,
  out: 1000
}
const meshAnimationDurationsLookUp: Partial<{
  [K in EffectName]: AnimationDurations
}> = {
  // set differing Durations's here
  basicCrack_MSA: { in: 100, out: 800 },
  conquestCrack_MSA: { in: 100, out: 800 },
  ground_aura_MSA: { in: 500, out: 1000 }
}
function getDurations(name: EffectName) {
  return meshAnimationDurationsLookUp[name] || defaultMeshAnimationDurations
}

const __tintMeshesByAtmosphere: MeshAnimationAssetName[] = [
  //any meshes that have dust or physical nature that should be lit by the sky color
]

export async function buildMeshSpriteEffect(
  effectName: EffectName,
  paletteOverride?: PaletteName,
  yOffset = 0,
  zOffset = 0,
  scale?: number | Vector2,
  repeats = 1,
  reversed?: boolean
): Promise<MeshEffect> {
  let frameGeometries: BufferGeometry[]
  const effectSettings = effectLibrary[effectName]
  const meshName = effectSettings.meshName

  if (effectName === 'light_trigger_MSA') {
    repeats = 2
  }

  if (!frameGeometryLibrary.has(meshName)) {
    if (!pendingEffectLoaders.has(meshName)) {
      const loader = getAssetsManager().loadAsset(meshName)
      pendingEffectLoaders.set(meshName, loader)
      await loader

      let counter = 0
      let finished = false
      frameGeometries = []
      frameGeometryLibrary.set(meshName, frameGeometries)
      while (!finished) {
        const meshes = findObject3DsWhoseNamesInclude<Mesh>(
          getAssetsManager().getAsset(meshName),
          padLeadingZeros(counter, 3)
        )
        if (meshes.length === 0) {
          finished = true
        } else if (meshes.length === 1) {
          frameGeometries.push(meshes[0].geometry)
        } else {
          throw new Error('wtf?')
        }
        counter++
      }
      if (frameGeometries.length === 0) {
        throw new Error(
          `MSA with mesh name ${meshName} has no frame geometries!`
        )
      }
      if (!frameGeometries[0]) {
        throw new Error(`MSA with mesh name ${meshName} has a bad first frame!`)
      }

      frameGeometries = frameGeometryLibrary.get(meshName)!
    } else {
      await pendingEffectLoaders.get(meshName)
      frameGeometries = frameGeometryLibrary.get(meshName)!
    }
  } else {
    frameGeometries = frameGeometryLibrary.get(meshName)!
  }

  if (reversed) {
    const reversedMeshName = (meshName + '-reversed') as MeshAnimationAssetName
    if (!frameGeometryLibrary.has(reversedMeshName)) {
      const reversedGeo: BufferGeometry[] = []
      frameGeometries.forEach(bufferGeo => {
        const clone = bufferGeo.clone()
        reversedGeo.push(clone)
      })
      frameGeometries = reversedGeo.reverse()
      frameGeometryLibrary.set(reversedMeshName, frameGeometries)
    } else {
      frameGeometries = frameGeometryLibrary.get(reversedMeshName)!
    }
  }

  const paletteSettings = paletteOverride
    ? paletteLibrary[paletteOverride]
    : paletteLibrary[effectSettings.paletteName]
  const screenSpace = !actually3DMeshes.includes(meshName)
  const mesh = new Mesh(
    frameGeometries[0],
    new ZPaletteMappedMeshMaterial({
      ...basicZPaletteMaterialOptions,
      paletteMapRow: paletteSettings.row,
      paletteMapRowAnimLength: paletteSettings.animRows,
      paletteMapRowAnimDuration: paletteSettings.animDuration,
      paletteRangeMapper: paletteRangeMapperLibrary.get(meshName),
      screenSpace,
      prescale: scale ? scale : getPrescale(meshName),
      overlayColor: __tintMeshesByAtmosphere.includes(meshName)
        ? atmosphereColorForIsland
        : undefined
    })
  )

  if (!screenSpace) {
    const transformTo = TransformsLibraryFor3D.get(meshName)!
    copyTransform(mesh, transformTo)
  }

  const frameProxy = {
    frame: 0
  }

  const timeProxy = {
    time: 0
  }

  listenToProperty(frameProxy, 'frame', frame => {
    const f = frameGeometries[frame % frameGeometries.length]
    if (f) {
      mesh.geometry = f
    }
  })
  const fps = getFPS(meshName)
  const duration = (repeats * frameGeometries.length - 1) / fps
  const anim = simpleTweener.to({
    description: 'mesh animation',
    target: timeProxy,
    duration: duration * 1000,
    propertyGoals: { time: duration },
    easing: Easing.Linear,
    onUpdate: () => {
      frameProxy.frame = ~~(timeProxy.time * fps)
      mesh.material.update(timeProxy.time)
    },
    onComplete: () => {
      removeFromParent(mesh)
    }
  })

  if (screenSpace) {
    mesh.onBeforeRender = (
      renderer: WebGLRenderer,
      scene: Scene,
      camera: PerspectiveCamera,
      geometry: BufferGeometry,
      material: ZPaletteMappedMeshMaterial
    ) => {
      material.viewScale = 0.1 / Math.tan(DEGREES_TO_RADIANS * 0.5 * camera.fov)

      const clipPos = material.uniforms.clipSpacePosition.value as Vector4
      __mat
        .multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld)
        .premultiply(camera.projectionMatrix) //.multiply(camera.projectionMatrix)

      const q = new Quaternion()
      __mat2.extractRotation(camera.matrixWorld)
      q.setFromRotationMatrix(__mat2)
      const adjust = new Vector3(0, yOffset, zOffset)
      adjust.applyQuaternion(q)
      clipPos.set(adjust.x, adjust.y, adjust.z, 1).applyMatrix4(__mat)
    }
  }

  return { name: meshName, mesh, anim }
}

export async function buildMeshSpriteStatic(
  effectName: EffectName,
  paletteOverride?: PaletteName,
  yOffset = 0,
  zOffset = 0,
  scale?: number | Vector2
): Promise<Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>> {
  let frameGeometries: BufferGeometry[]
  const effectSettings = effectLibrary[effectName]
  const meshName = effectSettings.meshName

  if (!frameGeometryLibrary.has(meshName)) {
    if (!pendingEffectLoaders.has(meshName)) {
      const loader = getAssetsManager().loadAsset(meshName)
      pendingEffectLoaders.set(meshName, loader)
      await loader

      let counter = 0
      let finished = false
      frameGeometries = []
      frameGeometryLibrary.set(meshName, frameGeometries)
      while (!finished) {
        const meshes = findObject3DsWhoseNamesInclude<Mesh>(
          getAssetsManager().getAsset(meshName),
          padLeadingZeros(counter, 3)
        )
        if (meshes.length === 0) {
          finished = true
        } else if (meshes.length === 1) {
          frameGeometries.push(meshes[0].geometry)
        } else {
          throw new Error('wtf?')
        }
        counter++
      }
      if (frameGeometries.length === 0) {
        throw new Error(
          `MSA with mesh name ${meshName} has no frame geometries!`
        )
      }
      if (!frameGeometries[0]) {
        throw new Error(`MSA with mesh name ${meshName} has a bad first frame!`)
      }

      frameGeometries = frameGeometryLibrary.get(meshName)!
    } else {
      await pendingEffectLoaders.get(meshName)
      frameGeometries = frameGeometryLibrary.get(meshName)!
    }
  } else {
    frameGeometries = frameGeometryLibrary.get(meshName)!
  }

  const paletteSettings = paletteOverride
    ? paletteLibrary[paletteOverride]
    : paletteLibrary[effectSettings.paletteName]
  const screenSpace = !actually3DMeshes.includes(meshName)
  const mesh = new Mesh(
    frameGeometries[0],
    new ZPaletteMappedMeshMaterial({
      ...basicZPaletteMaterialOptions,
      paletteMapRow: paletteSettings.row,
      paletteMapRowAnimLength: paletteSettings.animRows,
      paletteMapRowAnimDuration: paletteSettings.animDuration,
      paletteRangeMapper: paletteRangeMapperLibrary.get(meshName),
      screenSpace,
      prescale: scale ? scale : getPrescale(meshName),
      overlayColor: __tintMeshesByAtmosphere.includes(meshName)
        ? atmosphereColorForIsland
        : undefined
    })
  )

  if (!screenSpace) {
    const transformTo = TransformsLibraryFor3D.get(meshName)!
    copyTransform(mesh, transformTo)
  }

  const frameProxy = {
    frame: 0
  }

  listenToProperty(frameProxy, 'frame', frame => {
    const f = frameGeometries[frame % frameGeometries.length]
    if (f) {
      mesh.geometry = f
    }
  })

  if (screenSpace) {
    mesh.onBeforeRender = (
      renderer: WebGLRenderer,
      scene: Scene,
      camera: PerspectiveCamera,
      geometry: BufferGeometry,
      material: ZPaletteMappedMeshMaterial
    ) => {
      material.viewScale = 0.1 / Math.tan(DEGREES_TO_RADIANS * 0.5 * camera.fov)

      const clipPos = material.uniforms.clipSpacePosition.value as Vector4
      __mat
        .multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld)
        .premultiply(camera.projectionMatrix) //.multiply(camera.projectionMatrix)

      const q = new Quaternion()
      __mat2.extractRotation(camera.matrixWorld)
      q.setFromRotationMatrix(__mat2)
      const adjust = new Vector3(0, yOffset, zOffset)
      adjust.applyQuaternion(q)
      clipPos.set(adjust.x, adjust.y, adjust.z, 1).applyMatrix4(__mat)
    }
  }

  return mesh
}

const effectedTargets: Map<
  Object3D,
  Map<EffectName, MeshPaletteEffect>
> = new Map()

export function toggleMeshSpriteEffectLoop(
  target: Object3D,
  effectName: EffectName,
  palette?: PaletteName,
  yOffset = 0,
  zOffset = 0,
  detach = false
): Promise<CompleteStatus | MeshPaletteEffect> {
  let effectMap: Map<EffectName, MeshPaletteEffect>
  if (!effectedTargets.has(target)) {
    effectMap = new Map()
    effectedTargets.set(target, effectMap)
  } else {
    effectMap = effectedTargets.get(target)!
  }

  const transparencyStartingPoint = -0.4
  if (!effectMap.has(effectName)) {
    return buildMeshSpriteEffect(
      effectName,
      palette,
      yOffset,
      zOffset,
      undefined,
      10000
    ).then(effect => {
      target.add(effect.mesh)
      effect.mesh.position.add(new Vector3(0, 0, 0.01))
      effect.mesh.rotation.x -= 0.1
      const delta = effect.mesh.position
        .clone()
        .sub(cameraShaker.camera.position)
        .normalize()
        .multiplyScalar(0.005)
      effect.mesh.position.add(delta)

      effect.mesh.material.paletteRangeMapper.x = transparencyStartingPoint

      if (detach) {
        scene.attach(effect.mesh)
      }

      effect.anim.finished.then(() => {
        removeFromParent(effect.mesh)
      })

      const paletteAnim = simpleTweener.to({
        description: 'palette range mapper x',
        target: effect.mesh.material.paletteRangeMapper,
        propertyGoals: { x: 0 },
        duration: getDurations(effectName).in
      })

      const paletteEffect = new MeshPaletteEffect(effect, paletteAnim)
      effectMap.set(effectName, paletteEffect)
      return paletteEffect
    })
  } else {
    const paletteEffect = effectMap.get(effectName)!
    const effect = paletteEffect.effect

    effectMap.delete(effectName)

    if (effectMap.size === 0) {
      effectedTargets.delete(target)
    }

    return simpleTweener.to({
      description: 'palette range mapper x',
      target: effect.mesh.material.paletteRangeMapper,
      // propertyGoals: { x: -1 },
      propertyGoals: { x: transparencyStartingPoint },
      duration: getDurations(effectName).out,
      onComplete: () => {
        effect.anim.kill()
        removeFromParent(effect.mesh)
      }
    }).finished
  }
}
