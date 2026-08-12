/* eslint-disable valtio/state-snapshot-rule */
import { getLegacyHeroID, getStickerID } from '@opensky/shared/assetsIDs'
import { BASE_HERO_SKINS, ID_HEROES } from '@opensky/shared/constants'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { CardSet, DeckClass, DeckType, ItemType, SkypassReward } from '~/lib/proto'
import { SoundClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { DeckIcon } from '~/shared/components/DeckIcon'
import { Icon } from '~/shared/components/Icon/Icon'
import { SkyTagTitle } from '~/shared/components/SkyTagTitle'
import { AllHeroSkins } from '~/shared/constants/hero-skins'
import { AllStickers } from '~/shared/constants/stickers'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useUserDecks } from '~/shared/queries/decks/useUserDecks'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import {
  SkypassSelectorState,
  skypassSelectorState
} from '~/shared/state/skypass-state'

import {
  CARD_TYPES,
  TRADABLE_REWARDS,
  TRADABLE_REWARDS_LIMITED
} from '../../../../../shared/constants'
import { IconsFan } from './components/IconsFan'
import { LevelProgress } from './components/LevelProgress'
import { Thumb } from './components/Thumb'
import RewardIntersectionObserver from './helpers/RewardIntersectionObserver'
import { ThumbType } from './shared/constants'
import {
  ItemAmount,
  ItemAmountText,
  ItemBackgroundOverlay,
  ItemBorder,
  ItemBorderOverlay,
  ItemClaimed,
  ItemLocked,
  ItemThumbInnerOverlay,
  ItemThumbInnerOverlayPulse,
  ItemThumbOverlay
} from './SkyPassThumbnail.css'

const THUMBNAILS_IMAGES = {
  [ItemType.SW_SILVER_CARDS]: 'icons/silver-card-with-letter.webp',
  [ItemType.SW_BASE_CARDS]: 'icons/base-card-with-letter.webp',
  [ItemType.SW_CONQUEST_TICKET]: 'icons/conquest-ticket-splash.webp',
  [ItemType.SW_CARD_BACKS]: 'card-backs/2x/',
  [ItemType.SW_STICKER_POINTS]: 'icons/sticker-points.webp',
  [`${CardSet.HEXBOUND_INVASION}_${ItemType.SW_BASE_CARDS}`]:
    'icons/hexbound-icon.webp',
  [`${CardSet.HEXBOUND_INVASION}_${ItemType.SW_SILVER_CARDS}`]:
    'icons/hexbound-icon-silver.webp'
}
const thumbnailSizes = [`64px`, `76px`, `96px`, `116px`, `120px`]
const SECONDARY_THUMBNAILS_IMAGES = {
  [ItemType.SW_SILVER_CARDS]: 'icons/silver-card.webp',
  [ItemType.SW_BASE_CARDS]: 'icons/base-card.webp'
}
const THUMBNAILS_HEIGHTS = {
  [ItemType.SW_HERO]: '100%',
  [ItemType.SW_STICKER_POINTS]: '64px'
}

interface RewardLevelProps {
  level: number
  onClick: (rewardToSelect: SkypassSelectorState['selectedLevelAndReward']) => void
  setRewardVisibility?: (id: number, isVisible: boolean) => void
  hasPremium: boolean
  isDefaultFocus: boolean
  cardBackName?: string
  scrollToLevel?: (left: number) => void
}

export const SkyPassThumbnail = memo(
  ({
    level,
    onClick,
    hasPremium,
    isDefaultFocus,
    cardBackName,
    setRewardVisibility,
    scrollToLevel
  }: RewardLevelProps) => {
    const { data: userDecks } = useUserDecks()
    const { getAssetUrl } = useGetAssetContext()
    const { selectedLevelAndReward } = useSnapshot(skypassSelectorState)
    const rewardRef = useRef<HTMLDivElement>(null)
    const { data: authedAccount } = useAuthedAccount()
    const { data: skyPassInfo } = useSkyPassInfo()

    const levelData = useMemo(() => {
      if (!skyPassInfo) return undefined
      return skyPassInfo.levels.find((_level) => _level.level === level)
    }, [level, skyPassInfo])

    const userLevel = authedAccount?.seasonLevel

    const isTradable = useCallback(
      (itemType: ItemType) =>
        env.AUTH_MODE !== 'google' &&
        (TRADABLE_REWARDS.includes(itemType) ||
          TRADABLE_REWARDS_LIMITED.includes(itemType)),
      []
    )

    useEffect(() => {
      if (isDefaultFocus && rewardRef.current && !!scrollToLevel) {
        const left = rewardRef.current.getBoundingClientRect().left
        scrollToLevel(left)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const getCardSet = useCallback(
      (reward: SkypassReward) => reward?.attributes?.cardSets?.[0],
      []
    )

    const isClaimable = useCallback(
      (reward: SkypassReward) => {
        if (reward.tier === 'PREMIUM' && !hasPremium) return false
        else
          return (
            reward.claimable &&
            levelData?.earned &&
            userLevel !== undefined &&
            level <= userLevel &&
            !skypassSelectorState.claimedRewards?.includes(reward?.id)
          )
      },
      [hasPremium, level, levelData?.earned, userLevel]
    )

    const isClaimed = useCallback(
      (reward: SkypassReward) =>
        reward.claimed || skypassSelectorState.claimedRewards?.includes(reward?.id),
      []
    )

    const handleRewardImage = useCallback(
      (reward: SkypassReward) => {
        const cardSet = getCardSet(reward)
        if (reward?.itemType === ItemType.SW_STICKERS) {
          return `stickers/6x/${
            AllStickers.get(getStickerID(reward.attributes.tokenIDs[0]))?.artID
          }.webp`
        } else if (reward?.itemType === ItemType.SW_HERO) {
          return `heroes/thumbnails/${
            BASE_HERO_SKINS[ID_HEROES[reward.attributes.tokenIDs[0]]]?.artID
          }.webp`
        } else if (reward?.itemType === ItemType.SW_HERO_SKINS) {
          return `heroes/thumbnails/${
            AllHeroSkins.get(getLegacyHeroID(reward.attributes.tokenIDs[0]))?.artID
          }.webp`
        } else if (reward?.itemType === ItemType.SW_CARD_BACKS) {
          return `${THUMBNAILS_IMAGES[reward.itemType]}${cardBackName}.webp`
        }
        if (cardSet) return THUMBNAILS_IMAGES[`${cardSet}_${reward.itemType}`]
        return THUMBNAILS_IMAGES[reward.itemType]
      },
      [getCardSet, cardBackName]
    )

    const getStarterDeck = useCallback(
      (reward: SkypassReward) => {
        return userDecks?.find((_deck) => {
          const isStarter =
            _deck.deckType! &&
            (_deck.deckType == DeckType.UNLOCKED_STARTER ||
              _deck.deckType == DeckType.LOCKED_STARTER)

          return (
            isStarter &&
            _deck.class === (reward?.attributes?.unlockDeckClasses?.[0] as DeckClass)
          )
        })
      },
      [userDecks]
    )

    const hasCardSetMulti = useCallback(
      (reward: SkypassReward) => !!getCardSet(reward) && reward.amount > 1,
      [getCardSet]
    )

    const renderRewardImage = useCallback(
      (reward: SkypassReward) => {
        if (reward.itemType === ItemType.SW_TITLES) {
          return <SkyTagTitle id={reward.attributes.tokenIDs[0]} fontSize="12px" />
        }

        if (!!getStarterDeck(reward))
          return (
            <Box
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '64px',
                height: '74px',
                left: '10px',
                top: '-8px',
                transform: 'scale(0.62)'
              }}
            >
              <DeckIcon deck={getStarterDeck(reward)} />
            </Box>
          )
        else if (reward.amount > 1 && CARD_TYPES.includes(reward?.itemType)) {
          let primaryImg = handleRewardImage(reward)
          let secondaryImg = ''

          if (hasCardSetMulti(reward))
            primaryImg = THUMBNAILS_IMAGES[`${getCardSet(reward)}_${reward.itemType}`]
          else secondaryImg = SECONDARY_THUMBNAILS_IMAGES[reward?.itemType]

          return (
            <FlexBox
              type="centered-start-row"
              flexWrap="nowrap"
              style={{
                position: 'relative',
                height: '100%',
                width: reward.amount >= 5 ? '100%' : '90%'
              }}
            >
              <IconsFan
                amount={reward.amount}
                primaryImg={primaryImg}
                secondaryImg={secondaryImg}
              />
            </FlexBox>
          )
        }

        if (!!getAssetUrl) {
          return (
            <img
              style={{
                width: '64px',
                height: THUMBNAILS_HEIGHTS[reward?.itemType] || '48px',
                objectFit:
                  reward?.itemType === ItemType.SW_HERO ? 'initial' : 'contain'
              }}
              src={getAssetUrl(`webapp/${handleRewardImage(reward)}`)}
            />
          )
        }
        return null
      },
      [getAssetUrl, getCardSet, handleRewardImage, getStarterDeck, hasCardSetMulti]
    )

    const visibilityCallback = useCallback(
      ({ isIntersecting }: IntersectionObserverEntry) => {
        if (!!setRewardVisibility) {
          setRewardVisibility(level, isIntersecting)
        }
      },
      [level, setRewardVisibility]
    )

    useEffect(() => {
      if (!!setRewardVisibility && !!rewardRef.current) {
        RewardIntersectionObserver.watch(rewardRef.current, visibilityCallback)
      }
    }, [setRewardVisibility, visibilityCallback])

    const itemWidth = useCallback((reward: SkypassReward) => {
      if (reward.itemType === ItemType.SW_TITLES) return '160px'
      if (CARD_TYPES.includes(reward?.itemType))
        return thumbnailSizes[reward.amount ? reward.amount - 1 : 0]
      if (reward?.itemType === ItemType.SW_STICKER_POINTS) return '66px'
      return '100%'
    }, [])

    return (
      <FlexBox
        type="centered-between-row"
        position="relative"
        height="100%"
        mr="3px"
        ml="3px"
        ref={rewardRef}
        style={{ scrollMargin: `calc(50vw - 64px)` }}
        data-skypass-level={level}
      >
        {levelData?.rewards?.map((reward, i) => (
          <FlexBox
            key={i}
            height="96px"
            type="end-column"
            position="relative"
            width={
              levelData?.rewards.length === 1
                ? `calc(${itemWidth(reward)} - 2px)`
                : 'auto'
            }
          >
            {isClaimable(reward) && !isClaimed(reward) ? (
              <Thumb type={'CLAIM' as ThumbType} />
            ) : reward.tier === 'FREE' && !isClaimed(reward) ? (
              <Thumb type={ThumbType.FREE} />
            ) : (
              ''
            )}
            <FlexBox
              onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
              onMouseDown={() => SoundClient.playSound('CursorMainClick')}
              onClick={() => {
                onClick({ level: levelData.level, reward: i })
              }}
              position="relative"
              width={
                reward.amount > 1 || reward.itemType === ItemType.SW_TITLES
                  ? itemWidth(reward)
                  : '64px'
              }
              height="64px"
              className={
                ItemBorder[
                  selectedLevelAndReward?.reward === i &&
                  selectedLevelAndReward.level === levelData.level
                    ? 'selected'
                    : isClaimed(reward)
                      ? 'claimed'
                      : isClaimable(reward)
                        ? 'claim'
                        : 'primary'
                ]
              }
              style={{
                background: `radial-gradient(circle, ${
                  isTradable(reward?.itemType)
                    ? 'rgba(120,26,108,1)'
                    : 'rgba(91,26,126,1)'
                } 26%, rgba(35,21,68,1) 100%)`
              }}
            >
              {selectedLevelAndReward?.reward === i &&
                selectedLevelAndReward.level === levelData.level && (
                  <Box
                    width={
                      reward.amount > 1 || reward.itemType === ItemType.SW_TITLES
                        ? itemWidth(reward)
                        : '64px'
                    }
                    height="64px"
                    className={ItemThumbOverlay}
                  >
                    <Box
                      width={
                        reward.amount > 1 || reward.itemType === ItemType.SW_TITLES
                          ? `calc(${itemWidth(reward)} - 2px)`
                          : '63px'
                      }
                      height="62px"
                      className={
                        ItemThumbInnerOverlay[
                          isClaimable(reward) ? 'claim' : 'primary'
                        ]
                      }
                    />
                    <Box
                      width={
                        reward.amount > 1 || reward.itemType === ItemType.SW_TITLES
                          ? `calc(${itemWidth(reward)} - 2px)`
                          : '63px'
                      }
                      height="62px"
                      className={ItemThumbInnerOverlayPulse}
                    />
                  </Box>
                )}
              <Box
                width={
                  reward.amount > 1 || reward.itemType === ItemType.SW_TITLES
                    ? itemWidth(reward)
                    : '62px'
                }
                height="62px"
                className={
                  ItemBorderOverlay[
                    selectedLevelAndReward?.reward === i &&
                    selectedLevelAndReward.level === levelData.level
                      ? 'selected'
                      : 'primary'
                  ]
                }
              />
              {reward.tier === 'PREMIUM' && !hasPremium && !isClaimed(reward) && (
                <Icon
                  height="16px"
                  type="lock-stroke"
                  color="purple8"
                  className={ItemLocked}
                />
              )}
              {isClaimed(reward) ? (
                <Icon
                  height="14px"
                  type="check"
                  color="cold7"
                  className={ItemClaimed}
                />
              ) : (
                reward.amount > 1 && (
                  <svg className={ItemAmount}>
                    <text
                      className={ItemAmountText}
                      x="30"
                      y="20"
                      dominantBaseline="end"
                      textAnchor="end"
                    >
                      {reward.amount}
                    </text>
                  </svg>
                )
              )}
              {isTradable(reward?.itemType) && !!getAssetUrl && (
                <img
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '40px'
                  }}
                  src={getAssetUrl(`webapp/icons/mint-icon-thumbnail-overlay.webp`)}
                />
              )}
              {renderRewardImage(reward)}
              <Box
                className={
                  ItemBackgroundOverlay[
                    isClaimed(reward)
                      ? 'claimed'
                      : isClaimable(reward) &&
                          selectedLevelAndReward?.reward === i &&
                          selectedLevelAndReward.level === levelData.level
                        ? 'claimSelected'
                        : isClaimable(reward)
                          ? 'claim'
                          : 'primary'
                  ]
                }
                width={
                  reward.amount > 1 || reward.itemType === ItemType.SW_TITLES
                    ? `calc(${itemWidth(reward)} - 2px)`
                    : '60px'
                }
              />
            </FlexBox>
          </FlexBox>
        ))}
        <LevelProgress
          experience={Number(authedAccount?.experience)}
          levelUpXP={Number(authedAccount?.levelUpXP)}
          userLevel={Number(authedAccount?.seasonLevel)}
          level={level}
        />
      </FlexBox>
    )
  }
)

SkyPassThumbnail.displayName = 'SkyPassThumbnail'
