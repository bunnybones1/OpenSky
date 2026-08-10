import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { go } from 'redux-first-history'

import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BackButtonStyle } from './BackButton.css'

export const BackButton = memo(() => {
  const dispatch = useDispatch()
  const onBackClick = useCallback(() => {
    dispatch(go(-1))
  }, [dispatch])

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          top: 0,
          zIndex: 2
        }),
        BackButtonStyle
      )}
    >
      <FancyBackButton onClick={onBackClick} />
    </div>
  )
})

BackButton.displayName = 'BackButton'
