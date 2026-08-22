import clsx from 'clsx'
import { memo, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, FlexBox } from '~/shared/components/Base'
import { Footer } from '~/shared/components/Footer/Footer'
import { LiveTwitchChannels } from '~/shared/components/LiveTwitchChannels/LiveTwitchChannels'
import { ProfileLink } from '~/shared/components/ProfileLink/ProfileLink'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useConquestRewards } from '~/shared/queries/useConquestRewards'
import { useNotifications } from '~/shared/queries/useNotifications'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GenericFeature } from './components/GenericFeature'
import { HomeFeatures } from './components/HomeFeatures'
import {
  NewsFeatureOne,
  NewsFeatureThree,
  NewsFeatureTwo
  // NewsFeatureFour
} from './components/NewsFeature'
import { HomePageMobileProfileLink } from './HomePage.css'
import { MainFeature } from './MainFeature/MainFeature'
import NotificationsDialog from './NotificationsDialog/NotificationsDialog'
import { NOTIFICATIONS_DIALOG_ID } from './shared/constants'

export const HomePage = memo(() => {
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { data: notifications } = useNotifications()
  const { data: conquestRewards } = useConquestRewards()
  const hasActiveConquestRewards =
    !!conquestRewards?.rewards.weeklyGolds.length

  const { Dialog, openDialog } = useDialog({
    Element: NotificationsDialog,
    id: NOTIFICATIONS_DIALOG_ID,
    isCloseButtonDisabled: true
  })

  // Show notifications, if any
  useEffect(() => {
    const useMockNotifications = false

    if (
      useMockNotifications ||
      (!!notifications?.notifications && notifications.notifications.length > 0)
    ) {
      openDialog()
    }
  }, [notifications, openDialog])

  const SecondaryFeature = useMemo(() => {
    return (
      <GenericFeature
        titleText={t(
          hasActiveConquestRewards
            ? 'home.mainFeatureConquest.title'
            : 'play.conquestRewardsInactive'
        )}
        bgImageKey={`webapp/backgrounds/${
          isTabletWide ? 'vertical' : 'horizontal'
        }_conquest_treasure.webp`}
      />
    )
  }, [hasActiveConquestRewards, isTabletWide, t])

  return (
    <>
      <FlexBox
        width="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent="flex-start"
      >
        {!isTabletWide && (
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 5
              }),
              HomePageMobileProfileLink
            )}
          >
            <ProfileLink isHomePageLink />
          </div>
        )}
        <HomeFeatures
          MainFeature={MainFeature}
          SecondaryFeature={SecondaryFeature}
          SmallFeatureOne={NewsFeatureOne}
          SmallFeatureTwo={NewsFeatureTwo}
          SmallFeatureThree={NewsFeatureThree}
        />
        <Box width="100%" mt="auto">
          <LiveTwitchChannels />
          <Footer />
        </Box>
      </FlexBox>
      {Dialog}
    </>
  )
})

HomePage.displayName = 'Home'

export default HomePage
