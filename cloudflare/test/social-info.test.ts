import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleApiRequest, type AuthServices } from '../src/api'
import type { Env } from '../src/env'
import { SocialInfoRepository, type SocialInfoFetch } from '../src/social-info'

const baseEnv = env as unknown as Env
const configuredEnv = (): Env =>
  ({
    ...baseEnv,
    DISCORD_WIDGET_URL:
      'https://discord.com/api/guilds/cloud-weasel/widget.json',
    TWITCH_CLIENT_ID: 'cloud-weasel-client',
    TWITCH_CLIENT_SECRET: 'cloud-weasel-secret',
    TWITCH_GAME_ID: 'cloud-weasel-game'
  }) as Env

const twitchStream = {
  id: 'stream-1',
  user_id: 'user-1',
  user_login: 'weasel_tv',
  user_name: 'Weasel TV',
  game_id: 'cloud-weasel-game',
  game_name: 'Cloud Weasel',
  type: 'live',
  title: 'Cloud Weasel live',
  viewer_count: 42,
  started_at: '2026-08-12T12:00:00Z',
  language: 'en',
  thumbnail_url: 'https://example.com/{width}x{height}.jpg',
  tag_ids: ['strategy'],
  is_mature: false
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM social_info_cache').run()
})

describe('source social-info compatibility', () => {
  it('returns the public Discord widget shape and caches it for one minute', async () => {
    const socialFetch = vi.fn<SocialInfoFetch>(async request => {
      expect(request.url).toBe(configuredEnv().DISCORD_WIDGET_URL)
      return Response.json({
        presence_count: 17,
        instant_invite: 'https://discord.gg/cloud-weasel'
      })
    })
    const repository = new SocialInfoRepository(
      env.AUTH_DB,
      configuredEnv(),
      socialFetch,
      () => new Date('2026-08-12T12:00:00.000Z')
    )

    await expect(repository.discordInfo()).resolves.toEqual({
      users_online: 17,
      instant_invite_url: 'https://discord.gg/cloud-weasel'
    })
    await expect(repository.discordInfo()).resolves.toEqual({
      users_online: 17,
      instant_invite_url: 'https://discord.gg/cloud-weasel'
    })
    expect(socialFetch).toHaveBeenCalledTimes(1)
  })

  it(
    'uses Twitch client credentials, preserves stream fields, and caches both reads',
    async () => {
      const socialFetch = vi.fn<SocialInfoFetch>(async request => {
        const url = new URL(request.url)
        if (url.pathname === '/oauth2/token') {
          expect(request.method).toBe('POST')
          const body = new TextDecoder().decode(await request.arrayBuffer())
          expect(body).toContain('client_secret=cloud-weasel-secret')
          return Response.json({ access_token: 'short-lived-access-token' })
        }
        expect(request.headers.get('Client-ID')).toBe('cloud-weasel-client')
        expect(request.headers.get('Authorization')).toBe(
          'Bearer short-lived-access-token'
        )
        expect(url.searchParams.get('game_id')).toBe('cloud-weasel-game')
        return url.pathname.endsWith('/streams')
          ? Response.json({ data: [twitchStream] })
          : Response.json({ data: [{ id: 'vod-1' }, { id: 'vod-2' }] })
      })
      const repository = new SocialInfoRepository(
        env.AUTH_DB,
        configuredEnv(),
        socialFetch,
        () => new Date('2026-08-12T12:00:00.000Z')
      )

      await expect(repository.twitchInfo()).resolves.toEqual({
        streamers_online: 1,
        vods_available: 2,
        streams: [twitchStream]
      })
      await expect(repository.twitchInfo()).resolves.toMatchObject({
        streams: [{ user_login: 'weasel_tv' }]
      })
      expect(socialFetch).toHaveBeenCalledTimes(3)
    }
  )

  it('fails closed while configuration is absent', async () => {
    const socialFetch = vi.fn<SocialInfoFetch>()
    const services: AuthServices = {
      verifyProof: async () => {
        throw new Error('not expected')
      },
      socialFetch
    }
    const rpc = (method: string) =>
      handleApiRequest(
        new Request(
          `https://opensky.example/api/rpc/SkyWeaverAPI/${method}`,
          { method: 'POST', body: '{}' }
        ),
        baseEnv,
        services
      )

    const discord = await rpc('GetDiscordInfo')
    expect(discord.status).toBe(503)
    expect(await discord.json()).toMatchObject({ code: 'webrpc.unavailable' })
    const twitch = await rpc('GetTwitchInfo')
    expect(twitch.status).toBe(503)
    expect(await twitch.json()).toMatchObject({ code: 'webrpc.unavailable' })
    expect(socialFetch).not.toHaveBeenCalled()
  })

  it('exposes source-shaped RPC envelopes when configured', async () => {
    const socialFetch: SocialInfoFetch = async request => {
      const url = new URL(request.url)
      if (url.hostname === 'discord.com') {
        return Response.json({ presence_count: 3, instant_invite: 'invite' })
      }
      if (url.pathname === '/oauth2/token') {
        return Response.json({ access_token: 'token' })
      }
      return url.pathname.endsWith('/streams')
        ? Response.json({ data: [twitchStream] })
        : Response.json({ data: [] })
    }
    const services: AuthServices = {
      verifyProof: async () => {
        throw new Error('not expected')
      },
      socialFetch
    }
    const rpc = (method: string) =>
      handleApiRequest(
        new Request(
          `https://opensky.example/api/rpc/SkyWeaverAPI/${method}`,
          { method: 'POST', body: '{}' }
        ),
        configuredEnv(),
        services
      )

    expect(await (await rpc('GetDiscordInfo')).json()).toEqual({
      data: { users_online: 3, instant_invite_url: 'invite' }
    })
    expect(await (await rpc('GetTwitchInfo')).json()).toMatchObject({
      data: { streamers_online: 1, vods_available: 0 }
    })
  })
})
