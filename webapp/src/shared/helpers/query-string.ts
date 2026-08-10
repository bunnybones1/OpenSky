export const serializeObjectToQueryString = function (obj) {
  const str = [] as string[]
  for (const p in obj)
    if (
      obj.hasOwnProperty(p) &&
      obj[p] &&
      (!Array.isArray(obj[p]) || obj[p].length)
    ) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
    }
  return str.join('&')
}

export const deserializeQueryStringToObject = function (
  queryString,
  arrayKeys?: string[]
) {
  const nonFilterParams = ['sorting']
  // Base parse
  try {
    const deserializedFilters = JSON.parse(
      '{"' + decodeURI(queryString.replace(/&/g, '","').replace(/=/g, '":"')) + '"}'
    )

    // Parse array
    for (const p in deserializedFilters)
      if (deserializedFilters.hasOwnProperty(p)) {
        // Check if its been serialized as an array,
        // or interface expects an array input for this parameter
        if (
          deserializedFilters[p].includes('%2C') ||
          (arrayKeys && arrayKeys.includes(p))
        ) {
          const split = deserializedFilters[p].split('%2C')
          deserializedFilters[p] = split
        }

        // Delete non filter params such as sorting
        if (nonFilterParams.includes(p)) {
          delete deserializedFilters[p]
        }
      }

    return deserializedFilters
  } catch (err) {
    console.error('Malformed query params:', queryString)
    return undefined
  }
}

export const sortingStringSplit = function (queryStringSplit) {
  const sortingSplit = queryStringSplit[1].split('sorting=')[1]
  if (sortingSplit) {
    return sortingSplit.includes('&') ? sortingSplit.split('&')[0] : sortingSplit
  }

  return undefined
}
