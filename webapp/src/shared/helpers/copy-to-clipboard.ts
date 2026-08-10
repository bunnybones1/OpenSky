export const copyToClipBoard = (text: string) => {
  return new Promise((resolve, _) => {
    return navigator.clipboard.writeText(text).then(
      () => {
        resolve(true)
      },
      () => {
        resolve(false)
      }
    )
  })
}
