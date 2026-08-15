import type { Reward } from '@opensky/proto'

/**
 * Recreates the JSON shape produced by encoding/json for proto.Reward.
 *
 * The generated Go structs deliberately do not use `omitempty`: inactive
 * reward variants and nested pointer fields are serialized as null. The
 * generated TypeScript interfaces model those pointers as optional, so a
 * normal JSON.stringify would otherwise remove them from match-completion,
 * reconnect, and recent-match payloads.
 */
export const sourceRewardWire = (reward: Reward): Reward =>
  ({
    accountID: reward.accountID,
    type: reward.type,
    gameMode: reward.gameMode ?? null,
    rank: reward.rank
      ? {
          beforeMatch: reward.rank.beforeMatch ?? null,
          afterMatch: reward.rank.afterMatch ?? null
        }
      : null,
    exp: reward.exp
      ? {
          amount: reward.exp.amount,
          reason: reward.exp.reason,
          reasonExtraData: reward.exp.reasonExtraData ?? null,
          currentLevel: reward.exp.currentLevel,
          requiredExp: reward.exp.requiredExp,
          beforeMatchExp: reward.exp.beforeMatchExp
        }
      : null,
    card: reward.card
      ? {
          amount: reward.card.amount,
          card: reward.card.card ?? null,
          item: reward.card.item ?? null
        }
      : null,
    hero: reward.hero ?? null,
    heroSkin: reward.heroSkin ?? null,
    deck: reward.deck
      ? {
          deckClass: reward.deck.deckClass,
          tokenIds: reward.deck.tokenIds ?? null
        }
      : null,
    conquestV2TreasureProgress: reward.conquestV2TreasureProgress
      ? {
          beforeMatch: reward.conquestV2TreasureProgress.beforeMatch ?? null,
          afterMatch: reward.conquestV2TreasureProgress.afterMatch ?? null
        }
      : null,
    stickerPoints: reward.stickerPoints ?? null
  }) as unknown as Reward

export const sourceRewardListWire = (rewards: Reward[]): Reward[] =>
  rewards.map(sourceRewardWire)
