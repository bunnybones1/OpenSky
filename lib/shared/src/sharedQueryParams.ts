import {
  changeUrlAndReload,
  getUrlFlag,
  getUrlFloat,
  getUrlParam,
  queryStringUrlReplacement,
} from './utils/location'

// prettier-ignore
const queryParams = {
  forcePixelRatio: getUrlFloat('forcePixelRatio', -1),
  resetSettings: getUrlFlag('resetSettings'),
  gltfFormat: getUrlParam('gltfFormat')
}

export function changeUrlParamAndReload(
  paramName: keyof typeof queryParams,
  value: string
) {
  changeUrlAndReload(queryStringUrlReplacement(location.href, paramName, value))
}

export function changeUrlParamWithoutReload(
  paramName: keyof typeof queryParams,
  value: string
) {
  window.history.pushState(
    {},
    '',
    queryStringUrlReplacement(location.href, paramName, value)
  )
}


export default queryParams
