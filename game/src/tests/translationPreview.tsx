import './translationPreview.css'
import './react-select-search-style.css'

import {
  i18n,
  i18nInit,
  SupportedLanguage,
  translate
} from '@opensky/language-manager'
import { getParsedCardDescription } from '@opensky/parse-card-description'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import {
  CSSProperties,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { createRoot } from 'react-dom/client'
import SelectSearch from 'react-select-search'

import { fakeAttachID, fakeID } from '~/constants'
import env from '~/env'
import { i18nextDummyCardBackend } from '~/helpers/i18nDummyCardBackend'
import renderer from '~/renderer'

import type {
  MaybeTranslatedString,
  StringTranslation,
  TranslationStatus
} from '../crowdin'
import * as swCrowdin from '../crowdin.js'
import { createCardCreator } from './cardCreator'

async function translationPreview() {
  await i18nInit({
    defaultNS: 'game',
    version: env.GITCOMMIT,
    lng: 'en',
    backends: [i18nextDummyCardBackend]
  })
  const cardCreator = await createCardCreator()
  const reactRoot = document.createElement('div')
  document.body.appendChild(reactRoot)
  createRoot(reactRoot).render(<App />)

  type User = Awaited<ReturnType<(typeof swCrowdin)['getUserInfo']>>
  function App() {
    const [user, setUser] = useState<User | null | 'loading'>('loading')
    const [logoutNonce, setLogoutNonce] = useState(0)
    useEffect(() => {
      ;(async () => {
        if (swCrowdin.hasStoredSession()) {
          try {
            setUser(await swCrowdin.getUserInfo())
          } catch (err) {
            try {
              await swCrowdin.tryRefreshToken()
              setUser(await swCrowdin.getUserInfo())
            } catch (err) {
              swCrowdin.logout()
            }
          }
        } else {
          setUser(null)
        }
      })()
    }, [logoutNonce])

    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      containerRef.current?.appendChild(renderer.domElement)
      renderer.domElement.style.maxWidth = '40vw'
    }, [])

    useEffect(() => {
      renderer.domElement.style.display =
        typeof user === 'object' ? 'block' : 'none'
    }, [user])

    return (
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        {user === 'loading' ? (
          <></>
        ) : user ? (
          <Controls
            user={user}
            logOut={() => {
              swCrowdin.logout()
              setLogoutNonce(logoutNonce + 1)
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              width: '100vw',
              height: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              overflowX: 'hidden',
              fontSize: '48pt'
            }}
          >
            <Button
              onClick={() => (window.location.href = swCrowdin.loginUrl)}
              text={'Sign in to CrowdIn'}
            />
          </div>
        )}
      </div>
    )
  }

  function Controls({ user, logOut }: { user: User; logOut: () => void }) {
    const [targetLanguages, setTargetLanguages] = useState<
      Array<{ name: string; id: string }>
    >([])

    const [cardStatuses, setCardStatuses] = useState<
      Map<BaseCard, TranslationStatus>
    >(new Map())

    const [role, setRole] = useState<'suggester' | 'proofreader'>('suggester')
    const [reloadNonce, setReloadNonce] = useState(0)
    const [masterNonce, setMasterReloadNonce] = useState(0)

    const [targetLang, setTargetLang] = useState<SupportedLanguage>('fr')
    const [targetCard, setTargetCard] = useState<BaseCard>('1')
    const [cardName, setCardName] = useState<string>('')
    const [cardText, setCardText] = useState<string>('')
    const [cardFlavorText, setCardFlavorText] = useState<string>('')

    const [filter, setFilter] = useState<
      | 'untranslated'
      | 'translated_not_approved'
      | 'translated_approved'
      | 'all_cards'
    >('untranslated')

    const [nameTranslations, setNameTranslations] =
      useState<MaybeTranslatedString>({
        stringId: -1,
        english: '',
        translations: []
      })
    const [textTranslations, setTextTranslations] =
      useState<MaybeTranslatedString>({
        stringId: -1,
        english: '',
        translations: []
      })

    const [flavorTextTranslations, setFlavorTextTranslations] =
      useState<MaybeTranslatedString>({
        stringId: -1,
        english: '',
        translations: []
      })

    useEffect(() => {
      ;(async () => {
        const langs = await swCrowdin.getTargetLanguages()
        setTargetLanguages(langs)
        setTargetLang(langs[0].id as SupportedLanguage)
      })()
    }, [])

    useEffect(() => {
      setCardStatuses(new Map())
      swCrowdin.getCardStatuses(targetLang).then(setCardStatuses)
    }, [targetLang, masterNonce])

    useEffect(() => {
      setRole('suggester')
      swCrowdin.unapproveTranslation(1).catch(err => {
        const hasNoProofreadRole =
          typeof err === 'string' && err.includes('Forbidden')
        setRole(hasNoProofreadRole ? 'suggester' : 'proofreader')
      })
    }, [targetLang, masterNonce])

    useEffect(() => {
      ;(async () => {
        const c = CardLibrary.get(targetCard)!

        if (cardCreator.metadata.artSlug != c.artSlug) {
          Object.assign(cardCreator.metadata, {
            ...c,
            name: '',
            description: ''
          })
        }
        const attach = CardLibrary.get(c.attachment!)
        if (attach) {
          Object.assign(cardCreator.attachMetadata, attach)
          cardCreator.attachEnabled = true
        } else {
          cardCreator.attachEnabled = false
        }

        const trans = await swCrowdin.getStringsForCard(targetCard, targetLang)
        setNameTranslations(trans.name)
        setTextTranslations(trans.description)

        setFlavorTextTranslations(trans.flavorText)

        cardCreator.refresh()
      })()
    }, [targetCard, targetLang, reloadNonce, masterNonce])

    useEffect(() => {
      cardCreator.metadata.name = cardName
      cardCreator.refresh()
    }, [cardName])

    useEffect(() => {
      cardCreator.metadata.description = cardText
      cardCreator.refresh()
    }, [cardText])

    const translatedCards = useMemo(
      () => [...cardStatuses.values()].filter(c => c.translated),
      [cardStatuses]
    )

    const approvedCards = useMemo(
      () => [...cardStatuses.values()].filter(c => c.translated && c.approved),
      [cardStatuses]
    )

    const numNonTutCards = useMemo(
      () =>
        [...CardLibrary.entries()].filter(
          ([id, c]) => c.prism !== 'tut' && !id.includes(' ')
        ).length,
      []
    )

    return (
      <div
        style={{
          padding: '10px 50px',
          background: '#170D30',
          color: '#C5B4F5',
          fontSize: '16pt',
          overflowY: 'scroll',
          height: '100vh'
        }}
      >
        <h1
          style={{
            fontSize: '24pt'
          }}
        >
          OpenSky Translation Tool
        </h1>
        <div
          style={{
            backgroundColor: '#231445',
            border: '1px solid #40306B',
            fontSize: '0.7em',
            padding: '0.6em',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            Signed in to CrowdIn as{' '}
            <img
              src={user.avatarUrl}
              style={{
                maxWidth: '16px',
                maxHeight: '16px',
                borderRadius: '16px',
                padding: '2px',
                verticalAlign: 'middle'
              }}
            ></img>
            {user.username}
          </div>
          <Button text="Sign out" onClick={logOut} />
        </div>
        <Labelled label="Language">
          <select
            onChange={el => {
              setTargetLang(el.target.value as SupportedLanguage)
            }}
          >
            {targetLanguages.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </Labelled>

        {cardStatuses.size ? (
          <>
            <Labelled label="Card Translation Progress">
              <div
                style={{
                  fontSize: '1rem',
                  padding: '8px'
                }}
              >
                <a href={`https://crowdin.com/project/opensky/${targetLang}`}>
                  View in CrowdIn
                </a>
                <div>
                  {translatedCards.length}/{numNonTutCards} cards translated (
                  {((translatedCards.length / numNonTutCards) * 100).toFixed(2)}
                  %)
                </div>
                <div>
                  {approvedCards.length}/{numNonTutCards} cards in-game (
                  {((approvedCards.length / numNonTutCards) * 100).toFixed(2)}
                  %)
                </div>
                <Button
                  onClick={() => setMasterReloadNonce(n => n + 1)}
                  text="Refresh"
                />
              </div>
            </Labelled>
            <Labelled label="Card To Translate">
              <div
                onChange={e => {
                  setFilter(
                    (e.target as HTMLInputElement).value as typeof filter
                  )
                }}
              >
                <SelectyRadio
                  label="Untranslated"
                  value="untranslated"
                  parentValue={filter}
                />
                <SelectyRadio
                  label="Need Approval"
                  value="translated_not_approved"
                  parentValue={filter}
                />
                <SelectyRadio
                  label="Approved"
                  value="translated_approved"
                  parentValue={filter}
                />
                <SelectyRadio
                  label="All Cards"
                  value="all_cards"
                  parentValue={filter}
                />
              </div>
              <SelectSearch
                value={targetCard}
                search
                fuzzySearch
                onBlur={() => {}}
                onFocus={() => {}}
                onChange={(val: string) => {
                  setTargetCard(val as BaseCard)
                }}
                options={[...CardLibrary.entries()]
                  .filter(([id, c]) => {
                    const isValidCard =
                      c.prism !== 'tut' &&
                      !!id &&
                      id !== fakeID &&
                      id !== fakeAttachID
                    if (!isValidCard) {
                      return false
                    }
                    if (filter === 'all_cards') {
                      return true
                    } else if (filter === 'untranslated') {
                      const card = cardStatuses.get(id)
                      return !card?.translated
                    } else if (filter === 'translated_not_approved') {
                      const card = cardStatuses.get(id)
                      return card?.translated && !card.approved
                    } else if (filter === 'translated_approved') {
                      const card = cardStatuses.get(id)
                      return card?.translated && card.approved
                    } else {
                      return filter satisfies never
                    }
                  })
                  .sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
                  .map(([id]) => ({
                    name: `${id}: ${translate.card.name(id)}`,
                    value: id
                  }))}
              />
            </Labelled>

            <Translatable
              name="Name"
              strings={nameTranslations}
              preview={cardName}
              setPreview={setCardName}
              targetLang={targetLang}
              userID={user.id}
              userRole={role}
              afterCrowdinNetworkCall={() => setReloadNonce(n => n + 1)}
            />

            <Translatable
              name="Description"
              strings={textTranslations}
              preview={cardText}
              setPreview={setCardText}
              targetLang={targetLang}
              userID={user.id}
              userRole={role}
              afterCrowdinNetworkCall={() => setReloadNonce(n => n + 1)}
            />
            <Translatable
              name="Flavor Text"
              strings={flavorTextTranslations}
              preview={cardFlavorText}
              setPreview={setCardFlavorText}
              targetLang={targetLang}
              userID={user.id}
              userRole={role}
              afterCrowdinNetworkCall={() => setReloadNonce(n => n + 1)}
            />
          </>
        ) : (
          `Loading ${
            targetLanguages.find(l => l.id === targetLang)?.name ?? 'language'
          } ...`
        )}
      </div>
    )
  }

  function Translatable({
    name,
    strings,
    setPreview,
    preview,
    afterCrowdinNetworkCall,
    targetLang,
    userID,
    userRole
  }: {
    name: string
    strings: MaybeTranslatedString
    preview: string
    setPreview: (text: string) => void
    afterCrowdinNetworkCall: () => void
    targetLang: string
    userID: number
    userRole: 'suggester' | 'proofreader'
  }) {
    const [enteredVal, setEnteredVal] = useState<{
      text: string
      error: string | null
    }>({
      text: '',
      error: null
    })
    useEffect(() => {
      setPreview(enteredVal.text)
    }, [enteredVal])

    useEffect(() => {
      setPreview(strings.translations[0]?.text ?? '')
    }, [strings])

    const currentlyTypedTranslation = strings.translations.find(
      t => t.text.trim() === enteredVal.text.trim()
    )

    return (
      <div>
        <h2 style={{ fontSize: '18pt', margin: '16px 8px 0px 8px' }}>{name}</h2>
        <Labelled label="English">
          <code
            style={{
              display: 'inline-block',
              margin: '8px',
              padding: '4px',
              border: '1px solid #705bab',
              background: '#0c061e',
              resize: 'none'
            }}
          >
            {strings.english}
          </code>
        </Labelled>

        {strings.translations.map(t => {
          const myApproval = t.approvals.find(a => a.userID === userID)
          return (
            <Suggestion
              key={t.id}
              translation={t}
              active={preview === t.text}
              onView={() => {
                setPreview(t.text)
                if (!t.text) {
                  try {
                    getParsedCardDescription(
                      t.text,
                      t => translate.card.name(`${t}` as BaseCard),
                      i18n.t
                    )
                    setEnteredVal({ text: t.text, error: null })
                  } catch (err) {
                    setEnteredVal({ text: t.text, error: err.toString() })
                  }
                }
              }}
              unappproveButton={
                userRole === 'proofreader' && myApproval
                  ? () => {
                      swCrowdin
                        .unapproveTranslation(myApproval.id)
                        .then(afterCrowdinNetworkCall)
                    }
                  : undefined
              }
              approveButton={
                userRole === 'proofreader' && !myApproval
                  ? () => {
                      swCrowdin
                        .approveTranslation(t.id)
                        .then(afterCrowdinNetworkCall)
                    }
                  : undefined
              }
              voteButtons={
                userRole !== 'proofreader' && t.user.id !== userID
                  ? {
                      down() {
                        swCrowdin
                          .voteOnTranslation(t.id, 'down')
                          .then(afterCrowdinNetworkCall)
                      },
                      up() {
                        swCrowdin
                          .voteOnTranslation(t.id, 'up')
                          .then(afterCrowdinNetworkCall)
                      }
                    }
                  : undefined
              }
            />
          )
        })}
        <Labelled label="Suggest Translation">
          <input
            type="text"
            onChange={ev => {
              const text = ev.target.value
              try {
                getParsedCardDescription(
                  text,
                  t => translate.card.name(`${t}` as BaseCard),
                  i18n.t
                )
                setEnteredVal({ text, error: null })
              } catch (err) {
                setEnteredVal({ text, error: err.toString() })
              }
            }}
            value={enteredVal.text}
          />
          {enteredVal.error ? (
            <div
              style={{
                color: 'white'
              }}
            >
              {enteredVal.error}
            </div>
          ) : (
            <Button
              onClick={() => {
                const { text } = enteredVal
                setEnteredVal({ text: '', error: null })

                if (!currentlyTypedTranslation) {
                  swCrowdin
                    .submitNewTranslation(strings.stringId, targetLang, text)
                    .then(afterCrowdinNetworkCall)
                } else {
                  swCrowdin
                    .voteOnTranslation(currentlyTypedTranslation.id, 'up')
                    .then(afterCrowdinNetworkCall)
                }
              }}
              disabled={!!enteredVal.error}
              text={currentlyTypedTranslation ? 'Vote Up' : 'Submit'}
            />
          )}
        </Labelled>
      </div>
    )
  }

  function Suggestion({
    translation,
    onView,
    voteButtons,
    approveButton,
    unappproveButton,
    active
  }: {
    active: boolean
    translation: StringTranslation
    onView: () => void
    voteButtons?: {
      up: () => void
      down: () => void
    }
    approveButton?: () => void
    unappproveButton?: () => void
  }) {
    return (
      <div
        style={{
          margin: '8px',
          padding: '16px 8px 8px 8px',
          border: `${translation.approvals.length ? '4px' : '1px'} solid ${
            translation.approvals.length ? '#85C7F2' : '#705bab'
          }`,
          background: active ? 'rgb(42, 18, 119)' : '#0c061e',
          display: 'flex',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <div
          style={{
            fontSize: '0.6em',
            position: 'absolute',
            top: 8,
            left: 8
          }}
        >
          {translation.approvals.length ? (
            <span
              style={{
                color: 'black',
                background: '#85C7F2',
                fontWeight: 'bold',
                padding: '4px',
                borderRadius: '2px',
                margin: '4px'
              }}
            >
              IN-GAME
            </span>
          ) : null}
          Suggested by {translation.user.fullName}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              margin: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            {translation.rating > 0 ? '+' : ''}
            {translation.rating} pts
          </div>
          {voteButtons && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Button onClick={voteButtons.up} text="👍" />
              <Button onClick={voteButtons.down} text="👎" />
            </div>
          )}
          {approveButton && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Button onClick={approveButton} text="Approve" />
            </div>
          )}
          {unappproveButton && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Button onClick={unappproveButton} text="Remove Approval" />
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '16px'
          }}
        >
          <code
            style={{
              background: 'rgba(253,246,227,255)',
              color: 'black',
              padding: '8px',
              margin: '8px'
            }}
          >
            {translation.text}
          </code>
          <Button onClick={onView} text="View" />
        </div>
      </div>
    )
  }
  function Button({
    onClick,
    text,
    disabled
  }: {
    text: string
    onClick: () => void
    disabled?: boolean
  }) {
    const [hovered, setHovered] = useState(false)
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          borderRadius: '3px',
          background: disabled
            ? 'linear-gradient(rgb(50, 50, 50) 46.09%, rgb(80, 80, 80) 46.77%)'
            : hovered
            ? 'linear-gradient(rgb(60, 47, 100) 46.09%, rgb(74, 61, 119) 46.77%)'
            : 'linear-gradient(180deg, #4A3D77 46.09%, #3C2F64 46.77%)',
          border: '1px solid #AC8FFF',
          fontStyle: 'normal',
          fontWeight: '500',
          fontSize: '0.8em',
          lineHeight: '0.8em',
          color: 'white',
          padding: '0.5em'
        }}
        disabled={disabled}
      >
        {text}
      </button>
    )
  }

  function Labelled({
    children,
    label,
    style
  }: {
    children: ReactNode
    label: string
    style?: CSSProperties
  }) {
    return (
      <div
        className="labelled"
        style={{
          padding: '8px',
          ...style
        }}
      >
        <label>
          <span
            style={{
              lineHeight: '1.5em',
              fontSize: '0.8em',
              userSelect: 'none'
            }}
          >
            {label}
          </span>
          {children}
        </label>
      </div>
    )
  }
  function SelectyRadio({
    label,
    value,
    parentValue
  }: {
    label: string
    value: string
    parentValue: string
  }) {
    return (
      <Labelled
        label={label}
        style={{
          margin: ' 8px',
          border: '1px solid rgb(112, 91, 171)',
          background: parentValue !== value ? 'rgb(12, 6, 30)' : '#C5B4F5',
          display: 'inline-block',
          color: parentValue !== value ? '#C5B4F5' : 'rgb(12, 6, 30)'
        }}
      >
        <input
          type="radio"
          value={value}
          checked={parentValue === value}
          onChange={() => {
            // ignore, div onchange gets em all
          }}
          style={{ width: 'initial' }}
        />
      </Labelled>
    )
  }
}

export const test = translationPreview
