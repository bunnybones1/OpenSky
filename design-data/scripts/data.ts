import {
  CardsSheetSchema,
  CardsSheetType,
  GlobalDataSchema,
  GlobalDataType
} from '../schema'
import { cardsFolderPath, dataFolderPath } from './dataLocations'
import { filesystemToJSON } from './fs-to-json'

export async function getDesignDataAsObject(): Promise<GlobalDataType> {
  return GlobalDataSchema.parse(await filesystemToJSON(dataFolderPath))
}

export async function getCardsAsObject(): Promise<CardsSheetType> {
  return CardsSheetSchema.parse(await filesystemToJSON(cardsFolderPath))
}
