import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { NavBarLink } from '~/AppLayout/NavBar/shared/components/NavBarLink/NavBarLink'
import env from '~/env'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsLink } from './components/ItemsLink'
import { MarketLink } from './components/MarketLink'
import { RanksLink } from './components/RanksLink'
import { PlayLink } from './PlayLink/PlayLink'

interface LinkSectionProps {
  isHorizontal: boolean
}

export const LinkSection = memo(({ isHorizontal }: LinkSectionProps) => {
  const { t } = useTranslation()

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
      {env.AUTH_MODE === 'google' ? (
        <NavBarLink
          to="/market/cards"
          text={t('navigation.market')}
          icon="shop"
          id="market"
          isHorizontal={isHorizontal}
        />
      ) : (
        <MarketLink isHorizontal={isHorizontal} />
      )}
      <PlayLink isHorizontal={isHorizontal} />
    </div>
  )
})

LinkSection.displayName = 'LinkSection'
