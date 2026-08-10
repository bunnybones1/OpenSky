import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { useInvitePointsForUser } from '~/shared/queries/invite-a-friend/useInvitePointsForUser'

import { InvitedFriendsHeader } from './components/InvitedFriendsHeader'
import { InvitedFriendsRow } from './components/InvitedFriendsRow'

const InvitedFriends = memo(() => {
  const { data: points, isLoading } = useInvitePointsForUser()
  const { t } = useTranslation()

  const renderInner = () => {
    if (isLoading) {
      return (
        <FlexBox
          height={175}
          width="100%"
          alignItems="center"
          justifyContent="center"
        >
          <Icon type="spinner" color="purple8" height="32px" />
        </FlexBox>
      )
    }

    if (!points || !points.friends.length) {
      return (
        <FlexBox
          height={175}
          width="100%"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
        >
          <Text
            color="white"
            fontFamily="condensed"
            fontWeight="extraBold"
            lineHeight="24px"
            fontSize={22}
            textWrap
          >
            {t('inviteFriends.noFriendsHeader')}
          </Text>
          <Text
            color="purple9"
            fontWeight="medium"
            lineHeight="18px"
            fontSize={14}
            textWrap
            maxWidth={416}
            mt={8}
            textAlign="center"
          >
            {t('inviteFriends.noFriendsBody')}
          </Text>
        </FlexBox>
      )
    }

    return (
      <FlexBox
        width="100%"
        maxWidth={754}
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="flex-start"
        pb={32}
      >
        <FlexBox
          width="100%"
          alignItems="center"
          justifyContent="center"
          mt={32}
          mb={16}
        >
          <Text
            fontSize={18}
            color="purple9"
            fontFamily="condensed"
            lineHeight="21.6px"
            fontWeight="bold"
          >
            {t('inviteFriends.topFriends')}
          </Text>
        </FlexBox>
        {points.friends && points.friends.length > 5 && (
          <FlexBox width="100%" alignItems="center" justifyContent="center" my={16}>
            <Text
              fontSize={14}
              color="purple9"
              fontFamily="condensed"
              lineHeight="16px"
              fontWeight="bold"
            >
              {t('inviteFriends.maxFriends')}
            </Text>
          </FlexBox>
        )}
        <InvitedFriendsHeader />
        {points.friends.map((friend) => {
          if (!friend.account) return null
          return (
            <InvitedFriendsRow
              key={friend.account.address}
              address={friend.account.address}
              points={friend.points}
            />
          )
        })}
        <Text
          fontSize={12}
          color="purple9"
          fontWeight="medium"
          mt={16}
          width="100%"
          textAlign="center"
        >
          {t('inviteFriends.top5Disclaimer')}
        </Text>
      </FlexBox>
    )
  }

  return (
    <FlexBox
      width="100%"
      bg="purple1"
      borderBottom="1px solid"
      borderColor="purple7"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      px={32}
    >
      {renderInner()}
    </FlexBox>
  )
})

export default InvitedFriends

InvitedFriends.displayName = 'InvitedFriends'
