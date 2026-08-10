import { Actions, TabNode } from 'flexlayout-react'

import { LayoutComponent } from '../../types'
import { Layout as TypedLayout } from '../../validateModel'

export function setScrollTo(
  node: TabNode,
  layout: TypedLayout<LayoutComponent>,
  scrollTo: { id: string; column?: string | undefined } | undefined
) {
  const tabID = node.getId()
  layout.doAction(
    Actions.updateNodeAttributes(tabID, {
      config: { ...node.getConfig(), scrollTo }
    })
  )
}

export function unsetCtrlFJustPressed(
  node: TabNode,
  layout: TypedLayout<LayoutComponent>
) {
  const tabID = node.getId()
  layout.doAction(
    Actions.updateNodeAttributes(tabID, {
      config: { ...node.getConfig(), ctrlFJustPressed: false }
    })
  )
}
