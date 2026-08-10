import { ModalStorageKeys, UserStorageKeys } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, ReactNode, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDismissedModals } from '~/shared/hooks/useDismissedModals'
import { useUpdateUserStorage } from '~/shared/mutations/useUpdateUserStorage'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { ButtonColorTypes } from '~/shared/style/SharedButtonStyles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Button, ButtonProps } from '../Button'
import { Checkbox } from '../Checkbox'
import { Text } from '../Text'
import { PromptDialogImage, PromptDialogStyle } from './PromptDialog.css'

interface PromptDialogProps {
  imageUrl?: string
  prompText?: string | ReactNode
  confirmText?: string
  dismissText?: string
  confirmColor?: ButtonColorTypes
  dismissColor?: ButtonColorTypes
  id?: ModalStorageKeys
  isConfirmDisabled?: boolean
  isConfirmLoading?: boolean
  isDismissLoading?: boolean
  isDismissDisabled?: boolean
  children?: React.ReactNode
  buttonHeight?: ButtonProps['height']
  onConfirm(): void
  onDismiss?(): void
}

const Spinner = { icon: 'spinner' } as const

export const PromptDialog = memo(
  ({
    imageUrl,
    prompText,
    confirmText,
    dismissText,
    confirmColor = 'default',
    dismissColor = 'blue',
    id,
    children,
    isConfirmDisabled,
    isDismissDisabled,
    isConfirmLoading,
    isDismissLoading,
    onConfirm,
    onDismiss,
    buttonHeight
  }: PromptDialogProps) => {
    const modalsToSkip = useDismissedModals()
    const updateUserStorage = useUpdateUserStorage()
    const { t } = useTranslation()

    const [checked, setChecked] = useState(false)

    const setCheckBox = useCallback(
      (newChecked: boolean) => {
        if (!modalsToSkip || !id) return
        setChecked(newChecked)

        updateUserStorage.mutate({
          key: UserStorageKeys.MODALS_TO_SKIP,
          value: {
            ...modalsToSkip,
            [id]: newChecked
          }
        })
      },
      [id, modalsToSkip, updateUserStorage]
    )

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'purple1',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: 'column'
          }),
          PromptDialogStyle
        )}
      >
        {imageUrl && (
          <div
            style={{
              backgroundImage: `url(${imageUrl})`
            }}
            className={clsx(
              Sprinkles({
                width: 'full',
                border: '1px solid',
                borderColor: 'purple5'
              }),
              PromptDialogImage
            )}
          />
        )}

        <div
          className={Sprinkles({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            position: 'relative',
            width: 'full',
            border: '1px solid',
            borderColor: 'purple5',
            backgroundColor: 'transparent',
            height: 'auto',
            overflow: 'hidden'
          })}
        >
          {!!prompText && (
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                width: 'full',
                zIndex: 2,
                height: 'auto'
              })}
            >
              <Text
                fontSize="16px"
                fontWeight="400"
                color="purple9"
                textAlign="center"
              >
                {prompText}
              </Text>
            </div>
          )}

          {children}

          <div
            className={Sprinkles({
              width: 'full',
              flexWrap: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
              padding: '20px',
              paddingTop: '0px'
            })}
          >
            {onDismiss && (
              <div className={Sprinkles({ flex: 1 })}>
                <Button
                  className={FullWidthButtonStyle}
                  buttonClassName={FullWidthButtonStyle}
                  height={buttonHeight || '36px'}
                  onClick={onDismiss}
                  colorType={dismissColor}
                  frameType="default"
                  disabled={isDismissDisabled}
                  leftAdornment={isDismissLoading ? Spinner : undefined}
                  buttonId="promptAlertDismiss"
                  text={dismissText || t('confirmModal.no')}
                />
              </div>
            )}

            <div
              className={Sprinkles({
                flex: 1,
                marginLeft: !!onDismiss ? '8px' : '0px'
              })}
            >
              <Button
                className={FullWidthButtonStyle}
                buttonClassName={FullWidthButtonStyle}
                height={buttonHeight || '36px'}
                onClick={onConfirm}
                colorType={confirmColor}
                leftAdornment={isConfirmLoading ? Spinner : undefined}
                disabled={isConfirmDisabled}
                frameType="default"
                buttonId="promptAlertConfirm"
                text={confirmText || t('confirmModal.yes')}
              />
            </div>
          </div>
          {!!id && (
            <div
              className={Sprinkles({
                width: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                position: 'relative',
                padding: '20px',
                paddingTop: '0px',
                flexWrap: 'nowrap',
                zIndex: 2
              })}
            >
              <Checkbox
                text={t('prompt.dismiss')}
                value={checked}
                onChange={setCheckBox}
              />
            </div>
          )}
        </div>
      </div>
    )
  }
)

PromptDialog.displayName = 'PromptDialog'
