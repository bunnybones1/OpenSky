import { DECK_CLASS_MAPPINGS, decode } from '@opensky/deck-string-codec'
import { DeckClass, GameMode } from '@opensky/proto'
import {
  DECKCLASS_ABILITIES,
  SKYWEAVER_JWT_KEY,
  UserStorageKeys
} from '@opensky/shared/constants'
import { getOrCreateSubkey } from '@opensky/shared/subkey'
import { BaseCard, CardLibrary, isPrism } from '@skyweaver/state-metadata'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { v4 } from 'uuid'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'
import env from '~/env'
import { APIClient, MatchMakerClient } from '~/shared/clients'
import { GameType } from '~/shared/constants/ranks'
import { getStoredMatchInfoKey } from '~/shared/constants/react-query-keys'
import { trackRequestGame } from '~/shared/helpers/analytics-old'
import { mergeLSItem } from '~/shared/helpers/local-storage'
import { captureError } from '~/shared/helpers/sentry'
import { mergeSSItem } from '~/shared/helpers/session-storage'
import { getDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import {
  playState,
  resetMatchMakerState,
  updatePlayState
} from '~/shared/state/play-state'
import {
  ActiveGameModes,
  GameModeGameType,
  StoredGameInfo
} from '~/shared/types/play'

import { generateCaptchaToken } from './helpers/generate-captcha-token'
import { useGetDeckStringForQueue } from './hooks/useGetDeckStringForQueue'

const getDeckInfoForMatchMaker = (deckString: string | null) => {
  const decodedDeck = decode(CardLibrary, deckString!)

  // decode error
  if (!Array.isArray(decodedDeck)) {
    throw Error(decodedDeck)
  }

  const [, deckClass, deck] = decodedDeck

  const prismList = DECK_CLASS_MAPPINGS[deckClass]
    .map((dc: DeckClass) => dc.toLowerCase())
    .filter(isPrism)

  if (!prismList || prismList.length !== DECK_CLASS_MAPPINGS[deckClass].length) {
    throw new Error(`Invalid prisms ${deckClass} returned from decode`)
  }

  const deckList = deck.filter((c) => CardLibrary.has(c as BaseCard)) as BaseCard[]
  if (deckList.length !== deck.length) {
    throw new Error(`Invalid deck ${deck} returned from decode.`)
  }

  return {
    cards: deckList,
    heroAbility: DECKCLASS_ABILITIES[deckClass],
    prisms: prismList
  }
}

const WEBAPP_PLAYER_SESSION_ID_KEY = 'webappPlayerSessionID'

const getPlayerSessionID = () => {
  if (window.sessStorage?.sessionId) {
    return window.sessStorage.sessionId
  }

  const cachedSessionID = window.sessionStorage.getItem(WEBAPP_PLAYER_SESSION_ID_KEY)

  if (cachedSessionID) {
    return cachedSessionID
  }

  const generatedSessionID = v4()
  window.sessionStorage.setItem(WEBAPP_PLAYER_SESSION_ID_KEY, generatedSessionID)

  return generatedSessionID
}

export interface JoinQueueParams {
  mode: ActiveGameModes
  challengeCode?: string
  captchaRequired?: boolean
}

export const useJoinQueue = () => {
  const { getDeckStringForQueue } = useGetDeckStringForQueue()
  const { data: authedAccount } = useAuthedAccount()
  const queryClient = useQueryClient()

  const joinQueue = useCallback(
    async ({ mode, challengeCode, captchaRequired }: JoinQueueParams) => {
      if (mode === GameMode.TUTORIAL) {
        getOrCreateSubkey()
        window.location.href = `${env.GAME_URL}?mode=TUTORIAL&tutorialLevel=1`
        return
      }

      if (!authedAccount) return

      resetMatchMakerState()
      updatePlayState('matchMakerStatus', MatchMakerStatus.JOINING_QUEUE)

      if (
        !challengeCode &&
        (mode === GameMode.CHALLENGE_CONSTRUCTED ||
          mode === GameMode.CHALLENGE_DISCOVERY)
      ) {
        return
      }
      const deckString = getDeckStringForQueue(mode)

      if (!deckString) return

      let verifyToken = undefined

      if (captchaRequired) {
        verifyToken = await generateCaptchaToken()
      }

      if (!verifyToken && env.CAPTCHA2_SITE_KEY.length > 0) return

      const { deckClass } = getDecodedDeckString(deckString)

      if (!deckClass) return

      const gameType = GameModeGameType[mode]

      try {
        trackRequestGame(mode, {
          deckType: gameType === GameType.DISCOVERY ? 'discovery' : 'constructed',
          prism: deckClass
        })
      } catch (err) {
        // if analytics fail to load log and carry on
        captureError(err, 'Analytics Failed To Send Request Game Event')
      }

      const userStorageData: StoredGameInfo = {
        gameMode: mode,
        gameType,
        lastPlayedDeckId:
          gameType === GameType.CONSTRUCTED
            ? mode === GameMode.CONQUEST_CONSTRUCTED
              ? playState.selectedConquestDeck
              : playState.selectedDeck
            : undefined,
        lastPlayedPrismClass:
          gameType === GameType.DISCOVERY ? playState.selectedHero : undefined,
        challengeCode
      }

      mergeSSItem(userStorageData)
      mergeLSItem(userStorageData)

      queryClient.setQueryData<StoredGameInfo>(
        getStoredMatchInfoKey(authedAccount.address),
        userStorageData
      )

      APIClient.opensky.userStorageSave({
        key: UserStorageKeys.GAME_INFO,
        object: userStorageData
      })

      const subkeyCert = await MatchMakerClient.generateSubkeyCertification().catch(
        (e) => {
          captureError(e, 'Sequence Error: Unable to generate or sign subkey')
          console.error(e)
        }
      )

      if (!subkeyCert) {
        updatePlayState('matchMakerStatus', MatchMakerStatus.SEARCH_ERRORED)
        return
      }

      MatchMakerClient.findMatch({
        type: 'find_match',
        authToken: window.localStorage.getItem(SKYWEAVER_JWT_KEY) || '',
        privateSeed: {
          ...getDeckInfoForMatchMaker(deckString),
          player: subkeyCert.player,
          subkey: subkeyCert.subkey,
          signature: subkeyCert.signature,
          randomSeed: Array.from({ length: 16 }, () =>
            Math.floor(Math.random() * 256)
          ),
          cardRarities: new Map()
        },
        sessionID: challengeCode || '',
        mode,
        versionHash: env.GITCOMMIT,
        playerSessionID: getPlayerSessionID(),
        verifyToken: verifyToken
      })
    },
    [authedAccount, getDeckStringForQueue, queryClient]
  )
  return { joinQueue }
}
