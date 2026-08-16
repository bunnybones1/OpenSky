import styled from '@emotion/styled'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import env from '~/env'
import { SoundClient } from '~/shared/clients'
import { Box, Grid, Text } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { getExternalLink } from '~/shared/helpers/mobile-native-links'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { useTwitchStreams } from './queries/useTwitchStreams'
import { creatorProgramUrl, hasLiveTwitchStreams } from './twitchAvailability'
import { TwitchChannel } from './TwitchChannel/TwitchChannel'

export const LiveTwitchChannels = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  const { data: streams } = useTwitchStreams()

  const isWide = useResponsiveQuery('desktop')
  const configuredCreatorProgramUrl = creatorProgramUrl(env.CREATOR_PROGRAM_URL)

  const inner = useMemo(
    () =>
      (streams || []).map((stream) => (
        <TwitchChannel data={stream} key={stream.id} />
      )),
    [streams]
  )

  if (!hasLiveTwitchStreams(streams)) return null

  return (
    <>
      <Box
        borderTop="1px solid"
        borderColor="purple5"
        style={{
          width: '100%',
          backgroundImage: !!getAssetUrl
            ? `url(${getAssetUrl('webapp/backgrounds/livechannels-bg.webp')})`
            : undefined,
          padding: '25px 0px',
          backgroundSize: 'cover',
          position: 'relative',
          borderBottom: 'none',
          top: '0px'
        }}
      >
        <Box
          maxWidth="1440px"
          width="100%"
          style={{
            margin: isWide ? '0 auto' : '0 0 16 0'
          }}
        >
          <Box
            color="purple9"
            style={{
              fontSize: '26px',
              fontFamily: 'Barlow Condensed',
              fontWeight: 'bold'
            }}
            mb={'28px'}
            ml={['20px', '20px', '20px', '20px', '0px']}
          >
            {t('general.liveChannels')}
            {!!configuredCreatorProgramUrl && (
              <a
                href={getExternalLink(configuredCreatorProgramUrl)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', marginLeft: '12px' }}
                onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
                onMouseDown={() => SoundClient.playSound('CursorMainClick')}
              >
                <BecomeStreamer color="purple8" fontSize="14px" fontWeight="500">
                  {t('general.becomeAStreamer')}{' '}
                  <Box style={{ display: 'inline-block' }}>
                    <Icon
                      type="external"
                      color="purple8"
                      height="16px"
                      style={{
                        marginLeft: '4px',
                        top: '3px',
                        position: 'relative'
                      }}
                    />
                  </Box>
                </BecomeStreamer>
              </a>
            )}
          </Box>
          <Grid
            px={['22px', '22px', '22px', '22px', '0px']}
            gridTemplateColumns={['1fr 1fr', '1fr 1fr', '1fr 1fr', '1fr 1fr 1fr 1fr']}
            width="100%"
            gridGap="16px"
          >
            {inner}
          </Grid>
        </Box>
      </Box>
    </>
  )
})

const BecomeStreamer = styled(Text)`
  transition: all 0.1s linear;
  &:hover {
    color: white;
  }
`

LiveTwitchChannels.displayName = 'LiveTwitchChannels'
