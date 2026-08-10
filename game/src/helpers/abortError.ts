const handlers = new Set<(err: any) => void>()
export const onAbortError = new Promise<void>((_, reject) =>
  handlers.add(reject)
)

/// Throws a hard error in OpenSky.
export function abort(err: any) {
  handlers.forEach(h => h(err))
}
