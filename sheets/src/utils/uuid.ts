export function randomUUID() {
  return (`${1e7}` + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (cString) => {
    const c = Number.parseInt(cString, 10)
    return (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  })
}
