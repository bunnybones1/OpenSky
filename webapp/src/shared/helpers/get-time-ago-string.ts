import { i18n } from '@opensky/language-manager'

export const getTimeAgoString = (toCompare: string | number | Date): string => {
  const nowDate = new Date(Date.now())
  const compareDate = new Date(toCompare)

  const diff = Math.abs(nowDate.valueOf() - compareDate.valueOf())

  const inSeconds = Math.round(diff / 1000)
  if (inSeconds < 60) return i18n.t('time.justNow')

  const inMinutes = Math.round(diff / 60000)
  if (inMinutes < 60) return `${i18n.t('time.minutesAgo', { minutes: inMinutes })}`

  const inHours = Math.round(diff / 3.6e6)
  if (inHours < 24) return `${i18n.t('time.hoursAgo', { hours: inHours })}`

  const inDays = Math.round(diff / 8.64e7)
  if (inDays < 8) return `${i18n.t('time.daysAgo', { days: inDays })}`

  return `${
    compareDate.getMonth() + 1
  }/${compareDate.getDate()}/${compareDate.getFullYear()}`
}
