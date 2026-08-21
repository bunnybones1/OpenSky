import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  matchRewardOrderErrors,
  matchRewardWireErrors
} from './check-cloudflare-match-reward-wire.mjs'

const fixtures = async () => {
  const [source, rewardWire, gameMatch, producers] = await Promise.all([
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('game-server-cloudflare/src/reward-wire.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    Promise.all(
      [
        'experience.ts',
        'progression.ts',
        'conquest-points.ts',
        'conquest-settlement.ts'
      ].map(file => readFile(`game-server-cloudflare/src/${file}`, 'utf8'))
    ).then(files => files.join('\n'))
  ])
  return { source, rewardWire, gameMatch, producers }
}

const orderFixtures = async () => {
  const [
    matches,
    rank,
    awarder,
    updater,
    leveller,
    conquestState,
    conquestPoints,
    serverMatch,
    rewardWire,
    gameMatch
  ] = await Promise.all([
    readFile('api/rpc/matches.go', 'utf8'),
    readFile('api/lib/rankup/match_player_rank_upper.go', 'utf8'),
    readFile('api/lib/levels/xp/awarder.go', 'utf8'),
    readFile('api/lib/levels/xp/updater.go', 'utf8'),
    readFile('api/lib/levels/xp/leveller.go', 'utf8'),
    readFile('api/lib/conquest/state_manager.go', 'utf8'),
    readFile('api/lib/conquest/conquestv2/points_updater.go', 'utf8'),
    readFile('server/src/worker/match/Match.ts', 'utf8'),
    readFile('game-server-cloudflare/src/reward-wire.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8')
  ])
  return {
    source: {
      matches,
      rank,
      awarder,
      updater,
      leveller,
      conquestState,
      conquestPoints,
      serverMatch
    },
    rewardWire,
    gameMatch
  }
}

test('derives and enforces the complete Go match reward JSON union', async () => {
  const value = await fixtures()
  assert.deepEqual(
    matchRewardWireErrors(
      value.source,
      value.rewardWire,
      value.gameMatch,
      value.producers
    ),
    []
  )
})

test('rejects source omission, sparse variants, and incomplete boundaries', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      source: value.source.replace(
        '`json:"gameMode"`',
        '`json:"gameMode,omitempty"`'
      )
    },
    {
      ...value,
      rewardWire: value.rewardWire.replace(
        'reasonExtraData: reward.exp.reasonExtraData ?? null,',
        ''
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'return sourceRewardListWire(result.rewards[player] as Reward[])',
        'return result.rewards[player] as Reward[]'
      )
    },
    {
      ...value,
      producers: value.producers.replace('sourceRewardWire({', '({')
    },
    {
      ...value,
      producers: value.producers.replace(
        'sourceRewardListWire(parsed as Reward[])',
        'parsed as Reward[]'
      )
    }
  ]
  for (const mutation of mutations) {
    assert.notDeepEqual(
      matchRewardWireErrors(
        mutation.source,
        mutation.rewardWire,
        mutation.gameMatch,
        mutation.producers
      ),
      []
    )
  }
})

test('derives and enforces the Go terminal reward producer order', async () => {
  const value = await orderFixtures()
  assert.deepEqual(
    matchRewardOrderErrors(value.source, value.rewardWire, value.gameMatch),
    []
  )
})

test('rejects source, phase, filter, and Worker ordering drift', async () => {
  const value = await orderFixtures()
  const mutations = [
    {
      ...value,
      source: {
        ...value.source,
        matches: value.source.matches.replace(
          's.MatchXPAwarder.AwardFromMatch(',
          's.MatchXPAwarder.AwardChanged('
        )
      }
    },
    {
      ...value,
      source: {
        ...value.source,
        matches: value.source.matches.replace(
          's.ConquestV2PointsUpdater.Update(',
          's.ConquestV2PointsUpdater.Changed('
        )
      }
    },
    {
      ...value,
      source: {
        ...value.source,
        awarder: value.source.awarder.replace(
          'proto.RewardType_EXP',
          'proto.RewardType_CARD'
        )
      }
    },
    {
      ...value,
      source: {
        ...value.source,
        leveller: value.source.leveller.replace(
          'l.promoter.PromoteUnranked(',
          'l.promoter.PromoteChanged('
        )
      }
    },
    {
      ...value,
      source: {
        ...value.source,
        rank: value.source.rank.replace(
          'func (u *MatchPlayerRankUpper) PromoteUnranked(',
          'func (u *MatchPlayerRankUpper) PromoteChanged('
        )
      }
    },
    {
      ...value,
      source: {
        ...value.source,
        conquestState: value.source.conquestState.replace(
          'Type:      proto.RewardType_CARD',
          'Type:      proto.RewardType_EXP'
        )
      }
    },
    {
      ...value,
      source: {
        ...value.source,
        serverMatch: value.source.serverMatch.replace(
          'rewards.filter(',
          'rewards.map('
        )
      }
    },
    {
      ...value,
      rewardWire: value.rewardWire.replace(
        '...conquestCards,',
        '...conquestPoints,'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'sourceMatchEndRewardListWire({',
        'sourceRewardListWire({'
      )
    }
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchRewardOrderErrors(
        mutation.source,
        mutation.rewardWire,
        mutation.gameMatch
      ),
      [],
      `reward-order mutation ${index} was not rejected`
    )
  }
})
