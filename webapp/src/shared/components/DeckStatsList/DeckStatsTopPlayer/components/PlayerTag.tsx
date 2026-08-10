import { FlagCodes } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback } from 'react'

import { FlagIcon } from '~/shared/components/FlagIcon'
import { Icon } from '~/shared/components/Icon/Icon'
import { RowArt } from '~/shared/components/RowArt/RowArt'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PlayerTagInfo, PlayerTagStyle } from './PlayerTag.css'

interface PlayerTagProps {
  onClick?: (id: string) => void
  player?: {
    id: string
    name: string
    art: string
    region?: FlagCodes
  }
}

export const PlayerTag = memo(({ onClick, player }: PlayerTagProps) => {
  const _onClick = useCallback(() => {
    if (!!onClick && !!player?.id) {
      onClick(player.id)
    }
  }, [player, onClick])
  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'relative',
          backgroundColor: 'purple4',
          display: 'flex',
          alignItems: 'center',
          width: 'full',
          justifyContent: !!player ? 'flex-end' : 'flex-start'
        }),
        PlayerTagStyle,
        { isClickable: !!onClick && !!player }
      )}
      onClick={!!player ? _onClick : undefined}
    >
      {!!player ? (
        <>
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                position: 'absolute',
                height: 'full',
                top: 0,
                left: 0,
                paddingLeft: '8px'
              }),
              PlayerTagInfo
            )}
          >
            <Text color="white" fontSize="14px" marginRight="4px">
              {player.name}
            </Text>
            {!!player.region && <FlagIcon code={player.region} height="14px" />}
          </div>
          <RowArt url={player.art} useHeight={true} />
        </>
      ) : (
        <Icon type="spinner" height="20px" marginLeft="12px" color="purple9" />
      )}
    </div>
  )
})

PlayerTag.displayName = 'PlayerTag'
