import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

import {
  MatchHistoryHeaderStyle,
  MatchHistoryHeaderSVGWrapper,
  MatchHistoryHeaderWrapper
} from './MatchHistoryHeader.css'

export const MatchHistoryHeader = memo(() => {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative',
          marginTop: '20px'
        }),
        MatchHistoryHeaderStyle
      )}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          position: 'absolute',
          height: 'full',
          width: 'full',
          bottom: 0,
          left: 0,
          zIndex: 1
        })}
      >
        <div
          className={Sprinkles({
            flex: 1,
            height: 'full',
            backgroundColor: 'purple3',
            borderBottom: '1px solid',
            borderTop: '1px solid',
            borderColor: 'purple7',
            borderLeft: '1px solid'
          })}
        />
        <div
          className={clsx(
            Sprinkles({
              position: 'relative',
              height: 'full',
              backgroundColor: 'purple3',
              borderTop: '1px solid',
              borderColor: 'purple7',
              borderBottom: '1px solid'
            }),
            MatchHistoryHeaderWrapper
          )}
        >
          <div
            className={clsx(
              Sprinkles({ position: 'absolute', left: 0, zIndex: 1 }),
              MatchHistoryHeaderSVGWrapper
            )}
          >
            <svg
              height={44}
              width={184}
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 184 44"
            >
              <defs>
                <path d="m 0 44 l 20 -44 h 144 l 20 44 z" id="shape" />
                <clipPath id="clip">
                  <use xlinkHref="#shape" />
                </clipPath>
              </defs>
              <g>
                <use
                  xlinkHref="#shape"
                  stroke={THEME_COLORS.purple7}
                  strokeWidth="2"
                  fill={THEME_COLORS.purple4}
                  clipPath="url(#clip)"
                />
              </g>
            </svg>
          </div>
          <div
            className={Sprinkles({
              position: 'absolute',
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexDirection: 'column',
              width: 'full',
              zIndex: 2,
              flexWrap: 'nowrap'
            })}
          >
            <Text
              fontSize="16px"
              color="purple9"
              fontWeight="500"
              fontFamily="condensed"
              marginBottom="12px"
            >
              {t('matchHistory.latestMatches')}
            </Text>
          </div>
        </div>
        <div
          className={Sprinkles({
            flex: 1,
            height: 'full',
            backgroundColor: 'purple3',
            borderBottom: '1px solid',
            borderTop: '1px solid',
            borderColor: 'purple7',
            borderRight: '1px solid'
          })}
        />
      </div>
    </div>
  )
})

MatchHistoryHeader.displayName = 'MatchHistoryHeader'
