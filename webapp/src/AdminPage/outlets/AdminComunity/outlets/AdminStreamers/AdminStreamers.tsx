import styled from '@emotion/styled'
import { memo } from 'react'

import { Input } from '~/__deprecated__/Input/Input'
import { FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'

import {
  AdminDetails,
  AdminDetailsContainer,
  AdminDetailsContent
} from '../../../shared/components/AdminDetails'
import {
  AdminCell,
  AdminHeaderRow,
  AdminRow,
  AdminTable
} from '../../../shared/components/AdminTable'
import useStreamers from './hooks/useStreamers'

type ContainerProps = {
  children: JSX.Element
  loading: boolean
}

const Container = ({ children, loading }: ContainerProps) => {
  return (
    <AdminDetails>
      <AdminDetailsContent>
        <FlexBox justifyContent="space-between" alignItems="center" pr={8}>
          <SubTitle>Featured Twitch Streamers</SubTitle>
          {loading && <Icon type="spinner" height="24px" color="purple7" />}
        </FlexBox>
      </AdminDetailsContent>

      <AdminDetailsContainer>{children}</AdminDetailsContainer>
    </AdminDetails>
  )
}

const AdminStreamers = memo(() => {
  const {
    featuredStreamers,
    loading,
    streamerUsername,
    setStreamerUsername,
    addFeaturedStreamer,
    removeFeaturedStreamer
  } = useStreamers()

  const handleStreamerUsernameChange = ({ target: { value } }) => {
    setStreamerUsername(value)
  }

  return (
    <Container loading={loading}>
      <>
        <AdminBannersTable style={{ borderTop: '1px solid #4d3c7b' }}>
          {featuredStreamers && loading === false && (
            <>
              <AdminBannersHeaderRow>
                <AdminBannersCell>Username</AdminBannersCell>
                <AdminBannersCell>Options</AdminBannersCell>
              </AdminBannersHeaderRow>

              {featuredStreamers.map((featuredStreamer, i) => (
                <AdminBannersRow key={i}>
                  <AdminBannersCell
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                      alignItems: 'center'
                    }}
                  >
                    {featuredStreamer.username}
                  </AdminBannersCell>
                  <AdminBannersCell
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Icon
                      height="24px"
                      type="close"
                      onClick={() => {
                        removeFeaturedStreamer(featuredStreamer.username)
                      }}
                      color="warm9"
                    />
                  </AdminBannersCell>
                </AdminBannersRow>
              ))}

              <AdminBannersRow key={'addnewbanner'}>
                <AdminBannersCell>
                  <Input
                    onChange={handleStreamerUsernameChange}
                    value={streamerUsername}
                    type={'text'}
                    rounded
                    showBg
                    isSmallScreen
                    height="50px"
                  />
                </AdminBannersCell>
                <AdminBannersCell>
                  <FlexBox>
                    <Icon
                      height="24px"
                      type={'plus'}
                      onClick={() => {
                        addFeaturedStreamer()
                      }}
                      color="forest4"
                    />
                  </FlexBox>
                </AdminBannersCell>
              </AdminBannersRow>
            </>
          )}
        </AdminBannersTable>
      </>
    </Container>
  )
})

const columns = '4fr 1fr'
const AdminBannersTable = styled(AdminTable)`
  border: 0;
`
const AdminBannersCell = styled(AdminCell)`
  user-select: text;
`
const AdminBannersHeaderRow = styled(AdminHeaderRow)`
  grid-template-columns: ${columns};
`
const AdminBannersRow = styled(AdminRow)`
  grid-template-columns: ${columns};

  &:last-child {
    border-bottom: 0;
  }
`
const SubTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.purple9};
`

export default AdminStreamers

AdminStreamers.displayName = 'AdminStreamers'
