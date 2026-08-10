import { DeckClass } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Skeleton from 'react-loading-skeleton'

import {
  SharedProgressBarBorder,
  SharedProgressBarGradient,
  SharedProgressBarRewardGlow,
  SharedProgressBarRewardInner,
  SharedProgressBarRewardText,
  SharedProgressBarRewardWrapper
} from '~/PlayPage/shared/style/SharedPlayPageStyle.css'
import { AngledBox } from '~/shared/components/AngledBox/AngledBox'
import { ExperienceBar } from '~/shared/components/ExperienceBar/ExperienceBar'
import { ExperienceBarType } from '~/shared/components/ExperienceBar/ExperienceBarType'
import { heroSkinFromDeckClass } from '~/shared/helpers/hero-skin-from-deck-class'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useHeroUnlockLevels } from '~/shared/queries/useHeroUnlockLevels'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

import {
  PracticeXPProgressBarCardImage,
  PracticeXPProgressBarHeroWrapper,
  PracticeXPProgressBarStyle
} from './PracticeXPProgressBar.css'

export const PracticeXPProgressBar = memo(() => {
  const { data: authedAccount } = useAuthedAccount()
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const { data: heroUnlockLevels } = useHeroUnlockLevels()
  const userLevel = authedAccount?.level || 0

  const nextPrismsUnlock = useMemo(() => {
    const heroUnlockLevelsArray = !!heroUnlockLevels
      ? Object.keys(heroUnlockLevels).map((key) => [
          String(key),
          heroUnlockLevels[key]
        ])
      : []

    return heroUnlockLevelsArray.find((hula) => hula[1] === userLevel + 1)
  }, [heroUnlockLevels, userLevel])

  const RewardImage = useMemo(() => {
    if (!getAssetUrl) return null

    if (userLevel > 15 || !nextPrismsUnlock) {
      return (
        <img
          className={PracticeXPProgressBarCardImage}
          src={getAssetUrl(`webapp/icons/base-card-with-letter.webp`)}
        />
      )
    }

    if (!!nextPrismsUnlock) {
      return (
        <div
          className={clsx(
            Sprinkles({ position: 'absolute' }),
            PracticeXPProgressBarHeroWrapper
          )}
        >
          <AngledBox
            cornerSize="8px"
            borderColor="purple9"
            backgroundColor="purple1"
            borderSize="1px"
          >
            <div
              className={Sprinkles({
                display: 'flex',
                width: 'full',
                height: 'full'
              })}
            >
              <img
                src={getAssetUrl(
                  `webapp/heroes/thumbnails/${
                    heroSkinFromDeckClass(nextPrismsUnlock[0] as DeckClass).base.artID
                  }.webp`
                )}
                className={Sprinkles({
                  width: 'full',
                  height: 'full'
                })}
              />
            </div>
          </AngledBox>
        </div>
      )
    }
    return null
  }, [getAssetUrl, nextPrismsUnlock, userLevel])

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'grid',
          position: 'relative',
          width: 'full',
          alignItems: 'center'
        }),
        PracticeXPProgressBarStyle
      )}
    >
      <div className={Sprinkles({ position: 'relative', width: 'full' })}>
        {!authedAccount ? (
          <Skeleton
            width="100%"
            height="100%"
            borderRadius="4px"
            baseColor={THEME_COLORS.purple3}
            highlightColor={THEME_COLORS.purple4}
          />
        ) : (
          <ExperienceBar
            level={userLevel}
            experience={authedAccount.experience}
            levelUpXP={authedAccount.levelUpXP}
            type={ExperienceBarType.PlayBox}
            showXPText={false}
          />
        )}
        <div className={Sprinkles({ position: 'relative', width: 'full' })}>
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                border: '1px solid',
                borderColor: 'purple7',
                backgroundColor: 'purple2'
              }),
              SharedProgressBarBorder
            )}
          />
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                top: 0,
                width: 'full',
                zIndex: 2
              }),
              SharedProgressBarGradient
            )}
          />
        </div>
      </div>
      <div
        className={clsx(
          Sprinkles({ position: 'relative' }),
          SharedProgressBarRewardWrapper
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              border: '1px solid',
              borderColor: 'purple7',
              backgroundColor: 'purple2'
            }),
            SharedProgressBarBorder
          )}
        />
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              top: 0,
              width: 'full',
              zIndex: 2
            }),
            'isRight',
            SharedProgressBarGradient
          )}
        />
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              width: 'full',
              height: 'full',
              position: 'absolute',
              justifyContent: 'center',
              alignItems: 'center'
            }),
            SharedProgressBarRewardInner
          )}
        >
          {!!getAssetUrl && (
            <img
              className={clsx(
                Sprinkles({ position: 'absolute' }),
                SharedProgressBarRewardGlow
              )}
              src={getAssetUrl(`webapp/icons/rewardglow.webp`)}
            />
          )}
          {userLevel >= 0 && (
            <div
              className={clsx(
                Sprinkles({
                  fontWeight: '700',
                  fontSize: '12px',
                  color: 'white',
                  position: 'absolute'
                }),
                SharedProgressBarRewardText
              )}
            >
              {t('play.level', { level: userLevel + 1 })}
            </div>
          )}
          {RewardImage}
          <div
            className={clsx(
              Sprinkles({
                fontWeight: '700',
                fontSize: { base: '10px', tabletWide: '12px' },
                color: 'purple9',
                position: 'absolute'
              }),
              SharedProgressBarRewardText,
              'isBottom'
            )}
          >
            {!!nextPrismsUnlock ? `+1 ${t('play.hero')}` : `+ 1 ${t('play.CARD')}`}
          </div>
        </div>
      </div>
    </div>
  )
})

PracticeXPProgressBar.displayName = 'PracticeXPProgressBar'
