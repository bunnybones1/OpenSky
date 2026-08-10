import { BaseCard } from '@skyweaver/state-metadata'

let heroAbilityAccentColorsLib: Map<BaseCard, [string, number]> | undefined
const DEFAULT_COLOR: [string, number] = ['#FFFFFF', 1]
export function getHeroAbilityAccentColorData(
  base: BaseCard
): [string, number] {
  if (!heroAbilityAccentColorsLib) {
    const lib = new Map()
    function add(base: BaseCard, colorStr: string, alpha = 1) {
      lib.set(base, [colorStr, alpha])
    }
    add('25000', '#D7404E', 0.8)
    add('25001', '#57CC7D', 0.8)
    add('25002', '#F214FF', 0.8)
    add('25003', '#4A60FF', 0.8)
    add('25004', '#C955E7', 0.8)
    add('25005', '#F15CF9', 0.8)
    add('25006', '#F15CF9', 0.8)
    add('25007', '#F15CF9', 0.8)
    add('25008', '#F15CF9', 0.8)
    add('25009', '#FF4A11', 0.7)
    add('25010', '#4A60FF', 0.8)
    add('25011', '#57CC7D', 0.8)
    add('25012', '#4A60FF', 0.8)
    add('25013', '#FF4A11', 0.8)
    add('25014', '#4A60FF', 0.8)
    add('25015', '#4A60FF', 0.8)
    add('25016', '#4A60FF', 0.8)
    add('25017', '#4A60FF', 0.8)
    add('25018', '#4A60FF', 0.8)
    add('25019', '#4A60FF', 0.8)
    add('25020', '#4A60FF', 0.8)
    add('25021', '#4A60FF', 0.8)
    add('25022', '#4A60FF', 0.8)
    add('25023', '#F15CF9', 0.8)
    add('25024', '#F15CF9', 0.8)
    add('25025', '#F15CF9', 0.8)
    add('25026', '#4A60FF', 0.8)
    
    heroAbilityAccentColorsLib = lib
  }
  if (heroAbilityAccentColorsLib.has(base)) {
    return heroAbilityAccentColorsLib.get(base)!
  } else {
    return DEFAULT_COLOR
  }
}
