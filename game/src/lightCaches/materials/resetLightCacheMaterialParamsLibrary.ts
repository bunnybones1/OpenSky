import { resetMaterialsRequest } from './lightCacheMatLib'

export function resetLightCacheMaterialParamsLibrary() {
  resetMaterialsRequest.value = true
  setTimeout(() => location.reload(), 200)
}
