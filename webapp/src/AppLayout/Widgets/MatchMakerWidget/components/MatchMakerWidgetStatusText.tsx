import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { playState } from '~/shared/state/play-state'

export const MatchMakerWidgetStatusText = memo(() => {
  const { matchMakerStatus } = useSnapshot(playState)
  const { t } = useTranslation()

  if (!matchMakerStatus) return null

  return (
    <Text color="white" fontSize="16px" marginTop="8px">
      {t(`playPage.matchMaker.statusTexts.${matchMakerStatus}`)}
    </Text>
  )
})

MatchMakerWidgetStatusText.displayName = 'MatchMakerWidgetStatusText'
