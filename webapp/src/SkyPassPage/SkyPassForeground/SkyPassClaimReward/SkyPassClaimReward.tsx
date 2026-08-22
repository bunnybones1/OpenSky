import { isItemTypeACard } from '@opensky/shared/assetsIDs'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePrevious } from 'react-use'

import env from '~/env'
import { mockClaimReward } from '~/HomePage/NotificationsDialog/mock/data'
import {
  CardSet,
  ClaimSkypassRewardsReturn,
  ItemType,
  Reward,
  RewardCard,
  SkypassTier
} from '~/lib/proto'
import { SoundClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { TradableBadge } from '~/shared/components/TradableBadge/TradableBadge'
import {
  getDeckClassUnlockStatusKey,
  getInvitePointsKey,
  getTokenBalancesKey,
  getUserDecksKey
} from '~/shared/constants/react-query-keys'
import { IS_PREMIUM_SKYPASS_AVAILABLE } from '~/shared/constants/skypass'
import {
  CONVERT_TO_SEQUENCE_WALLET_DIALOG,
  DEFAULT_LIST
} from '~/shared/constants/ui'
import { captureError } from '~/shared/helpers/sentry'
import { shouldSeeConversionDialog } from '~/shared/helpers/should-see-conversion-dialog'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useArtIdByType } from '~/shared/hooks/useArtIdByType'
import { getAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useClaimSkypassReward } from '~/shared/mutations/useClaimSkypassReward'
import { authenticationState } from '~/shared/state/authentication-state'
import {
  RewardCardsType,
  skypassSelectorState,
  updateSkypassSelectorState
} from '~/shared/state/skypass-state'
import { CARD_TYPES, claimRewardImageSize } from '~/SkyPassPage/shared/constants'
import { useSelectedSkypassReward } from '~/SkyPassPage/shared/hooks/useSelectedSkypassReward'

import { CardBackImageFan } from './components/CardBackImageFan'
import { CardBacks } from './components/CardBacks'
import { CardImageFan } from './components/CardImageFan'
import ClaimRewardDialog from './components/ClaimRewardDialog'
import { HeroImage } from './components/HeroImage'
import { StickerImage } from './components/StickerImage'
import { StickerPointsImages } from './components/StickerPointsImages'
import { TitleReward } from './components/TitleReward'
import { getPostClaimURL } from './helpers/get-post-claim-url'
import { RewardImage } from './RewardImage/RewardImage'
import { RewardInfo } from './RewardInfo/RewardInfo'
import { CLAIM_REWARD_DIALOG_ID } from './shared/constants'
import { RewardOverlayImage, RewardOverlayImageBckg } from './SkyPassClaimReward.css'

const SHOW_EXPLOSION_TYPES = [ItemType.SW_CONQUEST_TICKET]

const CARD_BACK_IMAGES = {
  [ItemType.SW_CARD_BACKS]: 'webapp/card-backs/6x/',
  [`${CardSet.HEXBOUND_INVASION}_${ItemType.SW_BASE_CARDS}`]: 'cardback-base-hexinv',
  [`${CardSet.HEXBOUND_INVASION}_${ItemType.SW_SILVER_CARDS}`]:
    'cardback-silver-hexinv'
}

const REWARD_IMAGE_OVERLAYS_SET = {
  [CardSet.HEXBOUND_INVASION]: 'hexinv'
}

const claimRewardImageSizeHalf = [
  `50vh`,
  `50vh`,
  `calc(50vh - 27px)`,
  `calc(50vh - 27px)`,
  `calc(50vh - 27px)`
]

// LOCAL TESTING ZONE, PLEASE SET TO FALSE FOR PRODUCTION OR REAL TESTING
const isMockClaim = false
// const mockClaimType = 'SW_MULTI_BASE_CARDS'
const mockClaimType = 'SW_SINGLE_BASE_CARD'

interface Props {
  userLevel: number
  claimedRewards: number[]
  claimedRewardCards?: RewardCardsType[]
  isEarned?: boolean
  hasPremium?: boolean
  cardBackName?: string
  loadingClaimingReward?: number
}

const { openDialog: openConversionDialog } = controlDialog(
  CONVERT_TO_SEQUENCE_WALLET_DIALOG
)

export const SkyPassClaimReward = memo(
  ({
    userLevel,
    claimedRewards,
    isEarned,
    hasPremium,
    claimedRewardCards,
    cardBackName,
    loadingClaimingReward
  }: Props) => {
    const { getAssetUrl } = useGetAssetContext()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const isTablet = useResponsiveQuery('tablet')
    const claimSkypassRewards = useClaimSkypassReward()
    const isSmallScreen = !isTablet
    const selectedReward = useSelectedSkypassReward()
    const premiumUpgradeAvailable = IS_PREMIUM_SKYPASS_AVAILABLE

    const [dialogRewards, setDialogRewards] = useState<Reward[]>([])
    const [areDialogRewardsNew, setAreDialogRewardsNew] = useState(false)

    const onDialogClose = useCallback(() => {
      if (env.AUTH_MODE === 'google') return

      const account = getAuthedAccount()

      if (
        !!account?.isBurnerWallet &&
        account.level > 9 &&
        !!shouldSeeConversionDialog()
      ) {
        const hasTradableReward = dialogRewards.some((reward) => {
          if (reward.card && reward.card.card.itemType === ItemType.SW_SILVER_CARDS) {
            return true
          }

          return false
        })

        if (hasTradableReward) {
          openConversionDialog()
        }
      }
    }, [dialogRewards])

    const { Dialog, openDialog } = useDialog({
      Element: ClaimRewardDialog,
      id: CLAIM_REWARD_DIALOG_ID,
      rewards: dialogRewards,
      isNew: areDialogRewardsNew,
      onCancel: onDialogClose
    })

    const rewardTokens = selectedReward?.attributes?.tokenIDs
    const cardSet = selectedReward?.attributes?.cardSets?.[0]

    const prevClaimedRewards = usePrevious(claimedRewards)

    const isIdClaimed = useMemo(
      () =>
        !!selectedReward?.id && !!claimedRewards?.includes(Number(selectedReward.id)),
      [claimedRewards, selectedReward?.id]
    )

    const gainedCardRewards = useMemo(() => {
      return selectedReward?.gainedRewards?.reduce((array, gainedCard) => {
        if (gainedCard.card) {
          const { card } = gainedCard.card as RewardCard
          return [card.id, ...array]
        }
        return
      }, [])
    }, [selectedReward?.gainedRewards])

    const claimedCards = useMemo(() => {
      if (claimedRewardCards && !!selectedReward?.id)
        return claimedRewardCards.find((card) => card.rewardId === selectedReward.id)
      return null
    }, [claimedRewardCards, selectedReward?.id])

    const unlockedDecks = selectedReward?.attributes?.unlockDeckClasses

    const artItem = useArtIdByType(selectedReward?.itemType, rewardTokens?.[0])

    const isClaimable = useMemo(() => {
      if (!selectedReward) return false
      const { tier, claimed, claimable, level } = selectedReward
      if ((tier === SkypassTier.PREMIUM && !hasPremium) || claimed || isIdClaimed)
        return false
      else return claimable && isEarned && level <= userLevel
    }, [selectedReward, hasPremium, isIdClaimed, isEarned, userLevel])

    const handleOpenModal = useCallback(
      (rewards: Reward[], isNew = true) => {
        setDialogRewards(rewards)
        setAreDialogRewardsNew(isNew)
        openDialog()
      },
      [openDialog]
    )

    const queryClient = useQueryClient()

    const handleClaimReward = useCallback(async () => {
      if (!isIdClaimed) {
        if (!selectedReward?.id || !selectedReward.itemType) return

        updateSkypassSelectorState('loadingClaimingReward', selectedReward.id)

        try {
          const response = isMockClaim
            ? (mockClaimReward[mockClaimType] as unknown as ClaimSkypassRewardsReturn)
            : await claimSkypassRewards.mutateAsync({
                id: selectedReward.id,
                level: selectedReward.level
              })

          // This is used by user-pilot to identify situations where the user
          // has just claimed a card, or new hero
          const postClaimURL = getPostClaimURL(response)

          if (!!postClaimURL) {
            navigate(postClaimURL)
          }
          SoundClient.playSound('CardReward')
          updateSkypassSelectorState('loadingClaimingReward', undefined)
          updateSkypassSelectorState('claimedRewards', [
            ...(!!skypassSelectorState.claimedRewards
              ? skypassSelectorState.claimedRewards
              : []),
            selectedReward.id
          ])

          if (isItemTypeACard(selectedReward.itemType) && !postClaimURL) {
            handleOpenModal(response.rewards)
          } else if (
            env.AUTH_MODE !== 'google' &&
            (selectedReward.itemType === ItemType.SW_CARD_BACKS ||
              selectedReward.itemType === ItemType.SW_STICKERS)
          ) {
            if (!!shouldSeeConversionDialog()) {
              openConversionDialog()
            }
          }

          const authedAddress = authenticationState.userAddress

          if (selectedReward.itemType === ItemType.SW_HERO && !!authedAddress) {
            queryClient.invalidateQueries(getUserDecksKey(authedAddress))
            queryClient.invalidateQueries(
              getTokenBalancesKey(ItemType.SW_BASE_CARDS, authedAddress)
            )
          }

          if (
            selectedReward.itemType === ItemType.SW_STICKER_POINTS &&
            !!authedAddress
          ) {
            queryClient.invalidateQueries(getInvitePointsKey(authedAddress))
          }

          if (selectedReward.itemType === ItemType.SW_HERO && !!authedAddress) {
            queryClient.invalidateQueries(getDeckClassUnlockStatusKey(authedAddress))
          }

          if (CARD_TYPES.includes(selectedReward.itemType) && response.rewards) {
            const rewardCards = response.rewards.reduce((array, reward) => {
              const { card } = reward.card as RewardCard
              return [card.id, ...array]
            }, [])
            if (rewardCards) {
              updateSkypassSelectorState('claimedRewardCards', [
                ...(!!skypassSelectorState.claimedRewardCards
                  ? skypassSelectorState.claimedRewardCards
                  : []),
                {
                  rewardId: selectedReward.id,
                  cardIds: rewardCards
                }
              ])
            }
          }
        } catch (e) {
          captureError(e, 'Could not claim reward')
        }
      }
    }, [
      isIdClaimed,
      selectedReward?.id,
      selectedReward?.itemType,
      selectedReward?.level,
      claimSkypassRewards,
      handleOpenModal,
      navigate,
      queryClient
    ])

    const buttonText = useMemo(() => {
      if (!selectedReward) return ''
      if (selectedReward.level > userLevel || !isEarned) {
        if (selectedReward.tier === SkypassTier.PREMIUM && !hasPremium) {
          return premiumUpgradeAvailable
            ? t('skypass.goPremium')
            : t('skypass.premium')
        }
        return t('skypass.reachLevel', { level: selectedReward.level })
      } else if (loadingClaimingReward === selectedReward.id) {
        return ''
      } else if (
        selectedReward.claimed ||
        isIdClaimed ||
        loadingClaimingReward === selectedReward.id
      ) {
        return t('skypass.rewardClaimed')
      } else if (selectedReward.tier === SkypassTier.PREMIUM && !hasPremium) {
        return premiumUpgradeAvailable
          ? t('skypass.goPremiumToUnlock')
          : t('skypass.premium')
      }
      return t('skypass.claimReward')
    }, [
      selectedReward,
      userLevel,
      isEarned,
      loadingClaimingReward,
      isIdClaimed,
      hasPremium,
      premiumUpgradeAvailable,
      t
    ])

    const isButtonDisabled = useMemo(() => {
      if (!selectedReward) return true
      if (
        selectedReward.tier === SkypassTier.PREMIUM &&
        !hasPremium &&
        !premiumUpgradeAvailable
      ) {
        return true
      }
      if (
        selectedReward.tier === SkypassTier.PREMIUM &&
        !hasPremium &&
        (!selectedReward.claimed ||
          !isIdClaimed ||
          loadingClaimingReward === undefined) &&
        !isEarned
      ) {
        return false
      } else {
        return (
          selectedReward.claimed ||
          loadingClaimingReward === selectedReward.id ||
          isIdClaimed ||
          selectedReward.level > userLevel ||
          !isEarned
        )
      }
    }, [
      selectedReward,
      hasPremium,
      premiumUpgradeAvailable,
      isIdClaimed,
      loadingClaimingReward,
      isEarned,
      userLevel
    ])

    const rewardTokensFinal = useMemo(() => {
      if (gainedCardRewards) return gainedCardRewards
      return claimedCards && !rewardTokens ? claimedCards.cardIds : rewardTokens
    }, [gainedCardRewards, claimedCards, rewardTokens]) as number[]

    const showCardImageFan = useMemo(() => {
      return (
        !!selectedReward &&
        CARD_TYPES.includes(selectedReward.itemType) &&
        (rewardTokens || !!claimedCards || !!gainedCardRewards) &&
        (selectedReward.claimed || isIdClaimed || !selectedReward.isStarter)
      )
    }, [selectedReward, rewardTokens, claimedCards, gainedCardRewards, isIdClaimed])

    const showCardBackdrop = useMemo(() => {
      return (
        !!selectedReward &&
        (!rewardTokensFinal || rewardTokensFinal.length === 1) &&
        selectedReward.amount > 1 &&
        CARD_TYPES.includes(selectedReward.itemType)
      )
    }, [selectedReward, rewardTokensFinal])

    const showExplosion = useMemo(
      () =>
        !!selectedReward &&
        !!claimedRewards?.includes(selectedReward.id) &&
        !prevClaimedRewards?.includes(selectedReward.id),
      [selectedReward, claimedRewards, prevClaimedRewards]
    )

    if (selectedReward === undefined) return null

    return (
      <>
        <AnimatePresence mode="wait" initial={false}>
          <DynamicFlexBox
            key={selectedReward.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.25, ease: 'easeInOut' }
            }}
            width="50%"
            height={'100%'}
            position="relative"
            type="end-column"
            pr={[16, 20, 32, 48]}
          >
            <TradableBadge itemType={selectedReward.itemType} />
            <RewardImage
              itemType={selectedReward.itemType}
              amount={selectedReward.amount}
              cardSet={cardSet}
              hasExplosion={SHOW_EXPLOSION_TYPES.includes(selectedReward.itemType)}
              showExplosion={
                SHOW_EXPLOSION_TYPES.includes(selectedReward.itemType) &&
                showExplosion
              }
            />
            {selectedReward.itemType === ItemType.SW_TITLES && !!rewardTokens && (
              <TitleReward id={rewardTokens[0]} explosionEffect={showExplosion} />
            )}
            {showCardImageFan && (
              <CardImageFan
                rewardTokens={rewardTokensFinal}
                amount={selectedReward.amount}
                id={selectedReward.id}
                itemType={selectedReward.itemType}
                onClick={
                  !!selectedReward.gainedRewards
                    ? () => {
                        if (!!selectedReward.gainedRewards) {
                          handleOpenModal(selectedReward.gainedRewards, false)
                        }
                      }
                    : undefined
                }
              />
            )}
            {showCardBackdrop && !!getAssetUrl && (
              <>
                <CardBackImageFan
                  amount={selectedReward.amount}
                  cardBack={`webapp/misc/${
                    !!cardSet
                      ? CARD_BACK_IMAGES[`${cardSet}_${selectedReward.itemType}`]
                      : 'cardback-base'
                  }.webp`}
                />
                {!!cardSet && (
                  <>
                    <Box
                      width={claimRewardImageSize}
                      style={{
                        position: 'absolute',
                        right: `${isSmallScreen ? 0 : '-32px'}`,
                        top: `${isSmallScreen ? `2vh` : `calc(9vh - 32px)`}`,
                        padding: `calc(250px - ${
                          42 / (1 / selectedReward.amount)
                        }px)`,
                        zIndex: 3
                      }}
                    >
                      <img
                        src={getAssetUrl(
                          `webapp/misc/reward-${REWARD_IMAGE_OVERLAYS_SET[cardSet]}-fog.webp`
                        )}
                        className={RewardOverlayImageBckg}
                      />
                    </Box>
                    <Box
                      width={claimRewardImageSizeHalf}
                      style={{
                        position: 'absolute',
                        top: `${isSmallScreen ? '6vh' : `15vh`}`,
                        right: `calc(20vh - 16px)`,
                        margin: 0,
                        zIndex: 3
                      }}
                    >
                      <img
                        src={getAssetUrl(
                          `webapp/misc/logo-${REWARD_IMAGE_OVERLAYS_SET[cardSet]}.webp`
                        )}
                        className={RewardOverlayImage}
                        style={{ zIndex: 5 }}
                      />
                    </Box>
                  </>
                )}
              </>
            )}
            {selectedReward.itemType === ItemType.SW_CARD_BACKS && (
              <CardBacks
                cardBack={`${
                  CARD_BACK_IMAGES[selectedReward.itemType]
                }${cardBackName}.webp`}
                explosionEffect={showExplosion}
              />
            )}
            <Box
              width={[500, 500, 500, 950, 950]}
              style={{
                position: 'absolute',
                top: '0',
                right: '0',
                userSelect: 'none',
                pointerEvents: 'none',
                height: '100vh'
              }}
            >
              {selectedReward.itemType === ItemType.SW_STICKERS && (
                <StickerImage artID={artItem?.artID} hasExplosion={showExplosion} />
              )}
              {selectedReward.itemType === ItemType.SW_STICKER_POINTS && (
                <StickerPointsImages hasExplosion={showExplosion} />
              )}
              {selectedReward.itemType === ItemType.SW_HERO && (
                <HeroImage
                  unlockedDecks={!!unlockedDecks}
                  imgId={artItem?.artID}
                  deckName={unlockedDecks?.[0]}
                  explosionEffect={showExplosion}
                />
              )}
              <Box
                right={['-5%', '0%', '0%', '-10%']}
                height={['70%', '80%', '80%', '70%']}
                bottom={['5%', '0%', '-10%', '2%', '-5%']}
                style={{
                  position: 'absolute',
                  width: '100%',
                  background: `radial-gradient(at 80%, rgba(${
                    !isButtonDisabled ? '10, 36, 73' : '12, 6, 30'
                  }, 0.95) 15%, rgba(${
                    !isButtonDisabled ? '10, 36, 73' : '12, 6, 30'
                  }, 0.45) 30%, rgba(0, 0, 0, 0) 60%)`,
                  zIndex: 4
                }}
              />
            </Box>
            <RewardInfo
              isButtonDisabled={isButtonDisabled}
              isEarned={isEarned}
              unlockedDecks={unlockedDecks}
              onClick={() => {
                if (
                  premiumUpgradeAvailable &&
                  selectedReward.tier === SkypassTier.PREMIUM &&
                  !selectedReward.claimable
                )
                  navigate('/skypass-purchase')
                else if (isClaimable) handleClaimReward()
              }}
              isLoading={loadingClaimingReward === selectedReward.id}
              buttonText={buttonText}
              name={artItem?.name}
              itemType={selectedReward.itemType}
              amount={selectedReward.amount}
              rewardTokens={rewardTokens || DEFAULT_LIST}
            />
          </DynamicFlexBox>
        </AnimatePresence>
        {Dialog}
      </>
    )
  }
)

const DynamicFlexBox = motion(FlexBox)

SkyPassClaimReward.displayName = 'SkyPassClaimReward'
