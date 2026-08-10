import { NiceCategory } from '@opensky/shared/utils/NiceElement'

import { Debuggable, debuggables } from '~/debug/debugRegistry'

import { createCategoricalNiceModal } from './createNiceModal'
import { createCloseDebugOverlay } from './ui'

export function registerDebugModalCategory(
  folder: string,
  category: NiceCategory
) {
  debuggables.register(
    folder + '/' + category,
    new Debuggable(async () => {
      const overlay = createCloseDebugOverlay()
      const { modal, updateModalScroller } = await createCategoricalNiceModal(
        category,
        'bottom'
      )
      return [overlay, modal.mesh, updateModalScroller]
    })
  )
}
