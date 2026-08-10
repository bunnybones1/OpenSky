import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Tab } from '~/__deprecated__/Tab'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import useAdminAuth from '~/shared/hooks/useAdminAuth'
import { useIsExternalProfile } from '~/shared/hooks/useIsExternalProfile'
import { authenticationState } from '~/shared/state/authentication-state'

import { MatchHistory } from './MatchHistory/MatchHistory'
import { RewardsFeed } from './RewardsFeed/RewardsFeed'
import { StatsSection } from './StatsSection/StatsSection'

type State = 'rewards' | 'stats' | 'matches' | 'new-matches'

const AccountStats = memo(() => {
  const [activeSection, setActiveSection] = useState<State>('rewards')
  const { userAddress } = useSnapshot(authenticationState)

  const isExternalProfile = useIsExternalProfile()

  const { t } = useTranslation()

  const { isAdmin } = useAdminAuth(userAddress)

  const tabItems = useMemo(() => {
    if (!isExternalProfile || isAdmin) {
      return [
        { text: t('profile.REWARDS'), value: 'rewards' },
        { text: t('profile.MATCHES'), value: 'matches' },
        { text: t('profile.STATS'), value: 'stats' }
      ]
    } else {
      return [
        { text: t('profile.REWARDS'), value: 'rewards' },
        { text: t('profile.STATS'), value: 'stats' }
      ]
    }
  }, [isAdmin, isExternalProfile, t])

  return (
    <FlexBox
      width="100%"
      height="auto"
      type="centered-start-column"
      px={[40, 40, 40, 20]}
      zIndex={2}
      bg="purple1"
    >
      <FlexBox
        width="100%"
        pb={20}
        pt={[40, 40, 40, 52]}
        type="centered-row"
        zIndex={2}
      >
        <Tab
          buttonWidth={75}
          items={tabItems}
          selected={[activeSection]}
          allowNoSelection={false}
          allowMultiSelection={false}
          onChange={(selected: Array<string | number>) =>
            setActiveSection(selected[0] as State)
          }
        />
      </FlexBox>
      <FlexBox
        width="100%"
        justifyContent="center"
        alignItems="start"
        pb={[40, 40, 60, 100]}
      >
        <Box width="100%" maxWidth={[620, 620, 620, 720, 800]}>
          {activeSection === 'rewards' && <RewardsFeed />}
          {activeSection === 'stats' && <StatsSection />}
          {activeSection === 'matches' && <MatchHistory />}
        </Box>
      </FlexBox>
    </FlexBox>
  )
})

export default AccountStats

AccountStats.displayName = 'AccountStats'
