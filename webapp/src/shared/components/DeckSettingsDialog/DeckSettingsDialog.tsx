import clsx from 'clsx'
import {
  ComponentType,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Input } from '~/shared/components/Input/Input'
import { Text } from '~/shared/components/Text'
import { copyToClipBoard } from '~/shared/helpers/copy-to-clipboard'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  DeckSettingsCopyButton,
  DeckSettingsFooter,
  DeckSettingsFooterLeftSide,
  DeckSettingsModalDeckString,
  DeckSettingsModalStyle
} from './DeckSettingsDialog.css'

interface DeckSettingsModalProps {
  originalName: string
  deckString: string | undefined
  onDelete?: () => void
  SaveButton: ComponentType<{ newName: string }>
  id: string
}

const CopyIcon = { icon: 'copy' } as const
const CheckIcon = { icon: 'check' } as const

export const DeckSettingsDialog = memo(
  ({
    deckString,
    originalName,
    onDelete,
    SaveButton,
    id
  }: DeckSettingsModalProps) => {
    const [copied, setCopied] = useState(false)
    const [newName, setName] = useState(originalName)
    const [error, setError] = useState<string | undefined>(undefined)
    const timer = useRef<number | null>(null)
    const { t } = useTranslation()

    useLayoutEffect(() => {
      setName(originalName)
    }, [originalName])

    const onClear = useCallback(() => {
      setName('')
      setError(undefined)
    }, [])

    const onChange = useCallback(
      (value: string) => {
        if (value.length > 16) {
          setError(t('decks.deckNameError'))
        } else {
          setError(undefined)
          setName(value)
        }
      },
      [t]
    )

    useEffect(() => {
      return () => {
        if (timer.current) {
          window.clearTimeout(timer.current)
        }
      }
    }, [])

    const copyDeckString = useCallback(async () => {
      if (!!deckString) {
        const wasCopied = await copyToClipBoard(deckString)
        if (wasCopied) {
          setCopied(true)
          if (timer.current) window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => {
            setCopied(false)
          }, 1000)
        }
      }
    }, [deckString])

    const onCancel = useCallback(() => {
      const { closeDialog } = controlDialog(id)
      closeDialog()
    }, [id])

    return (
      <div
        className={clsx(
          DeckSettingsModalStyle,
          Sprinkles({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            backgroundColor: 'purple1'
          })
        )}
      >
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            paddingY: '16px',
            paddingX: '20px'
          })}
        >
          <Text
            color="purple11"
            fontFamily="condensed"
            fontSize="16px"
            marginBottom="8px"
          >
            {t('decks.DeckName')}
          </Text>
          <div
            className={Sprinkles({
              width: 'full'
            })}
          >
            <Input
              errorMessage={error}
              onChange={onChange}
              inputId="deck-name-input"
              value={newName}
              inputClassname={Sprinkles({
                width: 'full'
              })}
              formClassName={Sprinkles({
                width: 'full'
              })}
              onClear={onClear}
            />
          </div>
        </div>
        {!!deckString && (
          <div
            className={Sprinkles({
              width: 'full',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              paddingBottom: '16px',
              paddingX: '20px'
            })}
          >
            <Text
              color="purple11"
              fontFamily="condensed"
              fontSize="16px"
              marginBottom="8px"
            >
              {t('decks.DeckString')}
            </Text>
            <div
              className={Sprinkles({
                width: 'full',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-start'
              })}
            >
              <Text
                fontWeight="400"
                fontSize="16px"
                color="purple9"
                className={DeckSettingsModalDeckString}
                marginRight="8px"
              >
                {deckString}
              </Text>
              <Button
                text={t(`general.${copied ? 'Copied' : 'Copy'}`)}
                colorType={copied ? 'green' : 'default'}
                frameType="default"
                leftAdornment={copied ? CheckIcon : CopyIcon}
                onClick={copyDeckString}
                className={DeckSettingsCopyButton}
                buttonClassName={DeckSettingsCopyButton}
              />
            </div>
          </div>
        )}
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              alignItems: 'center',
              justifyContent: !!onDelete ? 'space-between' : 'flex-end',
              display: 'flex',
              backgroundColor: 'purple3',
              borderTop: '1px solid',
              borderColor: 'purple7',
              paddingX: '12px'
            }),
            DeckSettingsFooter
          )}
        >
          {!!onDelete && (
            <Button
              frameType="default"
              colorType="default"
              text={t('decks.DeleteDeck')}
              onClick={onDelete}
            />
          )}

          <div
            className={clsx(
              DeckSettingsFooterLeftSide,
              Sprinkles({
                display: 'grid'
              })
            )}
          >
            <Button
              frameType="default"
              colorType="default"
              text={t('generic.Cancel')}
              onClick={onCancel}
            />
            <SaveButton newName={newName} />
          </div>
        </div>
      </div>
    )
  }
)

DeckSettingsDialog.displayName = 'DeckSettingsDialog'
