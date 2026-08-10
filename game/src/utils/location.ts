import {
  changeUrlAndReload,
  queryStringUrlReplacement
} from '@opensky/shared/utils/location'

import queryParams from '../queryParams'

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
