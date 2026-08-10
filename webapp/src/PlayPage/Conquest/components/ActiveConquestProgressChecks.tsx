import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestStatus } from '~/shared/queries/play/useConquestStatus'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  ActiveConquestProgressChecksGradient,
  ActiveConquestProgressChecksGrid,
  ActiveConquestProgressChecksLine,
  ActiveConquestProgressChecksStyle
} from './ActiveConquestProgressChecks.css'

export const ActiveConquestProgressChecks = memo(() => {
  const { data: conquestStatus } = useConquestStatus()
  const { getAssetUrl } = useGetAssetContext()

  const progressionBarArray = useMemo(() => {
    return [
      !!conquestStatus && conquestStatus.wins >= 1,
      !!conquestStatus && conquestStatus.wins >= 2,
      !!conquestStatus && conquestStatus.wins >= 3
    ]
  }, [conquestStatus])

  const firstFalseIndex = progressionBarArray.findIndex(
    (checkbox) => checkbox === false
  )

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          display: 'flex'
        }),
        ActiveConquestProgressChecksStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'absolute',
            left: 0,
            zIndex: 2
          }),
          ActiveConquestProgressChecksLine
        )}
      />
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            width: 'full',
            left: 0,
            zIndex: 3
          }),
          ActiveConquestProgressChecksGradient
        )}
      />
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            width: 'full',
            left: 0,
            zIndex: 3
          }),
          ActiveConquestProgressChecksGradient
        )}
      />
      {!!getAssetUrl && (
        <div
          className={clsx(
            Sprinkles({
              display: 'grid',
              width: 'full',
              height: 'full',
              position: 'absolute',
              zIndex: 3,
              justifyContent: 'center',
              alignItems: 'center'
            }),
            ActiveConquestProgressChecksGrid
          )}
        >
          {progressionBarArray.map((isActive, i) => (
            <img
              key={`${i}-checkbox`}
              className={Sprinkles({
                width: 'full'
              })}
              src={
                i === firstFalseIndex
                  ? getAssetUrl('webapp/icons/match-active.webp')
                  : isActive
                  ? getAssetUrl('webapp/icons/wingedcheckboxactive.webp')
                  : getAssetUrl('webapp/icons/wingedcheckbox.webp')
              }
            />
          ))}
        </div>
      )}
    </div>
  )
})

ActiveConquestProgressChecks.displayName = 'ActiveConquestProgressChecks'
