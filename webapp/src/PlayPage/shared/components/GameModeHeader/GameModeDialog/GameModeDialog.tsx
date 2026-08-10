import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameModeDialogPageKeys } from '../shared/types'
import { GameModeDialogButton } from './components/GameModeDialogButton'
import { GameModeDialogStyle } from './GameModeDialog.css'

interface GameModeDialogProps {
  activePage: GameModeDialogPageKeys
}

export const GameModeDialog = memo(({ activePage }: GameModeDialogProps) => {
  const { data: authedAccount } = useAuthedAccount()

  // Order game modes based on level and progress
  const modes = useMemo<GameModeDialogPageKeys[]>(() => {
    if (!!authedAccount?.level && authedAccount.level >= 8) {
      return ['RANKED', 'CONQUEST', 'PRACTICE']
    } else {
      return ['PRACTICE', 'RANKED', 'CONQUEST']
    }
  }, [authedAccount?.level])

  const { data: tokenBalances } = useConquestAndUSDCBalances(true)

  const totalConquestTicketBalance = tokenBalances?.conquestTicketBalance.total

  if (totalConquestTicketBalance === 0) {
    modes.splice(modes.indexOf('CONQUEST'), 1)
  }

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid',
          borderColor: 'purple7'
        }),
        GameModeDialogStyle
      )}
    >
      {modes.map((page) => (
        <GameModeDialogButton key={page} page={page} isActive={page === activePage} />
      ))}
    </div>
  )
})

GameModeDialog.displayName = 'GameModeDialog'
