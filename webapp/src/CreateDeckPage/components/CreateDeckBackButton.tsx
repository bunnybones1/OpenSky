import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { goBack } from 'redux-first-history'

import { Button } from '~/shared/components/Button'
import { useDispatch } from '~/shared/redux/index'

export const CreateDeckBackButton = memo(() => {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const onClick = useCallback(() => {
    dispatch(goBack())
  }, [dispatch])

  return (
    <Button
      frameType="default"
      colorType="secondary"
      text={t('general.Back')}
      clickSound="BackReturnSwipe"
      hoverSound={null}
      leftAdornment={{ icon: 'arrow-back' }}
      onClick={onClick}
      height="36px"
    />
  )
})

CreateDeckBackButton.displayName = 'CreateDeckBackButton'
