import { createContext, RefObject } from 'react'

import { LayoutComponent } from './types'
import { Layout, validateModelAgainstType } from './validateModel'

export const LayoutContext = createContext<RefObject<Layout<LayoutComponent>> | null>(
  null
)

export const problemsTabID = 'b2d9dcdc-6ce2-4feb-a128-1406d79873a3'

export const uiJsonModel = validateModelAgainstType<LayoutComponent>({
  global: {
    tabEnableFloat: false,
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
    borderMinSize: 100
  },
  borders: [
    {
      type: 'border',
      location: 'bottom',
      selected: 0,
      children: [
        {
          type: 'tab',
          id: '#b2d9dcdc-6ce2-4feb-a128-1406d79873a1',
          name: '📝 Sheets',
          component: 'sheet_picker',
          enableRename: false,
          enableClose: false
        },
        {
          type: 'tab',
          id: 'b2d9dcdc-6ce2-4feb-a128-1406d79873a2',
          component: 'tools',
          name: '🧰 Tools',
          enableRename: false,
          enableClose: false
        },
        {
          type: 'tab',
          id: problemsTabID,
          component: 'problems',
          name: 'Problems',
          enableRename: false,
          enableClose: false
        },
        {
          type: 'tab',
          id: 'b2d9dcdc-6ce2-4feb-a128-1406d79873a4',
          component: 'console',
          name: '💻 Console',
          enableRename: false,
          enableClose: false
        }
      ]
    }
  ],
  layout: {
    type: 'row',
    id: '#33e96ec6-7cfa-4f28-8d18-4223746bde2b',
    children: [
      {
        type: 'tabset',
        children: []
      }
    ]
  }
})
