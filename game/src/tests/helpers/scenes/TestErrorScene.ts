import { getAssetsManager } from '~/assets'
import { UI } from '~/scenes/ui'
import ErrorDialogContainer from '~/scenes/ui/containers/errorDialog'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

if (import.meta.hot) {
  import.meta.hot.accept('~/scenes/ui/containers/errorDialog', () => {
    console.warn(
      'ErrorDialogContainer updated, not forcing a refresh via TestErrorScene.ts'
    )
  })
}
class TestErrorScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    super.initUI(ui)
    const container = ui.getContainer('randomTests')
    await container.ready
    container.show()
    const longMsg = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`
    makeQuickButtonColumn(container, [
      new QuickButtonData('long error, 1 button', () =>
        ErrorDialogContainer.present(
          ui,
          `Match: ${Number(
            3498539
          ).toFixed()}\n${new Date().toISOString()}\n${longMsg
            .split('\\n')
            .join('\n')}`,
          {
            label: 'Close Dialog',
            onSelect: () => {
              // nothing
            }
          }
        )
      ),
      new QuickButtonData('short error, 1 button', () =>
        ErrorDialogContainer.present(ui, `uh-oh!`, {
          label: 'Close Dialog',
          onSelect: () => {
            // nothing
          }
        })
      ),
      new QuickButtonData('long error, 2 buttons', () =>
        ErrorDialogContainer.present(
          ui,
          longMsg,
          {
            label: 'Close Dialog',
            onSelect: () => {
              // nothing
            }
          },
          {
            label: 'Second Option',
            onSelect: () => {
              // nothing
            }
          }
        )
      ),
      new QuickButtonData('short error, 2 buttons', () =>
        ErrorDialogContainer.present(
          ui,
          `wahoo!`,
          {
            label: 'Close Dialog',
            onSelect: () => {
              // nothing
            }
          },
          {
            label: 'Second Option',
            onSelect: () => {
              // nothing
            }
          }
        )
      )
    ])
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestErrorScene
