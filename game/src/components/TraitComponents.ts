import { Trait } from '@skyweaver/state-metadata'
import { Component } from 'gg'

import TraitArmorComponent from './TraitArmorComponent'
import TraitBannerComponent from './TraitBannerComponent'
import TraitDashComponent from './TraitDashComponent'
import TraitGuardComponent from './TraitGuardComponent'
import TraitLifestealComponent from './TraitLifestealComponent'
import TraitStealthComponent from './TraitStealthComponent'
import TraitWitherComponent from './TraitWitherComponent'

export const traitToComponentsMap: {
  [K in Trait]: new (_: void) => Component<void>
} = {
  armor: TraitArmorComponent,
  banner: TraitBannerComponent,
  guard: TraitGuardComponent,
  lifesteal: TraitLifestealComponent,
  stealth: TraitStealthComponent,
  wither: TraitWitherComponent,
  dash: TraitDashComponent
}
