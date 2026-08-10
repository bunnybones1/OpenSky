import crowdIn, { ProjectRole } from '@crowdin/crowdin-api-client'
import { languageFileIDs } from '@opensky/language-manager'
import {
  getLocalStorageParam,
  setLocalStorageParam
} from '@opensky/shared/utils/localStorage'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'

import { fakeAttachID, fakeID } from './constants'
import env from './env'

export async function finishSignIn(oauthCode: string) {
  const { access_token, refresh_token } = await fetch(
    'https://pr.skyweaver.net/crowdin/oauth/token',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        code: oauthCode
      })
    }
  ).then(r => r.json())
  if (!access_token || !refresh_token) {
    throw new Error('Invalid response from API')
  }
  setLocalStorageParam(LOCAL_STORAGE_TOKEN, access_token)
  setLocalStorageParam(LOCAL_STORAGE_REFRESH_TOKEN, refresh_token)
  window.location.href =
    window.location.href.split('?')[0] + '?test=translationPreview'
}

const LOCAL_STORAGE_TOKEN = 'crowdinPersonalAccessToken'
const LOCAL_STORAGE_REFRESH_TOKEN = 'crowdinRefreshToken'
const SW_PROJECT_ID = 581637

export async function tryRefreshToken() {
  const refreshToken = getLocalStorageParam(LOCAL_STORAGE_REFRESH_TOKEN)
  if (!refreshToken) {
    throw new Error('no refresh token')
  }
  const { access_token, refresh_token } = await fetch(
    `https://pr.skyweaver.net/crowdin/oauth/token`,
    {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: refreshToken
      })
    }
  ).then(r => r.json())
  if (!access_token) {
    throw new Error('Failed to get access token from refresh')
  }
  setLocalStorageParam(LOCAL_STORAGE_TOKEN, access_token)
  setLocalStorageParam(LOCAL_STORAGE_REFRESH_TOKEN, refresh_token)
}

const CLIENT_ID = 'xgqXc7MrNaVrNrgRIxhg'

export function loadCrowdin() {
  const ci = new crowdIn({
    token: getLocalStorageParam(LOCAL_STORAGE_TOKEN) ?? ''
  })
  return ci
}

const oauthScopes = [
  'project.translation',
  'project.source',
  'project.settings'
]

const redirectUri =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    : `${env.WEBAPP_URL}/latest/game/`

export const loginUrlBuilder = new URL(
  'https://accounts.crowdin.com/oauth/authorize'
)
loginUrlBuilder.searchParams.append('client_id', CLIENT_ID)
loginUrlBuilder.searchParams.append('redirect_uri', redirectUri)
loginUrlBuilder.searchParams.append('response_type', 'code')
loginUrlBuilder.searchParams.append('state', 'd131dd02c5e6eec4')
export const loginUrl =
  loginUrlBuilder.toString() + `&scope=${oauthScopes.join('+')}`

export function logout() {
  window.localStorage.removeItem(LOCAL_STORAGE_TOKEN)
  window.localStorage.removeItem(LOCAL_STORAGE_REFRESH_TOKEN)
}

export function hasStoredSession() {
  return !!getLocalStorageParam(LOCAL_STORAGE_TOKEN)
}

interface User {
  id: number
  username: string
  fullName: string
  avatarUrl: string
}

export interface StringTranslation {
  id: number
  text: string
  pluralCategoryName: string
  user: User
  rating: number
  createdAt: string
  approvals: Array<{ id: number; userID: number }>
}

export interface MaybeTranslatedString {
  stringId: number
  english: string
  translations: Array<StringTranslation>
}

export async function getStringsForCard(
  card: BaseCard,
  lang: string
): Promise<{
  name: MaybeTranslatedString
  description: MaybeTranslatedString
  flavorText: MaybeTranslatedString
}> {
  const crowdin = loadCrowdin()
  const { data: stringsForCard } =
    await crowdin.sourceStringsApi.listProjectStrings(SW_PROJECT_ID, {
      fileId: languageFileIDs['cards.json'],
      filter: `${card}.`
    })
  const nameStringId = stringsForCard.find(({ data }) =>
    data.identifier.endsWith('.name')
  )!.data.id
  const descStringId = stringsForCard.find(({ data }) =>
    data.identifier.endsWith('.description')
  )!.data.id
  const flavorTextStringId = stringsForCard.find(({ data }) =>
    data.identifier.endsWith('.flavorText')
  )!.data.id

  return {
    name: await getMaybeTranslatedString(nameStringId, lang),
    description: await getMaybeTranslatedString(descStringId, lang),
    flavorText: await getMaybeTranslatedString(flavorTextStringId, lang)
  }
}

async function getMaybeTranslatedString(
  stringId: number,
  languageId: string
): Promise<MaybeTranslatedString> {
  const crowdin = loadCrowdin()

  const translatedP = crowdin.stringTranslationsApi
    .listStringTranslations(SW_PROJECT_ID, stringId, languageId)
    .then(translated =>
      Promise.all(
        translated.data.map(async t => ({
          ...t.data,
          approvals: await crowdin.stringTranslationsApi
            .listTranslationApprovals(SW_PROJECT_ID, {
              languageId,
              stringId,
              translationId: t.data.id
            })
            .then(d =>
              d.data.map(x => ({ id: x.data.id, userID: x.data.user.id }))
            )
        }))
      )
    )

  const originalP = crowdin.sourceStringsApi.getString(SW_PROJECT_ID, stringId)
  const [translations, original] = await Promise.all([translatedP, originalP])
  translations.sort(
    (a, b) => +b.approvals.length - +a.approvals.length || b.rating - a.rating
  )
  return {
    stringId,
    english: original.data.text as string,
    translations
  }
}

export async function getUserPermissions(
  username: string
): Promise<ProjectRole[]> {
  const crowdin = loadCrowdin()
  const projectMember = await crowdin.usersApi
    .listProjectMembers(SW_PROJECT_ID, {
      search: username
    })
    .then(x => x.data.find(p => p.data.username === username))
  console.log(projectMember)
  return (
    await crowdin.usersApi.getProjectMemberPermissions(
      SW_PROJECT_ID,
      projectMember?.data.id ?? 0
    )
  ).data.roles
}

export async function getTargetLanguages(): Promise<
  Array<{ name: string; id: string }>
> {
  const crowdin = loadCrowdin()
  const {
    data: { targetLanguages }
  } = await crowdin.projectsGroupsApi.getProject(SW_PROJECT_ID)
  return targetLanguages
}

async function getSome<T>(
  getter: (props: { limit: number; offset: number }) => Promise<T[]>,
  maxPerRequest: number,
  total = Infinity
): Promise<T[]> {
  const them: T[] = []
  while (them.length < total) {
    const newOnes = await getter({ limit: maxPerRequest, offset: them.length })
    them.push(...newOnes)

    if (newOnes.length < maxPerRequest) {
      break
    }
  }
  return them
}

export type TranslationStatus =
  | {
      translated: false
    }
  | {
      translated: true
      approved: false
    }
  | {
      translated: true
      approved: true
    }

export async function getCardStatuses(
  targetLang: string
): Promise<Map<BaseCard, TranslationStatus>> {
  const crowdin = loadCrowdin()

  const allStrings = await getSome(
    ({ limit, offset }) =>
      crowdin.sourceStringsApi
        .listProjectStrings(SW_PROJECT_ID, {
          fileId: languageFileIDs['cards.json'],
          limit,
          offset
        })
        .then(m => m.data),
    500
  )

  const allCards = [
    ...[...CardLibrary.entries()]
      .filter(
        ([id, c]) => c.prism !== 'tut' && id !== fakeID && id !== fakeAttachID
      )
      .map(x => x[0])
  ] as const

  const cardByString = new Map(
    allStrings.map(c => [
      c.data.id,
      allCards.find(card => c.data.identifier.startsWith(`${card}.`))
    ])
  )

  const cardStatuses = new Map<BaseCard, TranslationStatus>(
    allCards.map(
      c =>
        [
          c,
          {
            translated: false
          } as const
        ] as const
    )
  )

  const [unapprovedTranslations, approvedTranslations] = await Promise.all([
    getSome(
      ({ limit, offset }) =>
        crowdin.stringTranslationsApi
          .listLanguageTranslations(SW_PROJECT_ID, targetLang, {
            croql: `(count of approvals = 0)`,
            limit,
            offset
          })
          .then(m => m.data),
      500
    ),
    getSome(
      ({ limit, offset }) =>
        crowdin.stringTranslationsApi
          .listLanguageTranslations(SW_PROJECT_ID, targetLang, {
            croql: `(count of approvals > 0)`,
            limit,
            offset
          })
          .then(m => m.data),
      500
    )
  ])

  for (const t of approvedTranslations) {
    approvedTranslations
    cardStatuses.set(cardByString.get(t.data.stringId)!, {
      translated: true,
      approved: true
    })
  }
  // if a card has 1+ unapproved
  for (const t of unapprovedTranslations) {
    cardStatuses.set(cardByString.get(t.data.stringId)!, {
      translated: true,
      approved: false
    })
  }

  cardStatuses.delete(undefined as unknown as BaseCard)
  return cardStatuses
}

export async function getUserInfo() {
  const user = await loadCrowdin().usersApi.getAuthenticatedUser()
  return user.data
}

export async function submitNewTranslation(
  stringId: number,
  languageId: string,
  text: string
) {
  const crowdin = loadCrowdin()
  await crowdin.stringTranslationsApi.addTranslation(SW_PROJECT_ID, {
    languageId,
    stringId,
    text
  })
}

export async function voteOnTranslation(
  translationId: number,
  mark: 'up' | 'down'
) {
  const crowdin = loadCrowdin()
  await crowdin.stringTranslationsApi.addVote(SW_PROJECT_ID, {
    translationId,
    mark
  })
}

export async function unapproveTranslation(approvalId: number) {
  const crowdin = loadCrowdin()
  await crowdin.stringTranslationsApi.removeApproval(SW_PROJECT_ID, approvalId)
}

export async function approveTranslation(translationId: number) {
  const crowdin = loadCrowdin()
  await crowdin.stringTranslationsApi.addApproval(SW_PROJECT_ID, {
    translationId
  })
}
