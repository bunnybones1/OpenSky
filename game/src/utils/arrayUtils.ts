/**
 *  Returns an array of all `k`-length combinations of `set`.
 *  */
export function kCombinations<T>(set: T[], k: number): Array<Array<T>> {
  if (k > set.length || k <= 0) {
    return []
  }
  if (k == set.length) {
    return [set]
  }
  if (k == 1) {
    return set.map(item => [item])
  }
  const combs = []
  for (let i = 0; i < set.length - k + 1; i++) {
    const head = set.slice(i, i + 1)
    const tailcombs = kCombinations(set.slice(i + 1), k - 1)
    for (const comb of tailcombs) {
      combs.push(head.concat(comb))
    }
  }
  return combs
}

export function randomSample<T extends readonly unknown[]>(
  arr: T,
  sampleSize: number
): T[number][] {
  if (arr.length <= sampleSize) {
    return [...arr]
  }
  const sample = []
  const sampled: Partial<{ [index: number]: boolean }> = {}
  while (sample.length < sampleSize) {
    const index = Math.floor(Math.random() * arr.length)
    if (!sampled[index]) {
      sample.push(arr[index])
      sampled[index] = true
    }
  }
  return sample
}
