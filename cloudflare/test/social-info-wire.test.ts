import { describe, expect, it } from 'vitest'

import {
  sourceDiscordInfoWire,
  sourceTwitchInfoWire,
  sourceTwitchStreamWire
} from '../src/social-info-wire'

describe('source social-info JSON wire', () => {
  it('emits Discord zero values and strips cached metadata', () => {
    expect(sourceDiscordInfoWire({})).toEqual({
      users_online: 0,
      instant_invite_url: ''
    })
    expect(
      sourceDiscordInfoWire({
        users_online: 9,
        instant_invite_url: 'https://discord.gg/cloud-weasel',
        internalCacheKey: 'private'
      } as Parameters<typeof sourceDiscordInfoWire>[0] & {
        internalCacheKey: string
      })
    ).toEqual({
      users_online: 9,
      instant_invite_url: 'https://discord.gg/cloud-weasel'
    })
  })

  it('emits every Twitch stream field and preserves a nil tag slice', () => {
    expect(
      sourceTwitchStreamWire({
        id: 'stream-1',
        user_login: 'weasel_tv',
        viewer_count: 42,
        tag_ids: null,
        internalToken: 'private'
      } as Parameters<typeof sourceTwitchStreamWire>[0] & {
        internalToken: string
      })
    ).toEqual({
      id: 'stream-1',
      user_id: '',
      user_login: 'weasel_tv',
      user_name: '',
      game_id: '',
      game_name: '',
      type: '',
      title: '',
      viewer_count: 42,
      started_at: '',
      language: '',
      thumbnail_url: '',
      tag_ids: null,
      is_mature: false
    })
  })

  it('preserves nil stream slices and nil pointer elements', () => {
    expect(sourceTwitchInfoWire({})).toEqual({
      streamers_online: 0,
      vods_available: 0,
      streams: null
    })
    expect(
      sourceTwitchInfoWire({
        streamers_online: 1,
        vods_available: 2,
        streams: [null, { id: 'stream-1', tag_ids: [] }],
        internalCacheKey: 'private'
      } as Parameters<typeof sourceTwitchInfoWire>[0] & {
        internalCacheKey: string
      })
    ).toEqual({
      streamers_online: 1,
      vods_available: 2,
      streams: [
        null,
        {
          id: 'stream-1',
          user_id: '',
          user_login: '',
          user_name: '',
          game_id: '',
          game_name: '',
          type: '',
          title: '',
          viewer_count: 0,
          started_at: '',
          language: '',
          thumbnail_url: '',
          tag_ids: [],
          is_mature: false
        }
      ]
    })
  })
})
