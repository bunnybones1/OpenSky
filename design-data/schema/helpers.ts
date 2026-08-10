export function prismFromCardID(thisCardId: string) {
  const id = Number.parseInt(thisCardId)
  if ((id >= 20000 && id < 30000) || (id >= 40000 && id < 50000)) {
    return 'tok'
  } else if (id >= 30000 && id < 40000) {
    return 'tut'
  } else {
    return null
  }
}
