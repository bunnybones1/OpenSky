import {
  CardElement,
  CardPrism,
  CardTraits,
  CardType
} from '@opensky/design-data/schema/cellTypes'
import { EffectType as CardEffectType } from '@opensky/design-data/schema/compiledCard'
import {
  EffectType,
  Element,
  Prism,
  Trait,
  Type
} from '@skyweaver/state-metadata-sys'

// Some type-level asserts to ensure things are consistent
// between `@skyweaver/state-metadata-sys` and `@opensky/design-data/schema`
// These will fail to compile if the types are not equivalent.

true satisfies Equals<CardElement, Element>
true satisfies Equals<CardPrism, Prism>
true satisfies Equals<CardType, Type>
true satisfies Equals<CardTraits[number], Trait>
true satisfies Equals<CardEffectType, EffectType>

// magic type from the internet :3
// https://github.com/microsoft/TypeScript/issues/27024#issuecomment-421529650
type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false
