import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Grid } from '~/shared/components/Base/Grid'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BaseTextLineHeight,
  Header,
  ImageHeight,
  LeaderboardRewardsDialogStyle,
  Wrapper
} from './LeaderboardRewardsDialog.css'

const SubHeader = Sprinkles({
  display: 'flex',
  alignItems: 'center',
  fontFamily: 'condensed',
  fontWeight: '500',
  fontSize: '18px',
  marginY: '12px',
  color: 'white'
})

const BaseText = Sprinkles({
  fontFamily: 'normal',
  fontWeight: '500',
  fontSize: '14px',
  color: 'purple9'
})

export const LeaderboardRewardsDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          flexWrap: 'nowrap'
        }),
        LeaderboardRewardsDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            borderBottom: '1px solid',
            borderColor: 'purple7',
            backgroundColor: 'purple1'
          }),
          Header
        )}
      >
        <TitleDetail title={t('ranks.leaderboardRewardsModalHeader')} />
      </div>
      <div
        className={clsx(
          Sprinkles({
            flex: 1,
            display: 'flex',
            width: 'full',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            position: 'relative'
          }),
          Wrapper
        )}
        style={{
          backgroundImage: !!getAssetUrl
            ? `linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), linear-gradient(to top, rgba(12, 6, 30, 0.4), rgba(12, 6, 30, 0.9)), url(${getAssetUrl(
                'webapp/backgrounds/bg-dark-03.webp'
              )})`
            : undefined
        }}
      >
        <Grid gridTemplateColumns={['1fr 1fr 1fr']} padding={3} gridGap={'20px'}>
          <div>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/misc/leaderboard-1.webp')}
                style={{ width: '100%', height: '110px' }}
              />
            )}
            <div className={SubHeader}>{t('leaderboardRewardsModal.1.header')}</div>
            <div
              className={clsx(BaseText, BaseTextLineHeight)}
              dangerouslySetInnerHTML={{
                __html: t('leaderboardRewardsModal.1.desc')
              }}
            />
          </div>

          <div>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/misc/leaderboard-2.webp')}
                className={clsx(Sprinkles({ width: 'full' }), ImageHeight)}
              />
            )}

            <div className={SubHeader}>{t('leaderboardRewardsModal.2.header')}</div>
            <div className={clsx(BaseText, BaseTextLineHeight)}>
              {t('leaderboardRewardsModal.2.desc')}
            </div>
          </div>

          <div>
            <div
              className={clsx(
                Sprinkles({
                  backgroundColor: 'purple3',
                  width: 'full',
                  paddingTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }),
                ImageHeight
              )}
            >
              {!!getAssetUrl && <img src={getAssetUrl('webapp/icons/master.webp')} />}
            </div>
            <div>
              <div className={SubHeader}>{t('leaderboardRewardsModal.3.header')}</div>
              <div className={clsx(BaseText, BaseTextLineHeight)}>
                {t('leaderboardRewardsModal.3.desc')}
              </div>
            </div>
          </div>
        </Grid>
      </div>
    </div>
  )
})

LeaderboardRewardsDialog.displayName = 'LeaderboardRewardsDialog'
