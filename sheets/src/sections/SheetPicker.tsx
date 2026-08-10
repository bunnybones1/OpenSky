import { useContext } from 'react'
import { useSnapshot } from 'valtio'

import { LayoutContext } from '../layout'
import { sheetsArrays } from '../stores/designData'

export function SheetPicker() {
  const layout = useContext(LayoutContext)
  const sheets = useSnapshot(sheetsArrays)
  const _keys = Object.keys(sheets) as Array<keyof typeof sheets>
  // TODO remove me once cosmetics data has been implemented.
  const keys = _keys.filter(
    (key) => key !== 'heroSkins' && key !== 'cardBacks' && key !== 'crystals'
  )
  return (
    <div style={{ padding: '16px' }}>
      {keys.map((key) => {
        return (
          <button
            className="themed"
            style={{ margin: '16px' }}
            key={key}
            onClick={() => {
              layout?.current?.addTabToActiveTabSet({
                type: 'tab',
                component: 'sheet',
                name: `${key} sheet`,
                config: {
                  sheet: key,
                  ctrlFJustPressed: false
                }
              })
            }}
          >
            Open {key}
          </button>
        )
      })}
    </div>
  )
}
