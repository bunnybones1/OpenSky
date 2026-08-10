import styled from '@emotion/styled'
import { memo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMount } from 'react-use'

import { EmptyFeed } from '~/AccountPage/AccountStats/RewardsFeed/components/EmptyFeed'
import { FeedRow } from '~/AccountPage/AccountStats/RewardsFeed/FeedList/FeedRow/FeedRow'
import { APIClient } from '~/shared/clients'
import { FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { useFeed } from '~/shared/queries/useFeed'

import AdminMatchesTable from '../shared/components/AdminMatchesTable/AdminMatchesTable'
import AdminUserDetails from './AdminUserDetails/AdminUserDetails'
import AdminRankedWarmup from './components/AdminRankedWarmup'
import AdminUserLevel from './components/AdminUserLevel'
import { AdminUserQuests } from './components/AdminUserQuests'
import AdminUserRank from './components/AdminUserRank'
import AdminUserSignals from './components/AdminUserSignals'
import AdminUserSkypassPremium from './components/AdminUserSkypassPremium'
import { UserAccount } from './shared/types'

const AdminUser = memo(() => {
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<null | Readonly<UserAccount>>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadAccount = async (search?: string) => {
    if (!search) return

    setLoading(true)
    const addrOrName = isAddr(search) ? { accountAddress: search } : { name: search }
    try {
      const account = await APIClient.opensky.gMFindAccount(addrOrName)
      const [banStatus, score] = await Promise.all([
        getBanStatus(account.account.address),
        APIClient.opensky.gMAccountSignalSummaries({
          accountStatus: [],
          accountAddress: account.account.address
        })
      ])

      setAccount({ account: account.account, banStatus, score })
      setLoading(false)
    } catch (e) {
      if (typeof e === 'string') {
        setError(e)
      } else if (e instanceof Error) {
        setError(e.message)
      }
      setLoading(false)
      setAccount(null)
    }
  }

  const { data: feedItems } = useFeed(account?.account.address)

  useMount(() => {
    loadAccount(id)
  })

  if (error)
    return (
      <FlexBox width="100%" py={32} type="centered-column">
        <Title>Something Went Wrong</Title>
        <pre>Error: {error}</pre>
      </FlexBox>
    )

  if (loading)
    return (
      <LoadingContainer>
        <Icon type="spinner" height="48px" color="white" />
      </LoadingContainer>
    )

  if (!account)
    return (
      <FlexBox width="100%" py={32} type="centered-column">
        <Title>User Not Found</Title>
        <SubTitle>ID: {id}</SubTitle>
      </FlexBox>
    )

  const reloadAccount = () => loadAccount(account.account.address)

  return (
    <FlexBox
      width="100%"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
    >
      <FlexBox
        flexDirection="column"
        alignItems="center"
        justifyContent="flex-start"
        style={{ gap: 32 }}
        width="100%"
        marginTop="32px"
        maxWidth="1132px"
      >
        <AdminUserDetails
          account={account}
          setAccount={setAccount}
          reloadAccount={reloadAccount}
        />
        <AdminUserQuests address={account.account.address} />
        <AdminRankedWarmup
          account={account.account}
          onRankedWarmupGamesSet={reloadAccount}
        />
        <AdminUserLevel account={account.account} onLevelSet={reloadAccount} />
        <AdminUserSkypassPremium
          account={account.account}
          onSetPremium={reloadAccount}
        />
        <AdminUserRank account={account.account} onRankSet={reloadAccount} />
        <AdminUserSignals account={account.account.address} />
        <AdminMatchesTable address={account.account.address} />
        <FlexBox
          type="start-column"
          width="100%"
          style={{ gap: 32 }}
          position="relative"
        >
          <Title style={{ margin: '20px auto 0px auto' }}>Rewards</Title>
          <FlexBox
            className="feedListWrapper"
            type="centered-column"
            width="100%"
            maxWidth="800px"
            margin="0px auto"
            position="relative"
          >
            {!!feedItems &&
              feedItems.feed.map((feedItem) => (
                <FeedRow key={feedItem.id} feedItem={feedItem} />
              ))}
            {(feedItems === null || !feedItems?.feed.length) &&
              feedItems !== undefined && <EmptyFeed />}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  )
})

export default AdminUser

function isAddr(s: string) {
  return s.length === 42 && s.startsWith('0x')
}

const getBanStatus = (address: string) =>
  APIClient.opensky.gMIsAccountBanned({ account: address })

const Title = styled.h2`
  font-size: 150%;
  font-weight: bold;
  padding: 16px 0px;
  display: inline-block;
  color: ${({ theme }) => theme.colors.purple9};
`

const SubTitle = styled.h2`
  font-size: 100%;
  font-weight: bold;
  padding: 16px 0px;
  display: inline-block;
  color: ${({ theme }) => theme.colors.purple9};
`

const LoadingContainer = styled.div`
  position: absolute;
  top: calc(50%);
  left: calc(50% - 32px);
`

AdminUser.displayName = 'AdminUser'
