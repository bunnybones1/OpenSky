export interface GetAssetContextValue {
  getAssetUrl?: (path: string) => string
}

export const DEFAULT_GET_ASSET_CONTEXT: GetAssetContextValue = {
  getAssetUrl: undefined
}
