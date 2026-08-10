export const padNumber = (toPad: number) => {
  const numberString = String(toPad)
  if (numberString.length < 2) return `0${numberString}`
  return numberString
}
