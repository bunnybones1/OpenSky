export const replaceOldFormatExt = (filePath: string) => {
  if (filePath.includes('.png')) {
    return filePath.replace('.png', '.webp')
  }
  if (filePath.includes('.jpg')) {
    return filePath.replace('.jpg', '.webp')
  }
  if (filePath.includes('.jpeg')) {
    return filePath.replace('.jpeg', '.webp')
  }
  return filePath
}
