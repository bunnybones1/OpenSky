import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { AppleHomescreenDialogStyle } from './AppleHomescreenDialog.css'

export const AppleHomescreenDialog = memo(() => {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          padding: '12px'
        }),
        AppleHomescreenDialogStyle
      )}
    >
      <Text
        marginRight="48px"
        fontWeight="700"
        fontSize="16px"
        marginBottom="12px"
        color="purple9"
      >
        {t('support.addOpenSkyToHome')}
      </Text>
      <Text fontSize="16px" color="purple9" marginBottom="8px">
        {`1: ${t('support.safariLogin')}`}
      </Text>
      <div
        className={Sprinkles({
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text fontSize="16px" color="purple9" marginRight="4px">
          {`2: ${t('support.tapShareIcon')}`}
        </Text>
        <Icon height="20px" color="white" type="share-apple" />
      </div>
      <div
        className={Sprinkles({
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text fontSize="16px" color="purple9" marginRight="4px">
          {`3: ${t('support.thenTapAddToHomeScreen')}`}
        </Text>
        <div className={Sprinkles({ display: 'inline-block' })}>
          <svg
            height="24px"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${20} ${20}`}
            aria-hidden={true}
            className="horizon-icon"
          >
            <rect
              x="13.3333"
              y="9.16666"
              width="1.25"
              height="7.08333"
              rx="0.625001"
              transform="rotate(90 13.3333 9.16666)"
              fill="white"
            />
            <rect
              x="10.4167"
              y="13.3333"
              width="1.25"
              height="7.08333"
              rx="0.625002"
              transform="rotate(-180 10.4167 13.3333)"
              fill="white"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M14.5833 4.58334H5.41658C4.95635 4.58334 4.58325 4.95644 4.58325 5.41668V14.5833C4.58325 15.0436 4.95635 15.4167 5.41658 15.4167H14.5833C15.0435 15.4167 15.4166 15.0436 15.4166 14.5833V5.41668C15.4166 4.95644 15.0435 4.58334 14.5833 4.58334ZM5.41658 3.33334C4.26599 3.33334 3.33325 4.26608 3.33325 5.41668V14.5833C3.33325 15.7339 4.26599 16.6667 5.41658 16.6667H14.5833C15.7338 16.6667 16.6666 15.7339 16.6666 14.5833V5.41668C16.6666 4.26608 15.7338 3.33334 14.5833 3.33334H5.41658Z"
              fill="white"
            />
          </svg>
        </div>
        <Text fontSize="16px" color="purple9" marginLeft="4px">
          {t('support.addToHomeScreen')}
        </Text>
      </div>
    </div>
  )
})

AppleHomescreenDialog.displayName = 'AppleHomescreenDialog'
