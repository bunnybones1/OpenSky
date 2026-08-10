import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'

import { APIClient, GlobalQueryClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Input } from '~/shared/components/Input/Input'
import { ONE_DAY } from '~/shared/constants/time'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Row } from './AdminNotifications.css'

const useAdminNotifications = () => {
  return useQuery({
    queryKey: ['ADMIN_NOTIFICATIONS'],
    queryFn: async () => {
      const { res } = await APIClient.opensky.gMListOneTimeNotifications()

      return res
    },
    staleTime: ONE_DAY
  })
}

const HeaderCell = Sprinkles({
  width: 'full',
  height: 'full',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: '600',
  fontFamily: 'condensed',
  paddingX: '4px'
})

const Cell = Sprinkles({
  width: 'full',
  height: 'full',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingX: '4px',
  color: 'white',
  fontSize: '16px',
  fontFamily: 'condensed',
  fontWeight: '500',
  textAlign: 'center'
})

interface NotifData {
  title: string
  subtitle?: string
  background?: string
  buttonPath?: string
  buttonText?: string
}

const AdminNotifications = memo(() => {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [background, setBackground] = useState('')
  const [buttonPath, setButtonPath] = useState('')
  const [buttonText, setButtonText] = useState('')
  const [validFrom, setValidFrom] = useState<string | undefined>(undefined)
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined)

  const onCreateNew = useCallback(async () => {
    if (!!title && !!validFrom && !!expiresAt) {
      const data: NotifData = {
        title
      }

      if (!!subtitle) data.subtitle = subtitle
      if (!!background) data.background = background
      if (!!buttonPath) data.buttonPath = buttonPath
      if (!!buttonText) data.subtitle = buttonText

      if (window.confirm(`Create notification?`)) {
        await APIClient.opensky.gMCreateOneTimeNotification({
          notification: {
            id: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: 0,
            name: 'ONE_TIME_NOTIF',
            data,
            filter: {
              age: [
                {
                  '>': '0h'
                }
              ]
            },
            validFrom,
            expiresAt
          }
        })
        GlobalQueryClient.invalidateQueries(['ADMIN_NOTIFICATIONS'])
        setTitle('')
        setSubtitle('')
        setBackground('')
        setButtonPath('')
        setButtonText('')
        setValidFrom(undefined)
        setExpiresAt(undefined)
      }
    }
  }, [background, buttonPath, buttonText, expiresAt, subtitle, title, validFrom])

  const onDelete = useCallback(async (id: number) => {
    if (window.confirm('Delete notification?')) {
      await APIClient.opensky.gMDeleteOneTimeNotification({ id })
      GlobalQueryClient.invalidateQueries(['ADMIN_NOTIFICATIONS'])
    }
  }, [])

  const { data: notifications } = useAdminNotifications()

  const onDateChange = useCallback((value: string, isExpireDate?: boolean) => {
    const date = new Date(value)

    if (!!date.toISOString()) {
      if (isExpireDate) {
        setExpiresAt(date.toISOString())
      } else {
        setValidFrom(date.toISOString())
      }
    }
  }, [])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        paddingTop: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start'
      })}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid',
            border: '1px solid',
            borderColor: 'purple7',
            backgroundColor: 'purple2'
          }),
          Row
        )}
      >
        <div className={HeaderCell}>TITLE</div>
        <div className={HeaderCell}>SUBTITLE</div>
        <div className={HeaderCell}>BACKGROUND</div>
        <div className={HeaderCell}>BUTTON PATH</div>
        <div className={HeaderCell}>BUTTON TEXT</div>
        <div className={HeaderCell}>VALID FROM</div>
        <div className={HeaderCell}>EXPIRES AT</div>
      </div>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid',
            borderBottom: '1px solid',
            borderLeft: '1px solid',
            borderRight: '1px solid',
            borderColor: 'purple7',
            position: 'relative'
          }),
          Row
        )}
      >
        <div className={Cell}>
          <Input
            formClassName={Sprinkles({ width: 'full' })}
            inputClassname={Sprinkles({ width: 'full' })}
            value={title}
            onChange={setTitle}
            placeholder="Title"
          />
        </div>
        <div className={Cell}>
          <Input
            formClassName={Sprinkles({ width: 'full' })}
            inputClassname={Sprinkles({ width: 'full' })}
            value={subtitle}
            onChange={setSubtitle}
            placeholder="Subtitle?"
          />
        </div>
        <div className={Cell}>
          <Input
            value={background}
            onChange={setBackground}
            placeholder="Background path?"
            formClassName={Sprinkles({ width: 'full' })}
            inputClassname={Sprinkles({ width: 'full' })}
          />
        </div>
        <div className={Cell}>
          <Input
            value={buttonPath}
            onChange={setButtonPath}
            placeholder="Button path?"
            formClassName={Sprinkles({ width: 'full' })}
            inputClassname={Sprinkles({ width: 'full' })}
          />
        </div>
        <div className={Cell}>
          <Input
            value={buttonText}
            onChange={setButtonText}
            placeholder="Button text?"
            formClassName={Sprinkles({ width: 'full' })}
            inputClassname={Sprinkles({ width: 'full' })}
          />
        </div>
        <div className={Cell}>
          <input
            style={{ width: '90%' }}
            type="datetime-local"
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className={Cell}>
          <input
            style={{ width: '90%' }}
            type="datetime-local"
            onChange={(e) => onDateChange(e.target.value, true)}
          />
        </div>
        <div
          className={Sprinkles({ position: 'absolute', zIndex: 2 })}
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            right: '-60px'
          }}
        >
          <Button
            leftAdornment={{ icon: 'check' }}
            colorType="green"
            frameType="default"
            onClick={onCreateNew}
            disabled={!title || !validFrom || !expiresAt}
          />
        </div>
      </div>
      {!!notifications &&
        notifications.map((notification) => (
          <div
            key={notification.id}
            className={clsx(
              Row,
              Sprinkles({
                width: 'full',
                display: 'grid',
                borderBottom: '1px solid',
                borderLeft: '1px solid',
                borderRight: '1px solid',
                borderColor: 'purple7',
                position: 'relative'
              })
            )}
          >
            <div className={clsx(Cell, Sprinkles({ color: 'purple9' }))}>
              {notification.data.title}
            </div>
            <div className={clsx(Cell, Sprinkles({ color: 'purple7' }))}>
              {notification.data.subtitle}
            </div>
            <div className={Cell}>{notification.data.background}</div>
            <div className={Cell}>{notification.data.buttonPath}</div>
            <div className={Cell}>{notification.data.buttonText}</div>
            <div className={Cell}>{notification.validFrom}</div>
            <div className={Cell}>{notification.expiresAt}</div>
            <div
              className={Sprinkles({ position: 'absolute', zIndex: 2 })}
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                right: '-60px'
              }}
            >
              <Button
                leftAdornment={{ icon: 'trash' }}
                colorType="red"
                frameType="default"
                onClick={() => onDelete(notification.id)}
              />
            </div>
          </div>
        ))}
    </div>
  )
})

AdminNotifications.displayName = 'AdminNotifications'

export default AdminNotifications
