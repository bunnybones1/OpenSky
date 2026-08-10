import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { PlayerRank } from '~/lib/proto'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { RankTypes, TableRow } from '../ProgressTable'
import {
  PointsRequiredText,
  ProgressRowPointsRequired,
  ProgressRowRankIcon,
  ProgressRowStyle
} from './ProgressRow.css'

interface Props {
  info: TableRow
  rank: RankTypes
  isSmallScreen: boolean
}

const CenteredRowItem = Sprinkles({
  width: 'full',
  height: 'full',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
})

export const ProgressRow = memo(({ info, rank }: Props) => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'grid',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid',
          borderColor: 'purple5',
          width: 'full'
        }),
        ProgressRowStyle
      )}
    >
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(
              `webapp/icons/${rank.toLowerCase().replace('_', '-')}.webp`
            )}
            className={clsx(Sprinkles({ paddingX: '12px' }), ProgressRowRankIcon)}
          />
        )}
        <Text color="purple9" fontWeight="700" fontSize="12px">
          {t(`ranks.${rank}`)}
        </Text>
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          position: 'relative'
        })}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'auto',
              height: 'auto',
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'purple1',
              paddingRight: '4px',
              paddingLeft: '8px'
            }),
            ProgressRowPointsRequired
          )}
        >
          {!!info.pointsRequired ? (
            <>
              <Text className={PointsRequiredText} color="purple9" fontSize="12px">
                {rank === PlayerRank.GRANDWEAVER
                  ? `Top ${info.pointsRequired} Masters`
                  : `${info.pointsRequired} ${
                      rank === 'WANDERER-STAGE_I' ? 'XP' : 'RP'
                    }`}
              </Text>
              <Icon type="caret-down" color="warm7" height="16px" marginLeft="4px" />
            </>
          ) : null}
        </div>
      </div>
      <div className={CenteredRowItem}>
        {!!info.softReset && (
          <Text color="warm8" fontSize="12px">
            {info.softReset} {t('ranks.RP')}
          </Text>
        )}
      </div>
      <div className={CenteredRowItem}>
        {!!info.hardReset && (
          <Text color="warm9" fontSize="12px">
            {info.hardReset} {t('ranks.RP')}
          </Text>
        )}
      </div>
      <div className={CenteredRowItem}>
        {!!info.reward && (
          <Text color="forest4" fontSize="12px">
            +{info.reward} {t('profile.XP')}
          </Text>
        )}
      </div>
    </div>
  )
})

ProgressRow.displayName = 'ProgressRow'
