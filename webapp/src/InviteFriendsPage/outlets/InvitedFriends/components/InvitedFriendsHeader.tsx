import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'

import { INVITED_FRIENDS_TABLE_WIDTHS } from '../shared/constants'
import { BaseCell } from '../shared/style'

export const InvitedFriendsHeader = memo(() => {
  const { t } = useTranslation()

  return (
    <FlexBox
      width="100%"
      height={64}
      alignItems="flex-start"
      justifyContent="flex-start"
      bg="purple2"
      border="1px solid"
      borderColor="purple5"
      flexWrap="nowrap"
    >
      <BaseCell
        style={{
          width: `${INVITED_FRIENDS_TABLE_WIDTHS.USER}px`,
          flexGrow: INVITED_FRIENDS_TABLE_WIDTHS.USER
        }}
      >
        <FlexBox
          height="100%"
          width="100%"
          borderRight="1px solid"
          borderColor="purple5"
          alignItems="center"
          pl={16}
          justifyContent="flex-start"
        >
          <Text fontSize={14} color="white" textWrap fontWeight="medium">
            {t('general.Player')}
          </Text>
        </FlexBox>
      </BaseCell>
      <BaseCell
        style={{
          width: `${INVITED_FRIENDS_TABLE_WIDTHS.JOINED}px`,
          flexGrow: INVITED_FRIENDS_TABLE_WIDTHS.JOINED
        }}
      >
        <FlexBox
          height="100%"
          width="100%"
          borderRight="1px solid"
          borderColor="purple5"
          alignItems="center"
          justifyContent="center"
          px={16}
        >
          <Text
            fontSize={14}
            color="white"
            fontWeight="medium"
            textWrap
            textAlign="center"
          >
            {t('inviteFriends.joinedOnHeader')}
          </Text>
        </FlexBox>
      </BaseCell>
      <BaseCell
        style={{
          width: `${INVITED_FRIENDS_TABLE_WIDTHS.POINTS}px`,
          flexGrow: INVITED_FRIENDS_TABLE_WIDTHS.POINTS
        }}
      >
        <FlexBox
          height="100%"
          width="100%"
          alignItems="center"
          justifyContent="center"
          px={16}
        >
          <Text fontSize={14} color="white" fontWeight="medium" textWrap>
            {t('general.Points')}
          </Text>
        </FlexBox>
      </BaseCell>
    </FlexBox>
  )
})

InvitedFriendsHeader.displayName = 'InvitedFriendsHeader'
