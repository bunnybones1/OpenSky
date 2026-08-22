import env from '~/env'

import { IdentityItemsCardDetailsControls } from './IdentityItemsCardDetailsControls'
import { LegacyItemsCardDetailsControls } from './LegacyItemsCardDetailsControls'

export const ItemsCardDetailsControls =
  env.AUTH_MODE === 'google'
    ? IdentityItemsCardDetailsControls
    : LegacyItemsCardDetailsControls

ItemsCardDetailsControls.displayName = 'ItemsCardDetailsControls'
