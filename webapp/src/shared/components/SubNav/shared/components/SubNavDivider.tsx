import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SubNavDividerStyle } from './SubNavDivider.css'

export const SubNavDivider = memo(() => {
  return <div className={clsx(Sprinkles({ height: 'full' }), SubNavDividerStyle)} />
})

SubNavDivider.displayName = 'SubNavDivider'
