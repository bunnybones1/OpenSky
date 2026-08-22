import { FlagCodes } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { Link, useMatch } from 'react-router-dom'

import env from '~/env'
import { useIdentitySession } from '~/IdentitySession/IdentitySessionContext'
import { SoundClient } from '~/shared/clients'
import { BattleTag } from '~/shared/components/BattleTag/BattleTag'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ProfileLinkFrame } from './components/ProfileLinkFrame'
import { XPBar } from './components/XPBar'
import { IdentityInventoryInfo } from './IdentityInventoryInfo'
import { ProfileLinkHighlight, ProfileLinkStyle, RightFrame } from './ProfileLink.css'
import { WalletInfo } from './WalletInfo/WalletInfo'

interface ProfileLinkProps {
  isHomePageLink?: boolean
}

const LegacyProfileLink = memo(({ isHomePageLink }: ProfileLinkProps) => {
  const { data: authedAccount } = useAuthedAccount()
  const { getAssetUrl } = useGetAssetContext()

  const match = useMatch(ROUTES_CONFIG.routes.ACCOUNT.directPath)

  const to = useMemo(() => {
    if (!!authedAccount) return makeAccountRoute(authedAccount.address)
    return ''
  }, [authedAccount])

  const tagArtInfo = useAccountTagArtUrl(authedAccount?.tagArtID)

  return (
    <Link
      to={to}
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative'
        }),
        ProfileLinkStyle
      )}
      data-id="user-profile"
      onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
      onMouseDown={() => SoundClient.playSound('CursorMainClick')}
    >
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          backgroundColor: 'purple4',
          borderBottom: '1px solid',
          borderColor: 'purple7',
          position: 'relative',
          overflow: 'hidden'
        })}
      >
        {!!authedAccount && (
          <BattleTag
            frameType="center"
            artUrl={tagArtInfo?.raw}
            name={authedAccount.name}
            region={authedAccount.region as FlagCodes | undefined}
            infoClassName={Sprinkles({ paddingBottom: '8px' })}
            crystalID={authedAccount.crystalID}
          />
        )}
        {!!authedAccount && (
          <XPBar
            level={authedAccount.seasonLevel}
            experience={authedAccount.experience}
            levelUpXP={authedAccount.levelUpXP}
          />
        )}
      </div>

      <WalletInfo />
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          alignItems: 'center',
          justifyContent: 'space-between',
          display: 'flex',
          top: 0,
          left: 0,
          zIndex: 3,
          position: 'absolute'
        })}
      >
        <ProfileLinkFrame hideFirstCorner={isHomePageLink} />
        <div className={clsx(RightFrame, Sprinkles({ height: 'full' }))}>
          <ProfileLinkFrame hideFirstCorner={isHomePageLink} />
        </div>
      </div>
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            opacity: 0,
            zIndex: 4,
            pointerEvents: 'none'
          }),
          ProfileLinkHighlight,
          { isActive: !!match }
        )}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/backgrounds/selected-desktop.webp')}
            className={Sprinkles({ width: 'full' })}
          />
        )}
      </div>
    </Link>
  )
})

LegacyProfileLink.displayName = 'LegacyProfileLink'

const IdentityProfileLink = memo(({ isHomePageLink }: ProfileLinkProps) => {
  const { account, identityReference, player } = useIdentitySession()
  const { getAssetUrl } = useGetAssetContext()
  const match = useMatch(ROUTES_CONFIG.routes.ACCOUNT.directPath)

  return (
    <Link
      to={makeAccountRoute(identityReference)}
      className={clsx(
        Sprinkles({ width: 'full', position: 'relative' }),
        ProfileLinkStyle
      )}
      data-id="user-profile"
      onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
      onMouseDown={() => SoundClient.playSound('CursorMainClick')}
    >
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          backgroundColor: 'purple4',
          borderBottom: '1px solid',
          borderColor: 'purple7',
          position: 'relative',
          overflow: 'hidden'
        })}
      >
        <BattleTag
          frameType="center"
          name={account.name}
          infoClassName={Sprinkles({ paddingBottom: '8px' })}
        />
        <XPBar
          level={player.profile.level}
          experience={player.profile.xp}
          levelUpXP={player.profile.nextLevelXp}
        />
      </div>
      <IdentityInventoryInfo />
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          alignItems: 'center',
          justifyContent: 'space-between',
          display: 'flex',
          top: 0,
          left: 0,
          zIndex: 3,
          position: 'absolute'
        })}
      >
        <ProfileLinkFrame hideFirstCorner={isHomePageLink} />
        <div className={clsx(RightFrame, Sprinkles({ height: 'full' }))}>
          <ProfileLinkFrame hideFirstCorner={isHomePageLink} />
        </div>
      </div>
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            opacity: 0,
            zIndex: 4,
            pointerEvents: 'none'
          }),
          ProfileLinkHighlight,
          { isActive: !!match }
        )}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/backgrounds/selected-desktop.webp')}
            className={Sprinkles({ width: 'full' })}
          />
        )}
      </div>
    </Link>
  )
})

IdentityProfileLink.displayName = 'IdentityProfileLink'

export const ProfileLink = memo((props: ProfileLinkProps) =>
  env.AUTH_MODE === 'google' ? (
    <IdentityProfileLink {...props} />
  ) : (
    <LegacyProfileLink {...props} />
  )
)

ProfileLink.displayName = 'ProfileLink'
