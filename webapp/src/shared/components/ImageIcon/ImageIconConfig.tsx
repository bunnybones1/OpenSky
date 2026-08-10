import { Apple } from './components/Apple'
import { CardBackSolid } from './components/CardBackSolid'
import { EditDeck } from './components/EditDeck'
import { ElementAir } from './components/ElementAir'
import { ElementDark } from './components/ElementDark'
import { ElementEarth } from './components/ElementEarth'
import { ElementFire } from './components/ElementFire'
import { ElementLight } from './components/ElementLight'
import { ElementMetal } from './components/ElementMetal'
import { ElementMind } from './components/ElementMind'
import { ElementWater } from './components/ElementWater'
import { HeroesBase } from './components/HeroesBase'
import { HeroesGold } from './components/HeroesGold'
import { Linux } from './components/Linux'
import { LockStroke } from './components/LockStroke'
import { SaveDeck } from './components/SaveDeck'
import { Sequence } from './components/Sequence'
import { Spell } from './components/Spell'
import { StickersSolid } from './components/StickersSolid'
import { TraitArmor } from './components/TraitArmor'
import { TraitBanner } from './components/TraitBanner'
import { TraitDash } from './components/TraitDash'
import { TraitGuard } from './components/TraitGuard'
import { TraitLifesteal } from './components/TraitLifesteal'
import { TraitStealth } from './components/TraitStealth'
import { TraitWither } from './components/TraitWither'
import { TriggerContinuous } from './components/TriggerContinuous'
import { TriggerDeath } from './components/TriggerDeath'
import { TriggerGeneric } from './components/TriggerGeneric'
import { TriggerGlory } from './components/TriggerGlory'
import { TriggerInspire } from './components/TriggerInspire'
import { TriggerPlay } from './components/TriggerPlay'
import { TriggerSlay } from './components/TriggerSlay'
import { TriggerSummon } from './components/TriggerSummon'
import { TriggerSunrise } from './components/TriggerSunrise'
import { TriggerSunset } from './components/TriggerSunset'
import { Twitch } from './components/Twitch'
import { Unit } from './components/Unit'
import { Usdc } from './components/USDC'
import { Windows } from './components/Windows'
import { Xp } from './components/Xp'

export const ImageIcons = {
  apple: Apple,
  usdc: Usdc,
  ['heroes-gold']: HeroesGold,
  ['heroes-base']: HeroesBase,
  linux: Linux,
  sequence: Sequence,
  ['stickers-solid']: StickersSolid,
  ['card-back-solid']: CardBackSolid,
  twitch: Twitch,
  windows: Windows,
  ['element-air']: ElementAir,
  ['element-dark']: ElementDark,
  ['element-earth']: ElementEarth,
  ['element-fire']: ElementFire,
  ['element-light']: ElementLight,
  ['element-metal']: ElementMetal,
  ['element-mind']: ElementMind,
  ['element-water']: ElementWater,
  ['lock-water']: LockStroke,
  ['trait-armor']: TraitArmor,
  ['trait-banner']: TraitBanner,
  ['trait-dash']: TraitDash,
  ['trait-guard']: TraitGuard,
  ['trait-lifesteal']: TraitLifesteal,
  ['trait-stealth']: TraitStealth,
  ['trait-wither']: TraitWither,
  ['trigger-continuous']: TriggerContinuous,
  ['trigger-death']: TriggerDeath,
  ['trigger-generic']: TriggerGeneric,
  ['trigger-glory']: TriggerGlory,
  ['trigger-inspire']: TriggerInspire,
  ['trigger-play']: TriggerPlay,
  ['trigger-slay']: TriggerSlay,
  ['trigger-summon']: TriggerSummon,
  ['trigger-sunrise']: TriggerSunrise,
  ['trigger-sunset']: TriggerSunset,
  unit: Unit,
  spell: Spell,
  ['edit-deck']: EditDeck,
  ['save-deck']: SaveDeck,
  xp: Xp
}

export type ImageIconTypes = keyof typeof ImageIcons

export const ImageIconKeys = Object.keys(ImageIcons) as ImageIconTypes[]
// eslint-disable-next-line react-refresh/only-export-components
export function isImageIcon(s: string): s is ImageIconTypes {
  return s in ImageIcons
}
