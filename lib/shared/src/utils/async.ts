export function delayPromise(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
