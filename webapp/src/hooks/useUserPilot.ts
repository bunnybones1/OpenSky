import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Userpilot } from 'userpilot'

import env from '~/env'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'

export const useUserPilot = () => {
  const location = useLocation()
  const { data: authedUser } = useAuthedAccount()

  const { i18n } = useTranslation()
  useEffect(() => {
    if (!!env.USER_PILOT_TOKEN && !!authedUser) {
      const dataToSend = {
        // NOTE
        // This exact key/vaue format is required by userpilot for i18n support.
        // Do not modify or remove this key, or we might lose translation support in userpilot.
        locale_code: i18n.language,
        // end NOTE

        name: authedUser.name,
        level: authedUser.level,
        warmUps: authedUser.warmUps,
        seasonLevel: authedUser.seasonLevel,
        updatedAt: authedUser.updatedAt,
        createdAt: authedUser.createdAt,
        experience: authedUser.experience,
        constructedRank: authedUser.stats?.rankedConstructed?.playerRank,
        constructedRankStage: authedUser.stats?.rankedConstructed?.playerRankStage,
        discoveryRank: authedUser.stats?.rankedDiscovery?.playerRank,
        discoveryRankStage: authedUser.stats?.rankedDiscovery?.playerRankStage
      }

      // eslint-disable-next-line no-console
      console.log('SENDING ACCOUNT DATA TO USERPILOT: ', dataToSend)

      Userpilot.identify(authedUser.address, dataToSend)
    }
  }, [authedUser, i18n.language])

  useEffect(() => {
    if (!!env.USER_PILOT_TOKEN && !!authedUser) {
      Userpilot.reload()
    }
  }, [location, authedUser])
}
