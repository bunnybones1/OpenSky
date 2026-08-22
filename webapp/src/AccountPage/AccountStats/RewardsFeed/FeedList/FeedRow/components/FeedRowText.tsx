import { memo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Text } from '~/__deprecated__/Text'
import env from '~/env'
import { GameMode, ItemType, PlayerRank, PlayerRankStage } from '~/lib/proto'
import { Box } from '~/shared/components/Base'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useGetCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { useNavigateToItemsCards } from '~/shared/hooks/cards/useNavigateToItemsCards'
import { OwnershipFilter } from '~/shared/types/cards'
import { FeedItem, FeedItemType } from '~/shared/types/feed'

interface Props {
  feedItem: FeedItem
}

// TODO when updating this component, fix the  i18n integration - sentences should never be split up into multi keys and should use interpolation.
export const FeedRowText = memo(({ feedItem }: Props) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getCardTexts } = useGetCardTexts()

  const { navigateToItemsCards } = useNavigateToItemsCards()

  switch (feedItem.type) {
    case FeedItemType.rankUp: {
      const meta = feedItem.meta
      return (
        <Text
          color="purple9"
          fontFamily="condensed"
          fontSize={[16, 16, 18, 22]}
          dangerouslySetInnerHTML={{
            __html: t('feed.rankUp', {
              rank: t(
                !!meta.rankStage &&
                  meta.rankStage !== PlayerRankStage.STAGE_NONE &&
                  (meta.rank === PlayerRank.EXPERT ||
                    meta.rank === PlayerRank.WANDERER ||
                    meta.rank === PlayerRank.TRAINEE ||
                    meta.rank === PlayerRank.APPRENTICE)
                  ? `ranks.${meta.rank}-${meta.rankStage}`
                  : `ranks.${meta.rank}`
              ),
              mode: t(
                `ranks.${
                  meta.mode === GameMode.RANKED_CONSTRUCTED
                    ? 'constructed'
                    : 'discovery'
                }Mode`
              )
            })
          }}
        />
      )
    }

    case FeedItemType.cardGained: {
      const meta = feedItem.meta
      const hasMulti = meta.cards.length > 1
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          {hasMulti ? (
            <Trans
              t={t}
              i18nKey="play.gainedNumCards"
              components={{
                white: <span className="whiteText" />
              }}
              count={meta.cards.length}
            />
          ) : (
            <Trans
              t={t}
              i18nKey="play.gainedSpecificCard"
              components={{
                white: <span className="whiteText" />
              }}
              values={{
                name: getCardTexts(meta.cards[0].baseId).name
              }}
            />
          )}
        </Text>
      )
    }

    case FeedItemType.stickerGained: {
      const meta = feedItem.meta
      const hasMulti = meta.stickers.length > 1
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          {hasMulti ? (
            <Trans
              t={t}
              i18nKey="play.gainedNumStickers"
              components={{
                white: <span className="whiteText" />
              }}
              count={meta.stickers.length}
            />
          ) : (
            <Trans
              t={t}
              i18nKey="play.gainedSpecificSticker"
              components={{
                white: <span className="whiteText" />
              }}
              values={{
                name: meta.stickers[0].name
              }}
            />
          )}
        </Text>
      )
    }

    case FeedItemType.cardbackGained: {
      const meta = feedItem.meta
      const hasMulti = meta.cardbacks.length > 1
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          {hasMulti ? (
            <Trans
              t={t}
              i18nKey="play.gainedNumCardBacks"
              components={{
                white: <span className="whiteText" />
              }}
              count={meta.cardbacks.length}
            />
          ) : (
            <Trans
              t={t}
              i18nKey="play.gainedSpecificCardBack"
              components={{
                white: <span className="whiteText" />
              }}
              values={{
                name: meta.cardbacks[0].name
              }}
            />
          )}
        </Text>
      )
    }

    case FeedItemType.delayedRewards: {
      const meta = feedItem.meta
      const hasMulti = meta.cards.length > 1
      return (
        <Box
          onClick={() => {
            navigate(ROUTES_CONFIG.routes.PENDING_GOLDS.directPath)
          }}
        >
          <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
            {hasMulti ? (
              <>
                <Trans
                  t={t}
                  i18nKey="play.gainedNumCards"
                  components={{
                    white: <span className="whiteText" />
                  }}
                  count={meta.cards.length}
                />
                *
              </>
            ) : (
              <>
                <Trans
                  t={t}
                  i18nKey="play.gainedSpecificCard"
                  components={{
                    white: <span className="whiteText" />
                  }}
                  values={{
                    name: getCardTexts(meta.cards[0].baseId).name
                  }}
                />
                *
              </>
            )}
            <Box style={{ fontSize: '14px' }}>
              {t(
                env.AUTH_MODE === 'google'
                  ? 'play.delayedDelivery'
                  : 'play.delayedMinting',
                { count: meta.cards.length }
              )}
            </Box>
          </Text>
        </Box>
      )
    }

    case FeedItemType.delayedRewardsMinted: {
      const meta = feedItem.meta
      const hasMulti = meta.cards.length > 1
      return (
        <Box
          onClick={() => {
            navigateToItemsCards({
              ownership: OwnershipFilter.OWNED,
              grade: ItemType.SW_GOLD_CARDS
            })
          }}
        >
          <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
            {hasMulti ? (
              <Trans
                t={t}
                i18nKey={
                  env.AUTH_MODE === 'google'
                    ? 'play.completedDeliveryNumCards'
                    : 'play.completedMintingNumCards'
                }
                components={{
                  white: <span className="whiteText" />
                }}
                count={meta.cards.length}
              />
            ) : (
              <Trans
                t={t}
                i18nKey={
                  env.AUTH_MODE === 'google'
                    ? 'play.completedDeliverySpecificCard'
                    : 'play.completedMintingSpecificCard'
                }
                components={{
                  white: <span className="whiteText" />
                }}
                values={{ name: getCardTexts(meta.cards[0].baseId).name }}
              />
            )}
            <Box style={{ fontSize: '14px' }}>{t('feed.availableInLibrary')}</Box>
          </Text>
        </Box>
      )
    }

    case FeedItemType.rankedRewards: {
      const meta = feedItem.meta
      const hasMulti = meta.cards.length > 1
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          {hasMulti ? (
            <Trans
              t={t}
              i18nKey="play.gainedNumCardsFromRankedLeaderboard"
              components={{
                white: <span className="whiteText" />
              }}
              count={meta.cards.length}
            />
          ) : (
            <Trans
              t={t}
              i18nKey="play.gainedSpecificCardFromRankedLeaderboard"
              components={{
                white: <span className="whiteText" />
              }}
              values={{
                name: getCardTexts(meta.cards[0].baseId).name
              }}
            />
          )}
        </Text>
      )
    }

    case FeedItemType.rankedRewardsTickets: {
      const meta = feedItem.meta
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          <Trans
            t={t}
            i18nKey="play.gainedNumTicketsFromLeaderboard"
            components={{
              white: <span className="whiteText" />
            }}
            count={meta}
          />
        </Text>
      )
    }

    case FeedItemType.ticketGained: {
      const meta = feedItem.meta
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          <Trans
            t={t}
            i18nKey="play.gainedNumTicketsFromLeaderboard"
            components={{
              white: <span className="whiteText" />
            }}
            count={meta}
          />
        </Text>
      )
    }

    case FeedItemType.starterDeckUnlocked: {
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          {t('feed.starterDeckUnlocked')}
        </Text>
      )
    }

    case FeedItemType.conquestV2Reward: {
      const { amount } = feedItem.meta
      return (
        <Text color="purple9" fontFamily="condensed" fontSize={[16, 16, 18, 22]}>
          <Trans
            t={t}
            i18nKey="play.gainedUSDC"
            components={{
              white: <span className="whiteText" />
            }}
            count={amount}
          />
        </Text>
      )
    }

    default: {
      return null
    }
  }
})

FeedRowText.displayName = 'FeedRowText'
