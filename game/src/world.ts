import { World } from 'gg'

import { Components } from './components'

export const world = new World<Components>({ poolSize: 2000 })
