import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { derivedHeroFeatureState } from '~/HeroFeaturePage/shared/state'

import { HeroToMintRow } from './components/HeroToMintRow'

export const HeroesToMintList = memo(() => {
  const { skinIdsInOrder } = useSnapshot(derivedHeroFeatureState)

  return (
    <>
      {skinIdsInOrder.map((id, i) => (
        <HeroToMintRow key={id} id={id} isFirst={i === 0} />
      ))}
    </>
  )
})

HeroesToMintList.displayName = 'HeroesToMintList'
