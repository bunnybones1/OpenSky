import styled from '@emotion/styled'
import { shuffle } from 'lodash-es'
import { memo, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import env from '~/env'
import { Box, FlexBox, Grid, Text } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useCardTotals } from '~/shared/hooks/cards/useCardTotals'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useTimeUntilRewards } from '~/shared/hooks/useTimeUntilRewards'
import { usePendingCards } from '~/shared/queries/cards/usePendingCards'
import { useConquestRewards } from '~/shared/queries/useConquestRewards'

import BackToTopButton from './components/BackToTopButton'
import { WeeklyGoldCard } from './components/WeeklyGoldCard'

const ConquestInfo = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const navigate = useNavigate()
  const { data: conquestRewards } = useConquestRewards()
  const cardTotals = useCardTotals(true)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const [showAllGolds, setShowAllGolds] = useState(false)

  const timeUntilRewards = useTimeUntilRewards()

  const { data: pendingCards } = usePendingCards()

  const weeklyGolds = useMemo(() => {
    return shuffle(conquestRewards?.rewards.weeklyGolds)
  }, [conquestRewards])

  const displayConquestCards =
    conquestRewards &&
    conquestRewards.rewards &&
    conquestRewards.rewards.weeklyGolds &&
    conquestRewards.rewards.weeklyGolds.length > 0

  const renderPendingGolds = !!pendingCards && pendingCards.length > 0

  const pendingCardsCount = useMemo(() => {
    if (!pendingCards || !pendingCards.length) return 0

    let count = 0

    pendingCards.forEach((card) => {
      count = count + card.tokenIDs.length
    })

    return count
  }, [pendingCards])

  let rewardColumns = '1fr 1fr 1fr 1fr'

  if (
    !!conquestRewards &&
    !!conquestRewards.rewards &&
    !!weeklyGolds &&
    !!weeklyGolds.length
  ) {
    let amountColumns = Math.floor(weeklyGolds.length / 2)
    // if 3 or 4 cards, just have it on one row
    if (amountColumns <= 2) {
      amountColumns = weeklyGolds.length
    } else if (amountColumns > 5) {
      amountColumns = 5
    }

    let columnString = '' as string
    for (let i = 0; i < amountColumns; i++) {
      columnString += '1fr '
    }

    if (columnString) {
      columnString.trim()
    }
    rewardColumns = columnString
  }

  const { t } = useTranslation()

  return (
    <FlexBox
      maxWidth="1440px"
      width="100%"
      justifyContent={'center'}
      m="0 auto"
      position="relative"
      zIndex={2}
    >
      <BackToTopButton />
      <InnerContainer mt={'12px'}>
        <Box>
          <Text
            color="white"
            fontSize={[22, 22, 22, 32]}
            fontWeight="bold"
            fontFamily="condensed"
            textAlign="center"
            mb={'4px'}
          >
            {t('play.weekRewards')}
          </Text>
          <Tooltip
            placement="right-start"
            offsetX={-52}
            tooltip={
              <>
                <Text color="purple8" fontSize="14px">
                  {t(
                    env.AUTH_MODE === 'google'
                      ? 'play.delayedGoldDelivery'
                      : 'play.delayedGoldMinting'
                  )}
                </Text>
                <Text color="purple8" fontSize="14px" width="100%" textAlign="left">
                  {t('play.wonInConquest')}
                </Text>
              </>
            }
          >
            <FlexBox justifyContent="center">
              <Text
                color="white"
                fontSize={[16, 16, 16, 22]}
                fontWeight="bold"
                fontFamily="condensed"
                textAlign="center"
                style={{ display: 'flex' }}
              >
                <Trans
                  t={t}
                  i18nKey="play.conquestInfoWeeklyGolds"
                  components={{
                    highlight: (
                      <Text
                        color="warm6"
                        fontSize={[16, 16, 16, 22]}
                        fontWeight="bold"
                        fontFamily="condensed"
                        textAlign="center"
                        style={{
                          display: 'inline-block',
                          position: 'relative',
                          marginLeft: '4px'
                        }}
                      />
                    )
                  }}
                  count={conquestRewards?.rewards.weeklyGolds.length ?? 0}
                  values={{ timeUntilRewards: timeUntilRewards ?? '' }}
                />
              </Text>

              {renderPendingGolds === true && (
                <>
                  <Divider></Divider>

                  <FlexBox
                    height={'30px'}
                    alignItems="center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      navigate(ROUTES_CONFIG.routes.PENDING_GOLDS.directPath)
                    }}
                  >
                    {!!getAssetUrl && (
                      <img
                        src={getAssetUrl('webapp/icons/gold-card-with-letter.webp')}
                        style={{ width: '24px', height: '24px' }}
                      />
                    )}
                    <Icon type="clock" color="purple8" height="20px" />
                    <Text
                      color="purple8"
                      fontSize={[16]}
                      textAlign="center"
                      fontWeight="medium"
                      pl={'6px'}
                    >
                      {t(`play.goldPending`, { count: pendingCardsCount })}
                    </Text>
                  </FlexBox>
                </>
              )}
            </FlexBox>
          </Tooltip>
        </Box>
        <Grid
          style={{
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '24px',
            paddingBottom: '24px'
          }}
          maxHeight={showAllGolds ? '100%' : ['450px', '450px', '450px', '700px']}
          px={'16px'}
          gridRowGap={'48px'}
          gridTemplateColumns={rewardColumns}
        >
          {!showAllGolds && !!weeklyGolds.length && (
            <div
              style={{
                position: 'absolute',
                bottom: '0px',
                width: '100%',
                height: '100px',
                background:
                  'linear-gradient(to top, #0c061e 25%, rgba(23, 13, 48, 0) 100%)',
                zIndex: 2
              }}
            />
          )}
          {!!weeklyGolds.length && (
            <Text
              color="purple9"
              fontSize={12}
              style={{
                position: 'absolute',
                bottom: '1px',
                width: '100%',
                zIndex: 3,
                cursor: 'pointer'
              }}
              textAlign={'center'}
              onClick={() => setShowAllGolds(!showAllGolds)}
            >
              {t(`play.${showAllGolds ? 'showLess' : 'showMore'}`)}
            </Text>
          )}
          {displayConquestCards &&
            !!conquestRewards &&
            weeklyGolds?.map((reward) => {
              return (
                <WeeklyGoldCard
                  collectedAmount={reward.totalSupply}
                  id={reward.tokenId}
                  key={reward.tokenId}
                />
              )
            })}
          {!displayConquestCards && (
            <Text
              color="purple9"
              fontSize={[16, 16, 16, 22]}
              textAlign="center"
              style={{ gridColumn: '1 / -1' }}
            >
              {t('play.conquestRewardsInactive')}
            </Text>
          )}
        </Grid>
      </InnerContainer>
      {displayConquestCards && (
        <>
          <GoldMintWarning
            margin={['48px 0px', '48px 0px', '48px 0px', '80px 0px 48px 0px']}
          >
            <Icon
              height="20px"
              type="arrow-up"
              color="warm7"
              style={{
                marginRight: '12px',
                left: '3px',
                position: 'relative'
              }}
            />
            <Text color="warm6" fontSize={[12, 12, 12, 16]}>
              {t('play.over100Golds')}
            </Text>
            <Box height="100%" position="relative">
              <GoldMintGradient />
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/misc/goldmint.webp')}
                  style={{ height: '100%', marginLeft: '12px' }}
                />
              )}
            </Box>
          </GoldMintWarning>
          <InnerContainer
            height={['200px', '200px', '200px', '239px']}
            flexDirection="column"
            position="relative"
            mb={['0px', '0px', '0px', '48px']}
          >
            <Box
              style={{
                backgroundImage: !!getAssetUrl
                  ? `url(${getAssetUrl('/webapp/misc/conquestv2silvers.webp')})`
                  : undefined,
                backgroundSize: '100%',
                backgroundRepeat: 'no-repeat',
                height: '100%',
                width: '100%',
                position: 'absolute',
                backgroundPosition: 'center center'
              }}
            />
            <Box zIndex={3}>
              <Text
                color="white"
                fontSize={[24]}
                fontWeight="bold"
                fontFamily="condensed"
                textAlign="center"
              >
                ~{cardTotals.TOTAL} {t('play.silversAvailable')}*
              </Text>
              <Box pt={'6px'}>
                <Text
                  color="white"
                  fontSize={[16]}
                  fontWeight="400"
                  fontFamily="condensed"
                  textAlign="center"
                >
                  {t('play.silversCanBeWon')}
                </Text>
                <Text
                  color="white"
                  fontSize={[16]}
                  fontWeight="400"
                  fontFamily="condensed"
                  textAlign="center"
                >
                  *{t('play.excludesLastSet')}
                </Text>
              </Box>
            </Box>
          </InnerContainer>
        </>
      )}
      {!!getAssetUrl && (
        <img
          src={getAssetUrl('webapp/misc/end-of-list.webp')}
          style={{ maxWidth: '800px', width: '90%' }}
        />
      )}

      <InnerContainer
        height={['270px', '270px', '270px', '370px']}
        flexDirection="column"
        style={{ justifyContent: 'space-between' }}
        mb={'0px'}
      >
        <SectionHeader
          fontFamily="condensed"
          fontSize={['22px', '22px', '22px', '32px']}
          zIndex={3}
        >
          {t('play.howDoesConquest')}
        </SectionHeader>

        <Box
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl('/webapp/misc/conquestv2howto.webp')})`
              : undefined,
            backgroundSize: '100%',
            backgroundRepeat: 'no-repeat',
            height: '100%',
            width: '100%',
            position: 'absolute',
            backgroundPosition: 'center center'
          }}
        />
        <Grid gridTemplateColumns="1fr 1fr 1fr" width="100%" zIndex={3} px={'40px'}>
          <FlexBox
            justifyContent="center"
            flexDirection="column"
            alignItems="center"
            pb="60px"
          >
            <Text
              color="purple9"
              fontSize={['12px', '14px', '14px', '16px']}
              fontWeight="500"
            >
              {t('tooltip.conquestRulesLineOne')}
            </Text>
            <Text
              color="purple9"
              fontSize={['12px', '14px', '14px', '16px']}
              fontWeight="500"
            >
              {t('tooltip.conquestRulesLineTwo')}
            </Text>
          </FlexBox>
          <FlexBox
            justifyContent="center"
            flexDirection="column"
            alignItems="center"
            pb="60px"
          >
            <Text
              color="purple9"
              fontSize={['12px', '14px', '14px', '16px']}
              fontWeight="500"
            >
              {t('tooltip.conquestRulesLineThree')}
            </Text>
            <Text
              color="purple9"
              fontSize={['12px', '14px', '14px', '16px']}
              fontWeight="500"
            >
              {t('tooltip.conquestRulesLineFour')}
            </Text>
          </FlexBox>
          <FlexBox
            justifyContent="center"
            flexDirection="column"
            alignItems="center"
            pb="60px"
          >
            <Text
              color="purple9"
              fontSize={['12px', '14px', '14px', '16px']}
              fontWeight="500"
            >
              {t('tooltip.conquestRulesLineFive')}
            </Text>
            <Text
              color="purple9"
              fontSize={['12px', '14px', '14px', '16px']}
              fontWeight="500"
            >
              {t('tooltip.conquestRulesLineSix')}
            </Text>
          </FlexBox>
        </Grid>
      </InnerContainer>

      <InnerContainer>
        <FlexBox
          justifyContent="center"
          flexDirection="column"
          alignItems="center"
          pb="60px"
        >
          <Text
            color="warm6"
            fontSize={['12px', '14px', '14px', '16px']}
            fontWeight="500"
          >
            *
            {t(
              env.AUTH_MODE === 'google'
                ? 'tooltip.conquestRulesLineSevenOffchain'
                : 'tooltip.conquestRulesLineSeven'
            )}
          </Text>
        </FlexBox>
      </InnerContainer>

      <InnerContainer
        height={['350px', '350px', '350px', '500px']}
        flexDirection="column"
        style={{ justifyContent: 'space-between' }}
        mb={'48px'}
      >
        <SectionHeader
          fontFamily="condensed"
          fontSize={['22px', '22px', '22px', '32px']}
          zIndex={3}
          px={['16px']}
          textAlign={'center'}
        >
          {t('tooltip.conquestRulesHeaderLineOne')}
          {!isTabletWide && <br />} {t('tooltip.conquestRulesHeaderLineTwo')}
        </SectionHeader>
        <Box
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl('/webapp/misc/conquestv2rewards.webp')})`
              : undefined,
            backgroundSize: '100%',
            backgroundRepeat: 'no-repeat',
            height: '100%',
            width: '120%',
            position: 'absolute',
            maxWidth: '100vw',
            backgroundPosition: 'center center'
          }}
        />
        <Grid
          gridTemplateColumns="1fr 1fr 1fr"
          width="100%"
          style={{ textAlign: 'center' }}
          px={['40px', '40px', '40px', '60px']}
          zIndex={3}
        >
          <Box>
            <SectionHeader fontFamily="condensed" fontSize={'22px'}>
              {t('play.rewards.winsBundle', { count: 1 })}
            </SectionHeader>
            <FlexBox mt={'8px'} type="centered-row" pb="60px">
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/icons/silver-card.webp')}
                  style={{ width: '30px' }}
                />
              )}
              <Box color="white" style={{ display: 'inline-block' }}>
                {t('play.rewards.silvers', { count: 1 })}
              </Box>
            </FlexBox>
          </Box>
          <Box>
            <SectionHeader fontFamily="condensed" fontSize={'22px'}>
              {t('play.rewards.winsBundle', { count: 2 })}
            </SectionHeader>
            <FlexBox mt={'8px'} type="centered-row" pb="60px">
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/icons/silver-cards.webp')}
                  style={{ width: '30px', marginRight: '5px' }}
                />
              )}
              <Box color="white" style={{ display: 'inline-block' }}>
                {t('play.rewards.silvers', { count: 2 })}
              </Box>
            </FlexBox>
          </Box>
          <Box>
            <SectionHeader fontFamily="condensed" fontSize={'22px'}>
              {t('play.rewards.winsBundle', { count: 3 })}
            </SectionHeader>
            <FlexBox mt={'8px'} type="centered-row" pb="60px">
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/icons/silver-gold-cards.webp')}
                  style={{ width: '30px', marginRight: '5px' }}
                />
              )}
              <Box color="white" style={{ display: 'inline-block' }}>
                {t('play.rewards.golds', { count: 1 })},{' '}
                {t('play.rewards.silvers', { count: 1 })}
              </Box>
            </FlexBox>
          </Box>
        </Grid>
      </InnerContainer>
      <InnerContainer
        height={['350px', '350px', '350px', '500px']}
        flexDirection="column"
        style={{ justifyContent: 'left' }}
        mb={'48px'}
      >
        <SectionHeader
          fontFamily="condensed"
          fontSize={['22px', '22px', '22px', '32px']}
          zIndex={3}
          px={['16px']}
          textAlign={'center'}
        >
          {t('play.rewards.levelWeeklyTreasureLineOne')}
          <br />{' '}
          {t(
            env.AUTH_MODE === 'google'
              ? 'play.rewards.levelWeeklyTreasureLineTwoOffchain'
              : 'play.rewards.levelWeeklyTreasureLineTwo'
          )}
        </SectionHeader>

        <Box
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl('/webapp/backgrounds/conquest-treasures.webp')})`
              : undefined,
            backgroundSize: '100%',
            backgroundRepeat: 'no-repeat',
            height: '100%',
            width: '120%',
            position: 'absolute',
            maxWidth: '100vw',
            backgroundPosition: 'center center'
          }}
        />
        <FlexBox type="start-column" style={{ alignSelf: 'start' }}>
          <FlexBox
            style={{ alignItems: 'center' }}
            mt={['70px', '70px', '70px', '120px']}
            ml={['20px', '20px', '20px', '0px']}
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/wingedcheckboxactive.webp')}
                style={{
                  height: '32px',
                  width: '32px',
                  zIndex: 1
                }}
              />
            )}
            <Box style={{ zIndex: 1 }}>
              <Text
                fontSize="15px"
                color="purple9"
                fontWeight="500"
                style={{ display: 'inline-block', zIndex: 1 }}
                ml="8px"
              >
                {' '}
                <Trans
                  t={t}
                  i18nKey="play.rewards.eachCompletedMatchGrants"
                  components={{
                    white: (
                      <Text
                        fontSize="15px"
                        color="white"
                        fontWeight="500"
                        style={{ display: 'inline-block', zIndex: 1 }}
                      />
                    )
                  }}
                />
              </Text>
            </Box>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/petal.webp')}
                style={{
                  height: '20px',
                  width: '20px',
                  zIndex: 1
                }}
              />
            )}
            <Text
              fontSize="15px"
              color="white"
              fontWeight="700"
              style={{ display: 'inline-block', zIndex: 1 }}
            >
              {t('play.rewards.points', { count: 4 })}
            </Text>
          </FlexBox>

          <FlexBox
            style={{ alignItems: 'center' }}
            my="16px"
            ml={['20px', '20px', '20px', '0px']}
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/silver-cards.webp')}
                style={{
                  height: '32px',
                  width: '32px',
                  zIndex: 1
                }}
              />
            )}
            <Box style={{ zIndex: 1 }}>
              <Text
                fontSize="15px"
                color="purple9"
                fontWeight="500"
                style={{ display: 'inline-block', zIndex: 1 }}
                ml="8px"
              >
                <Trans
                  t={t}
                  i18nKey="play.rewards.eachSilverCardGrants"
                  components={{
                    white: (
                      <Text
                        fontSize="15px"
                        color="white"
                        fontWeight="500"
                        style={{ display: 'inline-block', zIndex: 1 }}
                      />
                    )
                  }}
                />
              </Text>
            </Box>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/petal.webp')}
                style={{
                  height: '20px',
                  width: '20px',
                  zIndex: 1
                }}
              />
            )}
            <Text
              fontSize="15px"
              color="white"
              fontWeight="700"
              style={{ display: 'inline-block', zIndex: 1 }}
            >
              {t('play.rewards.points', { count: 1 })}
            </Text>
          </FlexBox>
          <FlexBox
            style={{ alignItems: 'center' }}
            ml={['20px', '20px', '20px', '0px']}
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/gold-cards.webp')}
                style={{
                  height: '32px',
                  width: '32px',
                  zIndex: 1
                }}
              />
            )}
            <Box style={{ zIndex: 1 }}>
              <Text
                fontSize="15px"
                color="purple9"
                fontWeight="500"
                style={{ display: 'inline-block', zIndex: 1 }}
                ml="8px"
              >
                <Trans
                  t={t}
                  i18nKey="play.rewards.eachGoldCardGrants"
                  components={{
                    white: (
                      <Text
                        fontSize="15px"
                        color="white"
                        fontWeight="500"
                        style={{ display: 'inline-block', zIndex: 1 }}
                      />
                    )
                  }}
                />
              </Text>
            </Box>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/petal.webp')}
                style={{
                  height: '20px',
                  width: '20px',
                  zIndex: 1
                }}
              />
            )}
            <Text
              fontSize="15px"
              color="white"
              fontWeight="700"
              style={{ display: 'inline-block', zIndex: 1 }}
            >
              {t('play.rewards.points', { count: 3 })}
            </Text>
          </FlexBox>
          <FlexBox
            style={{ alignItems: 'center' }}
            my="16px"
            ml={['20px', '20px', '20px', '0px']}
          >
            <FlexBox
              width={32}
              height={32}
              style={{
                position: 'relative'
              }}
            >
              <ImageIcon type="heroes-gold" height="32px" />
            </FlexBox>
            <Box style={{ zIndex: 1 }}>
              <Text
                fontSize="15px"
                color="purple9"
                fontWeight="500"
                style={{ display: 'inline-block', zIndex: 1 }}
                ml="8px"
              >
                <Trans
                  t={t}
                  i18nKey="play.rewards.eachHeroSkinGrants"
                  components={{
                    white: (
                      <Text
                        fontSize="15px"
                        color="white"
                        fontWeight="500"
                        style={{ display: 'inline-block', zIndex: 1 }}
                      />
                    )
                  }}
                />
              </Text>
            </Box>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/petal.webp')}
                style={{
                  height: '20px',
                  width: '20px',
                  zIndex: 1
                }}
              />
            )}
            <Text
              fontSize="15px"
              color="white"
              fontWeight="700"
              style={{ display: 'inline-block', zIndex: 1 }}
            >
              {t('play.rewards.percentagePoints', { count: 25 })}
            </Text>
          </FlexBox>
        </FlexBox>
      </InnerContainer>
    </FlexBox>
  )
})

ConquestInfo.displayName = 'ConquestInfo'

const InnerContainer = styled(FlexBox)`
  max-width: 1068px;
  width: 100%;
  justify-content: center;
  align-items: center;
  position: relative;
`

const GoldMintWarning = styled(FlexBox)`
  position: relative;
  color: ${({ theme }) => theme.colors.warm7};
  font-weight: 500;
  font-size: 16px;
  height: 50px;
  background-color: ${({ theme }) => theme.colors.purple2};
  border: 1px solid ${({ theme }) => theme.colors.purple7};
  align-items: center;
  padding-left: 12px;
`

const SectionHeader = styled(Text)`
  color: ${({ theme }) => theme.colors.white};
  font-weight: 600;
  white-space: break-spaces;
`

const Divider = styled(Box)`
  height: 30px;
  width: 3px;
  margin: 0px 10px;
  border: 1px solid;
  background: linear-gradient(
    0deg,
    rgba(172, 143, 255, 0) 0%,
    #ac8fff 21.81%,
    #a382ff 71.29%,
    rgba(172, 143, 255, 0) 100%
  );
`

const GoldMintGradient = styled(Box)`
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    #170d30 0%,
    #170d30 10%,
    rgba(23, 13, 48, 0) 70%
  );
  position: absolute;
  top: 0px;
  z-index: 2;
`

export default ConquestInfo
