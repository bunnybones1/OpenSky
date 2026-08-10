export const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : null

export const trimAddress = (adddress: string, chars: number = 6) => {
  const startTrim = adddress.substr(0, chars)
  const endTrim = adddress.substr(adddress.length - chars, adddress.length)
  return startTrim + '...' + endTrim
}

export const formatRegion = (region?: string) => {
  if (!region) return ''

  // @ts-ignore
  const intl = new Intl.DisplayNames(['en'], { type: 'region' })
  return intl.of(region.substr(0, 2).toUpperCase())
}

export const toKebab = (text: string) =>
  text
    .split('')
    .map((letter) => {
      if (/[A-Z]/.test(letter)) return `${letter.toLowerCase()}`
      return letter
    })
    .join('')
    .trim()
    .replace(/[_\s]+/g, '-')

export const toTitleCase = (text: string) =>
  toKebab(text)
    .split('-')
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ')

export const formatDuration = (start?: string, end?: string) => {
  if (!start || !end) return 'None'
  const startTime = new Date(start)
  const endTime = new Date(end)
  const duration = (endTime.getTime() - startTime.getTime()) / 1000
  return formatSeconds(duration)
}

// HH:MM:SS or MM:SS
export const formatSeconds = (seconds: number = 0) => {
  const format = (val) => `0${Math.floor(val)}`.slice(-2)
  const hours = seconds / 3600
  const minutes = (seconds % 3600) / 60
  const parts = hours >= 1 ? [hours, minutes, seconds % 60] : [minutes, seconds % 60]

  return parts.map(format).join(':')
}
