import { Vocab } from './vocab'

export const vocabStatsProps = [
  'icon',
  'pattern',
  'restrict',
  'type'
] satisfies Array<keyof Vocab>

type VocabPickedStatsProps = (typeof vocabStatsProps)[number]

export type VocabStatsData = Pick<Vocab, VocabPickedStatsProps>

export function designVocabToStatsData(vocab: Vocab): VocabStatsData {
  const picked: Record<string, any> = {}
  for (const prop of vocabStatsProps) {
    picked[prop] = vocab[prop]
  }
  // This is a dangerous type-assert. This will only be correct if the above loop is correct.
  const finishedPicked = picked as VocabStatsData

  return finishedPicked
}
