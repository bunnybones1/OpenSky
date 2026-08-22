import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { TimeUntilSeasonEnd } from '~/AccountPage/AccountIdentity/RankSection/RankSection'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { IS_PREMIUM_SKYPASS_AVAILABLE } from '~/shared/constants/skypass'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SeasonXPBar } from './components/SeasonXPBar'

interface Props {
  userLevel: number
  experience: number
  levelUpXP: number
  seasonNumber: number
  seasonName: string
  hasPremium: boolean
  paymentLoading?: boolean
}

export const Level = memo(
  ({
    userLevel,
    experience,
    levelUpXP,
    seasonNumber,
    seasonName,
    hasPremium,
    paymentLoading = false
  }: Props) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const isTabletWide = useResponsiveQuery('tabletWide')
    const isSmallScreen = !isTabletWide
    const premiumSkyPassVisible = IS_PREMIUM_SKYPASS_AVAILABLE

    return (
      <FlexBox
        width="50%"
        position="relative"
        type="centered-start-row"
        pl={[20, 20, 32, 32, 72]}
        zIndex={5}
      >
        <FlexBox width="100%" type="centered-start-row">
          <Text
            textWrap
            color="white"
            fontSize={[16, 20, 20, 28]}
            fontFamily="condensed"
            fontWeight="800"
            style={{
              textTransform: 'uppercase',
              WebkitTextStroke: '0.05em rgba(0, 0, 0, 0.9)'
            }}
            mr={'8px'}
          >
            {t('skypass.season', {
              number: seasonNumber,
              name: seasonName !== 'unknown' ? seasonName : ''
            })}
          </Text>
          <FlexBox
            px={1}
            type="centered-between-row"
            bg="purple1"
            height={[24, 24, 30, 30]}
            width={202}
            borderRadius={'6px'}
          >
            <TimeUntilSeasonEnd />
          </FlexBox>
        </FlexBox>
        <FlexBox width="100%" type="centered-start-row" mt={'8px'}>
          {hasPremium && (
            <Box width={[75, 75, 100, 100]}>
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl(`webapp/icons/skypass-premium-level.webp`)}
                  style={{
                    width: '100%'
                  }}
                />
              )}
            </Box>
          )}
          <FlexBox type="start-column" mr={[4, 4, 4, 16, 16]}>
            <FlexBox type="centered-start-row">
              <Text
                textWrap
                color="white"
                fontSize={[18, 20, 32, 32, 40]}
                fontFamily="condensed"
                fontWeight="bold"
                lineHeight={['24px', '32px', '32px', '40px']}
                pb="4px"
                pr="4px"
                style={{ textTransform: 'uppercase' }}
              >
                {t('skypass.seasonLevel', {
                  premium: hasPremium ? t('skypass.premium') : ''
                })}
              </Text>
              <Icon
                type="beta-bubble"
                color="white"
                height={isSmallScreen ? '16px' : '32px'}
              />
              <Text
                textWrap
                color="white"
                fontSize={[18, 20, 32, 32, 40]}
                fontFamily="condensed"
                fontWeight="bold"
                lineHeight={['24px', '32px', '32px', '40px']}
                pb="4px"
                pl="2px"
                style={{ textTransform: 'uppercase' }}
              >
                {t('skypass.seasonLevelAmount', {
                  level: userLevel
                })}
              </Text>
            </FlexBox>
            <SeasonXPBar experience={experience} levelUpXP={levelUpXP} />
          </FlexBox>
          {!hasPremium && premiumSkyPassVisible && (
            <Button
              frameType="default"
              colorType="orange"
              height={isTabletWide ? '64px' : '32px'}
              text={t('skypass.goPremium').toUpperCase()}
              disabled={paymentLoading}
              onClick={() => {
                navigate('/skypass-purchase')
              }}
              leftAdornment={{ icon: 'sky-pass-premium' }}
              buttonClassName={Sprinkles({
                paddingX: isTabletWide ? '16px' : '0px'
              })}
            />
          )}
        </FlexBox>
      </FlexBox>
    )
  }
)

Level.displayName = 'Level'
