export function mapRange(
  value: number,
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number
) {
  return bMin + ((bMax - bMin) * (value - aMin)) / (aMax - aMin)
}
