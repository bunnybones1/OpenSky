import { GameMode, GameModesStatus } from '@opensky/proto'
import { useCallback, useEffect, useState } from 'react'

import { APIClient } from '~/shared/clients'

type QueuesEnabled = Omit<{ [K in GameMode]: boolean }, GameMode.UNKNOWN>

const defaultQueuesEnabled: QueuesEnabled = {
  [GameMode.CHALLENGE_CONSTRUCTED]: true,
  [GameMode.CHALLENGE_DISCOVERY]: true,
  [GameMode.CONQUEST_CONSTRUCTED]: true,
  [GameMode.CONQUEST_DISCOVERY]: true,
  [GameMode.PRACTICE_BOT]: true,
  [GameMode.PRACTICE_PVP]: true,
  [GameMode.RANKED_CONSTRUCTED]: true,
  [GameMode.RANKED_DISCOVERY]: true,
  [GameMode.TUTORIAL]: true,
  [GameMode.WARM_UP]: true
}

const gameModeToStatus: Omit<
  { [K in GameMode]: keyof GameModesStatus },
  GameMode.UNKNOWN
> = {
  [GameMode.CHALLENGE_CONSTRUCTED]: 'challengeConstructed',
  [GameMode.CHALLENGE_DISCOVERY]: 'challengeDiscovery',
  [GameMode.CONQUEST_CONSTRUCTED]: 'conquestConstructed',
  [GameMode.CONQUEST_DISCOVERY]: 'conquestDiscovery',
  [GameMode.PRACTICE_BOT]: 'practiceBot',
  [GameMode.PRACTICE_PVP]: 'practicePVP',
  [GameMode.RANKED_CONSTRUCTED]: 'rankedConstructed',
  [GameMode.RANKED_DISCOVERY]: 'rankedDiscovery',
  [GameMode.TUTORIAL]: 'tutorial',
  [GameMode.WARM_UP]: 'warmUp'
}

const useQueuesEnabled = () => {
  const [queues, setQueues] = useState<QueuesEnabled>(defaultQueuesEnabled)
  const [loading, setLoading] = useState(false)

  const fetchQueuesEnabled = useCallback(() => {
    setLoading(true)
    setQueues(defaultQueuesEnabled)
    // TODO this sucks. API should really give us GameMode -> bool mapping, not an object with similarly named keys.
    APIClient.opensky
      .getGameModesStatus()
      .then(({ status }) =>
        setQueues(
          Object.entries(gameModeToStatus).reduce(
            (obj, [mode, statusKey]) => {
              return { ...obj, [mode]: status[statusKey] }
            },
            { ...defaultQueuesEnabled }
          )
        )
      )
      .catch((err: Error) => console.error(err.message))
      .finally(() => setLoading(false))
  }, [setQueues, setLoading])

  const setQueueEnabled = (queue: GameMode, enable: boolean) => {
    APIClient.opensky
      .gMGameModeSet({ gameMode: queue, enable })
      .then(() => {
        fetchQueuesEnabled()
      })
      .catch((err: Error) => console.error(err.message))
  }

  useEffect(() => {
    fetchQueuesEnabled()
  }, [fetchQueuesEnabled])

  return {
    queues,
    loading,
    setQueueEnabled
  }
}
export default useQueuesEnabled
