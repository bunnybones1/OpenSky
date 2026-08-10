import type { VocabStatsData } from '@opensky/design-data/schema/compiledVocab'
import type { BaseCard, Trait } from '@skyweaver/state-metadata-sys'
import { CardLibrary, VocabLibrary } from './stats'

export enum VocabReason {
  BaseTrait,
  AddedTrait,
  Referenced
}

export type VocabCard = {
  base: BaseCard
  traits?: Trait[]
}

export type VocabOnCard = {
  vocabID: string
  vocab: VocabStatsData
  reason: VocabReason
}

export function getTooltipsForCards(cards: Array<VocabCard>): VocabOnCard[] {
  const explainers: Array<VocabOnCard> = []
  for (const vc of cards) {
    const thisCardExplainers: VocabOnCard[] = []
    const card = CardLibrary.get(vc.base)!
    const traits = vc.traits || card.traits
    for (const [vocabID, tooltip] of VocabLibrary) {
      if (explainers.some(e => e.vocabID === vocabID)) {
        continue
      }
      if (tooltip.restrict && tooltip.restrict !== card.type.toLowerCase()) {
        continue
      }
      if (tooltip.type === 'trait') {
        const trait = tooltip.pattern
          .replace(/[{}]/g, '')
          .toLowerCase() as Trait
        if (traits.includes(trait)) {
          const baseCardHasTrait = card.traits.includes(trait)
          thisCardExplainers.push({
            reason: baseCardHasTrait
              ? VocabReason.BaseTrait
              : VocabReason.AddedTrait,
            vocab: tooltip,
            vocabID
          })
          continue
        }
      }
      if (card.textVocab.includes(vocabID)) {
        thisCardExplainers.push({
          reason: VocabReason.Referenced,
          vocab: tooltip,
          vocabID
        })
      }
    }
    explainers.push(...thisCardExplainers.sort((a, b) => a.reason - b.reason))
  }
  return [...explainers]
}

export function getDiscoveryOdds(): undefined {
  return undefined
}
