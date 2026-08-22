/**
 * Preserve a Go float32 at the JSON boundary.
 *
 * Go's encoding/json emits the shortest decimal that round-trips to the same
 * float32. JavaScript stores Math.fround results as binary64, so returning the
 * raw result would expose expansions such as 3.190000057220459 instead.
 */
export const goFloat32 = (value: number): number => {
  const target = Math.fround(value)
  for (let precision = 1; precision <= 9; precision++) {
    const candidate = Number(target.toPrecision(precision))
    if (Object.is(Math.fround(candidate), target)) return candidate
  }
  return target
}

const float32Ratio = (numerator: number, denominator: number): number =>
  Math.fround(Math.fround(numerator) / Math.fround(denominator))

/** Match a Go float32 division and its encoding/json representation. */
export const goFloat32Ratio = (
  numerator: number,
  denominator: number
): number =>
  denominator === 0 ? 0 : goFloat32(float32Ratio(numerator, denominator))

/**
 * Match the source rank-progress calculation: float32 division, float32
 * multiplication by 100, floor as float64, divide by 100, then float32 JSON.
 */
export const goFloat32FloorHundredthsRatio = (
  numerator: number,
  denominator: number
): number => {
  if (denominator === 0) return 0
  const hundredths = Math.fround(
    float32Ratio(numerator, denominator) * Math.fround(100)
  )
  return goFloat32(Math.floor(hundredths) / 100)
}

/** Match Go's float32 division and multiplication used for win percentages. */
export const goFloat32Percentage = (
  numerator: number,
  denominator: number
): number => {
  if (denominator === 0) return 0
  const ratio = float32Ratio(numerator, denominator)
  return goFloat32(Math.fround(ratio * Math.fround(100)))
}
