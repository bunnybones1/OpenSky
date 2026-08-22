import { describe, expect, it, vi } from 'vitest'

import type { Env } from '../src/env'
import {
  DURABLE_EFFECT_DISCOVERIES,
  DURABLE_EFFECT_DISCOVERY_CRON,
  runScheduled,
  type DurableEffectDiscovery
} from '../src/index'

describe('durable effect discovery', () => {
  it('retains the complete reviewed responsibility inventory', () => {
    expect(DURABLE_EFFECT_DISCOVERIES.map(discovery => discovery.name)).toEqual([
      'conquest-gold-delivery',
      'conquest-readiness-drill',
      'conquest-v2-rewards',
      'leaderboard-rewards',
      'referral-sticker-rewards',
      'skypass-auto-claims',
      'push-notifications',
      'account-deletions'
    ])
  })

  it('keeps a sibling discovery alive after an independent rejection', async () => {
    const events: string[] = []
    let completeSibling!: () => void
    const siblingCanComplete = new Promise<void>(resolve => {
      completeSibling = resolve
    })
    const discoveries: readonly DurableEffectDiscovery[] = [
      {
        name: 'rejecting-responsibility',
        run: vi.fn(async () => {
          events.push('rejecting-started')
          throw new Error('injected discovery outage')
        })
      },
      {
        name: 'independent-responsibility',
        run: vi.fn(async () => {
          events.push('independent-started')
          await siblingCanComplete
          events.push('independent-completed')
        })
      }
    ]
    const pending: Promise<unknown>[] = []
    const context = {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise)
      }
    } as ExecutionContext

    runScheduled(
      { cron: DURABLE_EFFECT_DISCOVERY_CRON } as ScheduledController,
      {} as Env,
      context,
      discoveries
    )

    expect(pending).toHaveLength(2)
    await Promise.resolve()
    expect(events).toEqual(['rejecting-started', 'independent-started'])
    completeSibling()

    await expect(Promise.allSettled(pending)).resolves.toEqual([
      expect.objectContaining({ status: 'rejected' }),
      { status: 'fulfilled', value: undefined }
    ])
    expect(events).toEqual([
      'rejecting-started',
      'independent-started',
      'independent-completed'
    ])
  })
})
