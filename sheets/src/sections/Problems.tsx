import { Actions, Model, TabNode } from 'flexlayout-react'
import { useContext } from 'react'
import { useSnapshot } from 'valtio'

import { LayoutContext } from '../layout'
import { validationStore } from '../stores/designData'
import { userSettings } from '../stores/userSettings'
import { LayoutComponent } from '../types'
import { randomUUID } from '../utils/uuid'
import {
  IJsonModel,
  Layout,
  Model as TypedModel,
  Node as TypedNode
} from '../validateModel'

export function Problems() {
  const { brainstorm } = useSnapshot(userSettings)
  const { errors } = useSnapshot(validationStore)
  const layout = useContext(LayoutContext)

  if (brainstorm) {
    return (
      <div>
        Brainstorm mode is enabled.{' '}
        {errors.length ? <>ignoring {errors.length} errors</> : null}
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      {errors.length ? (
        <div>
          <h2
            style={{
              fontWeight: 'bold',
              fontSize: '24px',
              color: 'red',
              margin: 0
            }}
          >
            Validation Error{errors.length === 0 ? '' : 's'}
          </h2>
          {errors.map((e, i) => (
            <pre
              className={`validationError ${
                e.type === 'sheet' ? ' validationErrorWithLink' : ''
              }`}
              key={i}
              onClick={() => {
                if (layout?.current && e.type === 'sheet') {
                  focusCellInSheet(
                    layout.current,
                    userSettings.uiJsonModel as IJsonModel<LayoutComponent>,
                    e.sheet,
                    e.rowId,
                    e.columns[0]
                  )
                }
              }}
            >
              ❌[
              {e.type === 'sheet'
                ? `${e.sheet}/${e.rowId}${
                    e.columns.length ? `/(${e.columns.join(',')})` : ''
                  }`
                : ''}
              ] {e.message}
            </pre>
          ))}
        </div>
      ) : (
        <h2
          style={{
            fontWeight: 'bold'
          }}
        >
          No Errors!
        </h2>
      )}
    </div>
  )
}

function focusCellInSheet(
  layout: Layout<LayoutComponent>,
  uiModel: IJsonModel<LayoutComponent>,
  sheet: string,
  rowId: string,
  column?: string
) {
  const model = Model.fromJson(uiModel) as TypedModel<LayoutComponent>

  function findTabsOfThisSheetWithinNode(
    node: TypedNode<LayoutComponent>,
    collector: Array<TabNode> = []
  ): Array<TabNode> {
    for (const child of node.getChildren()) {
      if (child instanceof TabNode && child.getComponent() === 'sheet') {
        const tabConfig = child.getConfig()
        if (typeof tabConfig !== 'object' || !('sheet' in tabConfig)) {
          console.error(
            `Internal state inconsistency: Tab is a Sheet component, but has no Sheet configured.`
          )
        } else if (tabConfig.sheet === sheet) {
          collector.push(child)
        }
      }
      findTabsOfThisSheetWithinNode(child, collector)
    }
    return collector
  }

  const focusedTabset = model.getActiveTabset()

  const withinFocusedTabset = focusedTabset
    ? findTabsOfThisSheetWithinNode(focusedTabset)
    : []

  const closestOpenThisSheet =
    withinFocusedTabset[0] ?? findTabsOfThisSheetWithinNode(model.getRoot())[0]

  const scrollTo = {
    id: rowId,
    column
  }

  let tabID: string
  // if the sheet is open anywhere, focus that one.
  if (closestOpenThisSheet) {
    tabID = closestOpenThisSheet.getId()
    layout.doAction(Actions.selectTab(tabID))
    layout.doAction(
      Actions.updateNodeAttributes(tabID, {
        config: { ...closestOpenThisSheet.getConfig(), scrollTo }
      })
    )
  } else {
    // there's no copies of it open, pop a new one in the current tabset
    tabID = randomUUID()

    layout.addTabToActiveTabSet({
      id: tabID,
      type: 'tab',
      component: 'sheet',
      config: {
        sheet: sheet as 'art',
        scrollTo,
        ctrlFJustPressed: false
      },
      name: `${sheet} sheet`
    })
  }
}
