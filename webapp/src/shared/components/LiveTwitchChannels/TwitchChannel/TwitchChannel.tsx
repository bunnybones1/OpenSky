import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, Text } from '~/shared/components/Base'

import { useFeaturedStreamers } from './useFeaturedStreamers'

interface LiveFeedProps {
  data: any
}

export const TwitchChannel = memo(({ data }: LiveFeedProps) => {
  const { data: featuredStreamers } = useFeaturedStreamers()

  const featured =
    !!featuredStreamers && featuredStreamers.includes(data.user_name) ? true : false

  const { t } = useTranslation()

  if (!data.thumbnail_url) return null

  return (
    <Container
      backgroundColor="purple1"
      border="2px solid"
      borderColor={featured ? 'warm6' : 'purple5'}
      width="100%"
      padding="12px"
      position="relative"
    >
      <Viewers>{t('general.twitchViewers', { count: data.viewer_count })}</Viewers>
      <Live backgroundColor={featured ? 'warm5' : 'warm9'}>
        {featured && <>{t('general.FEATURED')}</>}
        {!featured && <>{t('general.LIVE')}</>}
      </Live>
      {/*featured && (
              <Box style={{ position: 'absolute', top: '21px', left: '90px' }}>
                <Icon
                  type="starhollow"
                  size={19}
                  color="warm6"
                  style={{ marginRight: '4px' }}
                />
              </Box>
            )*/}
      <img
        src={data.thumbnail_url.replace('{width}', '320').replace('{height}', '180')}
        width="100%"
      />
      <Title width={['200px', '270px', '270px', '270px']}>{data.title}</Title>
      <Name width={['200px', '270px', '270px', '270px']}>{data.user_name}</Name>
    </Container>
  )
})

const Container = styled(Box)`
  transition: all 0.1s linear;
  &:hover {
    border-color: rgba(197, 180, 245);
  }
`

const Live = styled(Box)`
  border-radius: 4px;
  position: absolute;
  left: 20px;
  top: 20px;
  color: white;
  padding: 4px 4px;
  font-weight: 600;
  font-size: 12px;
`

const Title = styled(Text)`
  color: #dedde3;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 4px 0px;
`

const Name = styled(Text)`
  color: #a8a8b3;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-bottom: 4px;
`

const Viewers = styled(Box)`
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px;
  position: absolute;
  right: 20px;
  top: 20px;
  border-radius: 2px;
  font-size: 12px;
`

TwitchChannel.displayName = 'TwitchChannel'
