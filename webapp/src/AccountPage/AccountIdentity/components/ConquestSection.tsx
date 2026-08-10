import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Grid } from '~/shared/components/Base/Grid'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestStats } from '~/shared/queries/useConquestStats'

const ConquestSection = memo(() => {
  const { t } = useTranslation()

  const { getAssetUrl } = useGetAssetContext()

  const { data: conquestStats } = useConquestStats()
  const firstConquestDate = conquestStats?.stats.firstConquestMatchPlayed

  return (
    <>
      <ConquestSectionHeader>
        <FlexBox style={{ alignItems: 'center' }}>
          <ConquestSectionHeaderTitle>
            {t('profile.CONQUEST')}
          </ConquestSectionHeaderTitle>
        </FlexBox>

        <ConquestFirstPlayed style={{ alignItems: 'center', marginRight: '12px' }}>
          {t('profile.playedConquestForFirstTimeOn')}{' '}
          {firstConquestDate ? firstConquestDate.split('T')[0] : 'N/A'}
        </ConquestFirstPlayed>
      </ConquestSectionHeader>

      <Box
        width="100%"
        borderTop="1px solid"
        borderColor="purple6"
        bg="purple2"
        style={{
          borderRight: '1px solid #4d3c7b'
        }}
      >
        <Grid gridTemplateColumns={'1fr 1fr'}>
          <ConquestInfo>
            <ConquestInfoHeader>
              {(conquestStats && conquestStats?.stats.constructedMatchesPlayed) || 0}
            </ConquestInfoHeader>
            <ConquestInfoSubheader>{t('profile.MATCHES')}</ConquestInfoSubheader>
          </ConquestInfo>
          <ConquestInfo>
            <ConquestInfoHeader>
              {(conquestStats &&
                conquestStats?.stats.constructedWinRate.toFixed(0)) ||
                0}
              %
            </ConquestInfoHeader>
            <ConquestInfoSubheader>{t('ranks.winRate')}</ConquestInfoSubheader>
          </ConquestInfo>
        </Grid>

        <Grid gridTemplateRows={`1fr 1fr 1fr`} style={{ padding: '12px 0px' }}>
          <ConquestRewardRow>
            {!!getAssetUrl && (
              <img
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '2px'
                }}
                src={getAssetUrl(`webapp/icons/silver-card-with-letter.webp`)}
              />
            )}
            {(conquestStats && conquestStats?.stats.constructedSilverCardsWon) || 0}{' '}
            {t('profile.silversCollected')}
          </ConquestRewardRow>
          <ConquestRewardRow>
            {!!getAssetUrl && (
              <img
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '2px'
                }}
                src={getAssetUrl(`webapp/icons/gold-card-with-letter.webp`)}
              />
            )}
            {(conquestStats && conquestStats?.stats.constructedGoldCardsWon) || 0}{' '}
            {t('profile.goldsCollected')}
          </ConquestRewardRow>
          <ConquestRewardRow>
            {!!getAssetUrl && (
              <img
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '2px'
                }}
                src={getAssetUrl(`webapp/icons/conquest-ticket.webp`)}
              />
            )}
            {(conquestStats && conquestStats?.stats.constructedTicketsUsed) || 0}{' '}
            {t('profile.ticketsUsed')}
          </ConquestRewardRow>
        </Grid>
      </Box>
    </>
  )
})

const ConquestRewardRow = styled(FlexBox)`
  font-size: 16px;
  font-weight: 500;
  justify-self: center;
  margin: 8px 0px;
  min-width: 150px;
  color: ${({ theme }) => theme.colors.purple9};
`

const ConquestInfoHeader = styled(FlexBox)`
  color: ${({ theme }) => theme.colors.purple9};
  font-weight: 500;
  font-size: 16px;
`

const ConquestInfoSubheader = styled(FlexBox)`
  color: ${({ theme }) => theme.colors.purple8};
  font-weight: 500;
  font-size: 12px;
`

const ConquestInfo = styled(FlexBox)`
  color: white;
  padding: 10px 20px;
  flex-direction: column;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.purple6};
  border-right: 1px solid ${({ theme }) => theme.colors.purple6};
`

const ConquestSectionHeader = styled(FlexBox)`
  height: 52px;
  width: 100%;
  background: ${({ theme }) => theme.colors.purple4};
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
  align-items: center;
  margin-top: 16px;
  justify-content: space-between;
`

const ConquestSectionHeaderTitle = styled(FlexBox)`
  font-family: 'Barlow Condensed';
  font-weight: 600;
  font-size: 26px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.purple9};
  margin-left: 12px;
`

const ConquestFirstPlayed = styled(FlexBox)`
  color: ${({ theme }) => theme.colors.purple8};
  font-size: 14px;
`

export default ConquestSection

ConquestSection.displayName = 'ConquestSection'
