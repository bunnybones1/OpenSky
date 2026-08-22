type Warn = (message: string) => void

export const reportCachePrune = (
  count: number,
  description: string,
  warn: Warn = console.warn
) => {
  if (count <= 0) return

  warn(`Found ${count} ${description} to prune.`)
}
