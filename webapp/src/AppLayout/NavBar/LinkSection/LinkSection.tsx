import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsLink } from './components/ItemsLink'
import { MarketLink } from './components/MarketLink'
import { RanksLink } from './components/RanksLink'
import { SkyPassLink } from './components/SkyPassLink'
import { PlayLink } from './PlayLink/PlayLink'

interface LinkSectionProps {
  isHorizontal: boolean
}

export const LinkSection = memo(({ isHorizontal }: LinkSectionProps) => {
  return (
    <div
      className={Sprinkles({
        flex: 1,
        height: isHorizontal ? 'full' : undefined,
        width: isHorizontal ? undefined : 'full',
        backgroundColor: 'purple4',
        borderBottom: isHorizontal ? '1px solid' : undefined,
        borderColor: isHorizontal ? 'purple7' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: isHorizontal ? 'row' : 'column'
      })}
    >
      <ItemsLink isHorizontal={isHorizontal} />
      <RanksLink isHorizontal={isHorizontal} />
      <MarketLink isHorizontal={isHorizontal} />
      <SkyPassLink isHorizontal={isHorizontal} />
      <PlayLink isHorizontal={isHorizontal} />
    </div>
  )
})

LinkSection.displayName = 'LinkSection'
