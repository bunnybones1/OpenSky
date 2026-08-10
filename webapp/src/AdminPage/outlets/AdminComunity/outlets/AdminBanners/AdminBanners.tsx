import styled from '@emotion/styled'
import { memo, useEffect } from 'react'

import { Input } from '~/__deprecated__/Input/Input'
import { Box, FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { useSetBanners } from '~/shared/queries/useBanners'

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
import useBanners from './hooks/useBanners'

type ContainerProps = {
  children: JSX.Element
  loading: boolean
}

const Container = ({ children, loading }: ContainerProps) => {
  return (
    <AdminDetails>
      <AdminDetailsContent>
        <FlexBox justifyContent="space-between" alignItems="center" pr={8}>
          <SubTitle>Banners</SubTitle>
          {loading && <Icon type="spinner" height="24px" color="purple7" />}
        </FlexBox>
      </AdminDetailsContent>

      <AdminDetailsContainer>{children}</AdminDetailsContainer>
    </AdminDetails>
  )
}

const AdminBanners = memo(() => {
  const {
    addBanner,
    banners,
    loading,
    removeBanner,
    setBannerMessage,
    bannerMessage,
    setBannerColor,
    bannerColor,
    setBannerStart,
    bannerStart,
    setBannerEnd,
    bannerEnd,
    setBannerOrder,
    bannerOrder,
    bannerEditId,
    loadBannerToEdit,
    resetInputs,
    editBanner
  } = useBanners()

  useEffect(() => {
    // addBanner()
  }, [])

  const setBanners = useSetBanners()

  const handleBannerMessageChange = ({ target: { value } }) => {
    setBannerMessage(value)
  }

  const handleBannerColorChange = ({ target: { value } }) => {
    setBannerColor(value)
  }

  const handleBannerStartChange = ({ target: { value } }) => {
    setBannerStart(value)
  }

  const handleBannerEndChange = ({ target: { value } }) => {
    setBannerEnd(value)
  }

  const handleBannerOrderChange = ({ target: { value } }) => {
    setBannerOrder(Number(value))
  }

  return (
    <Container loading={loading}>
      <>
        <AdminBannersTable style={{ borderTop: '1px solid #4d3c7b' }}>
          {banners && loading === false && (
            <>
              <AdminBannersHeaderRow>
                <AdminBannersCell>id</AdminBannersCell>
                <AdminBannersCell>Msg</AdminBannersCell>
                <AdminBannersCell>BG Color (Hex)</AdminBannersCell>
                <AdminBannersCell>Start (ISO UTC)</AdminBannersCell>
                <AdminBannersCell>End (ISO UTC)</AdminBannersCell>
                <AdminBannersCell>Order</AdminBannersCell>
                <AdminBannersCell>Options</AdminBannersCell>
              </AdminBannersHeaderRow>

              {banners.map((banner, i) => (
                <AdminBannersRow key={i}>
                  <AdminBannersCell
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                      alignItems: 'center'
                    }}
                  >
                    {banner.id}
                  </AdminBannersCell>
                  <AdminBannersCell>{banner.msg}</AdminBannersCell>
                  <AdminBannersCell
                    style={{ background: banner.color, color: 'white' }}
                  >
                    {banner.color}
                  </AdminBannersCell>
                  <AdminBannersCell>
                    {banner.startAt ? new Date(banner.startAt).toISOString() : ''}
                  </AdminBannersCell>
                  <AdminBannersCell>
                    {banner.endAt ? new Date(banner.endAt).toISOString() : ''}
                  </AdminBannersCell>
                  <AdminBannersCell>{banner.order}</AdminBannersCell>
                  <AdminBannersCell
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Icon
                      height="16px"
                      type="gear"
                      onClick={() => {
                        loadBannerToEdit(banner)
                      }}
                      color="forest4"
                    />
                    <Icon
                      height="16px"
                      type="eye"
                      onClick={() => {
                        setBanners([{ ...banner, id: 99999 + banner.id }])
                      }}
                      color="white"
                      style={{ marginLeft: '5px' }}
                    />
                    <Icon
                      height="24px"
                      type="close"
                      onClick={() => {
                        if (window.confirm('Delete banner?')) {
                          removeBanner(banner.id)
                        }
                      }}
                      color="warm9"
                    />
                  </AdminBannersCell>
                </AdminBannersRow>
              ))}

              <AdminBannersRow key={'addnewbanner'}>
                <AdminBannersCell>
                  {bannerEditId && <>EDIT {bannerEditId}</>}
                  <FlexBox>
                    <Icon
                      height="24px"
                      type="plus"
                      onClick={() => {
                        if (bannerEditId) {
                          editBanner()
                        } else {
                          addBanner()
                        }
                      }}
                      color="forest4"
                    />
                    {bannerEditId && (
                      <Icon
                        height="24px"
                        type={'close'}
                        onClick={() => {
                          resetInputs()
                        }}
                        color="warm9"
                      />
                    )}
                  </FlexBox>
                </AdminBannersCell>
                <AdminBannersCell>
                  <Input
                    onChange={handleBannerMessageChange}
                    value={bannerMessage}
                    type={'text'}
                    rounded
                    showBg
                    isSmallScreen
                    height="100px"
                  />
                </AdminBannersCell>
                <AdminBannersCell>
                  <Input
                    onChange={handleBannerColorChange}
                    value={bannerColor}
                    type={'text'}
                    rounded
                    showBg
                    isSmallScreen
                    height="100px"
                  />
                </AdminBannersCell>
                <AdminBannersCell>
                  <Input
                    onChange={handleBannerStartChange}
                    value={bannerStart}
                    type={'text'}
                    rounded
                    showBg
                    isSmallScreen
                    height="100px"
                  />
                </AdminBannersCell>
                <AdminBannersCell>
                  <Input
                    onChange={handleBannerEndChange}
                    value={bannerEnd}
                    type={'text'}
                    rounded
                    showBg
                    isSmallScreen
                    height="100px"
                  />
                </AdminBannersCell>
                <AdminBannersCell>
                  <Input
                    onChange={handleBannerOrderChange}
                    value={bannerOrder}
                    type={'number'}
                    rounded
                    showBg
                    isSmallScreen
                    height="100px"
                  />
                </AdminBannersCell>
              </AdminBannersRow>
            </>
          )}
          <Box p={'16px'} style={{ userSelect: 'text' }}>
            <FlexBox style={{ fontWeight: 600 }} py={'4px'}>
              Banner Key:
            </FlexBox>
            <FlexBox style={{ fontWeight: 600 }} py={'4px'}>
              Msg:
            </FlexBox>{' '}
            This should contain the text to be displayed in the banner. You can use
            bold and custom text colors. Example:{' '}
            {
              '<span>normal</span><strong>bold</strong><span><span style="color:#cfff15">colored</span><strong style="color:#cfff15">bold color</strong>'
            }{' '}
            <FlexBox style={{ fontWeight: 600 }} py={'4px'}>
              BG Color:
            </FlexBox>{' '}
            Should receive a hex value like #f00f00 for the background. Recommended:
            Info = &quot#006A93&quot Warning = &quot#BC4918&quot Emergency =
            &quot#A9094C&quot
            <FlexBox style={{ fontWeight: 600 }} py={'4px'}>
              Start and End time:
            </FlexBox>{' '}
            These values can be left blank if you want it to start straight away and
            last indefinitely. Otherwise you can provide an ISO String like
            2022-05-25T10:06:21.239Z
            <FlexBox style={{ fontWeight: 600 }} py={'4px'}>
              Order:
            </FlexBox>{' '}
            The order priority will take higher values as priority, for example an
            order priority of 2 will show before 1.
          </Box>
        </AdminBannersTable>
      </>
    </Container>
  )
})

const columns = '0.4fr 2fr 0.66fr 1fr 1fr 0.4fr 0.6fr'
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

export default AdminBanners

AdminBanners.displayName = 'AdminBanners'
