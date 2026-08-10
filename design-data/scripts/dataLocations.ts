import path from 'node:path'

export const designDataFolderPath = path.join(__dirname, '../')
export const dataFolderPath = path.join(designDataFolderPath, './raw')
export const sheetsFolderPath = path.join(dataFolderPath, './sheets')
export const cardsFolderPath = path.join(sheetsFolderPath, './cards')
