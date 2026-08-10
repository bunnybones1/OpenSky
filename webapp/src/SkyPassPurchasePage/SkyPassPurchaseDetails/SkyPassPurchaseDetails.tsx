import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardBackDetail } from './components/CardBackDetail'
import { ConquestDetail } from './components/ConquestDetail'
import { ExpansionDetails } from './components/ExpansionDetails'
import { NewSetCardDetail } from './components/NewSetCardDetail'
import { NewStickerDetail } from './components/NewStickerDetail'
import { RerollDetail } from './components/RerollDetail'
import { SilverCardDetail } from './components/SilverCardDetail'
import { StickerPointDetails } from './components/StickerPointDetails'
import { SkyPassPurchaseDetailsStyle } from './SkyPassPurchaseDetails.css'

export const SkyPassPurchaseDetails = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingBottom: { base: '24px', tablet: '48px', tabletWide: '96px' }
        }),
        SkyPassPurchaseDetailsStyle
      )}
    >
      <CardBackDetail />
      <ConquestDetail />
      <ExpansionDetails />
      <StickerPointDetails />
      <NewSetCardDetail />
      <NewStickerDetail />
      <SilverCardDetail />
      <RerollDetail />
    </div>
  )
})

SkyPassPurchaseDetails.displayName = 'SkyPassPurchaseDetails'
