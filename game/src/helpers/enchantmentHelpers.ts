import { BaseCard } from '@skyweaver/state-metadata'

type EnchantName =
  | 'Anima'
  | 'Barrier'
  | 'Blind'
  | 'Chains'
  | 'Dazed'
  | 'Fate'
  | 'Flames'
  | 'Frozen'
  | 'Fury'
  | 'Hex'
  | 'Lead'
  | 'Roots'
  | 'Shield'
  | 'Shroud'
  | 'Silence'
  | 'Vapors'

export const enchantIdsByName: { [K in EnchantName]: BaseCard } = {
  Anima: '20039',
  Barrier: '20053',
  Blind: '20050',
  Chains: '20027',
  Dazed: '20032',
  Fate: '20049',
  Flames: '20023',
  Frozen: '20009',
  Fury: '20051',
  Hex: '20028',
  Lead: '20047',
  Roots: '20010',
  Shield: '20019',
  Shroud: '20042',
  Silence: '20048',
  Vapors: '20054'
}

export const enchantNamesByCardId = new Map<BaseCard, EnchantName>()
for (const key of Object.keys(enchantIdsByName) as EnchantName[]) {
  enchantNamesByCardId.set(enchantIdsByName[key], key)
}

const enchantsWithDmgSound: EnchantName[] = ['Flames', 'Frozen', 'Hex']
export function dmgSoundByBaseId(base: BaseCard) {
  if (enchantNamesByCardId.has(base)) {
    const enchantName = enchantNamesByCardId.get(base)!
    if (enchantsWithDmgSound.includes(enchantName)) {
      return enchantName
    }
  }
  return undefined
}
