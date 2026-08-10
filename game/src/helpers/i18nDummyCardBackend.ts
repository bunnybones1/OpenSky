import { BaseCard } from '@skyweaver/state-metadata'

interface BackendModule {
  type: 'backend'
  init(): void
  read(
    language: string,
    namespace: string,
    callback: (
      err: Error | string | null | undefined,
      data: { key: string | undefined } | boolean | null | undefined
    ) => void
  ): void
}

const map = new Map<string, object>()
export const i18nextDummyCardBackend: BackendModule = {
  type: 'backend',
  init: function () {
    // noop!
  },
  read: function (language, namespace, callback) {
    if (!map.has(namespace)) {
      callback('dont have', null)
    } else {
      callback(null, map.get(namespace) as any)
    }
  }
}

export function writeDummyCardString(
  key: `${BaseCard}.${'name' | 'description'}`,
  val: string
) {
  map.set('cards', { ...(map.get('cards') ?? {}), [key]: val })
}
