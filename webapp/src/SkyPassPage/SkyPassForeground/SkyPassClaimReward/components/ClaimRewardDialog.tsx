import { ItemType, Reward } from '@opensky/proto'
import { getGradedID, getItemType } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Tilt from 'react-parallax-tilt'
import { useNavigate } from 'react-router-dom'

import { SoundClient } from '~/shared/clients'
import { ExplosionCard } from '~/shared/components/ExplosionCard'
import { Text } from '~/shared/components/Text'
import { makeItemsCardDetailsRoute } from '~/shared/helpers/routes/items-page'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CLAIM_REWARD_DIALOG_ID } from '../shared/constants'
import {
  ClaimRewardCardRevealBack,
  ClaimRewardCardRevealed,
  ClaimRewardDialogBackground,
  ClaimRewardDialogStyle,
  ClaimRewardDialogTopAnchor,
  ClaimRewardNotificationContainer,
  ClaimRewardRewardImgContainer
} from './ClaimRewardDialog.css'

const { closeDialog } = controlDialog(CLAIM_REWARD_DIALOG_ID)

interface props {
  rewards: Reward[]
  isNew: boolean
}

const FontSize = { base: '22px', tabletWide: '26px', desktop: '42px' } as const

const ClaimRewardDialog = memo(({ rewards, isNew }: props) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getAssetUrl } = useGetAssetContext()

  const { cardsToDisplay } = useMemo(() => {
    let cardIds: number[] = []

    if (rewards) {
      rewards.map((reward) => {
        const id = reward.card?.card.id

        if (id) {
          const gradedId = getGradedID(
            id,
            reward.card?.card.itemType === ItemType.UNKNOWN
              ? ItemType.SW_BASE_CARDS
              : reward.card?.card.itemType
          )
          cardIds.push(gradedId)
        }
      })

      // Only show 5
      if (cardIds.length > 5) {
        cardIds = cardIds.slice(0, 5)
      }
    }

    return { cardsToDisplay: cardIds }
  }, [rewards])

  const cardWidth = useMemo(() => {
    if (cardsToDisplay.length > 4) {
      return '18%'
    }
    return '23%'
  }, [cardsToDisplay])

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          overflow: 'auto',
          flexDirection: 'column',
          justifyContent: 'center',
          flexWrap: 'nowrap'
        }),
        ClaimRewardDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            height: 'full',
            width: 'full'
          }),
          ClaimRewardDialogBackground
        )}
        style={{
          backgroundImage: !!getAssetUrl
            ? `url(${getAssetUrl(
                'webapp/backgrounds/notifications-background.webp'
              )})`
            : undefined
        }}
      />
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            width: 'full',
            height: 'full',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1
          }),
          ClaimRewardNotificationContainer
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              zIndex: 5
            }),
            ClaimRewardDialogTopAnchor
          )}
        >
          <Text
            fontSize={FontSize}
            color="white"
            fontWeight={'600'}
            textAlign="center"
            className={Sprinkles({
              marginTop: { base: '8px', tabletWide: '20px' },
              textAlign: 'center',
              position: 'relative',
              zIndex: 5
            })}
          >
            {t(`play.${isNew ? 'congratsNewCards' : 'rewardDetails'}`)}
          </Text>
        </div>
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              width: 'full',
              position: 'relative',
              justifyContent: 'center',
              flexWrap: 'nowrap',
              marginTop: { base: '24px', tablet: '32px' }
            }),
            ClaimRewardRewardImgContainer
          )}
        >
          {cardsToDisplay &&
            cardsToDisplay.map((cardId, i) => (
              <div
                className={Sprinkles({
                  position: 'relative',
                  opacity: 1,
                  zIndex: 5
                })}
                key={`${i}-${cardId}`}
                style={{ width: cardWidth }}
                onClick={() => {
                  closeDialog()
                  navigate(makeItemsCardDetailsRoute(cardId))
                }}
              >
                <Tilt tiltReverse={true} tiltMaxAngleX={10} tiltMaxAngleY={10}>
                  {isNew && (
                    <div
                      className={Sprinkles({
                        display: 'flex',
                        width: 'full',
                        position: 'absolute'
                      })}
                    >
                      {!!getAssetUrl && (
                        <img
                          onLoad={() => {
                            if (isNew) {
                              setTimeout(
                                () => {
                                  SoundClient.playSound('RewardWindowOpen')
                                },
                                500 * (i + 1)
                              )
                            }
                          }}
                          className={clsx(
                            Sprinkles({
                              width: 'full',
                              position: 'absolute',
                              left: 0,
                              zIndex: 5
                            }),
                            ClaimRewardCardRevealBack
                          )}
                          style={{ animationDelay: `${0.5 * (i + 1)}s` }}
                          src={getAssetUrl(
                            `webapp/misc/cardback-${
                              getItemType(cardId) === ItemType.SW_SILVER_CARDS
                                ? 'silver'
                                : 'base'
                            }.webp`
                          )}
                        />
                      )}
                    </div>
                  )}
                  <div
                    className={clsx(
                      Sprinkles({ display: 'flex', width: 'full' }),
                      isNew ? ClaimRewardCardRevealed : ''
                    )}
                    style={{ animationDelay: `${0.5 * i}s` }}
                  >
                    <ExplosionCard
                      id={cardId}
                      explosionEffect={isNew}
                      explosionEffectDelay={(i + 1) * 500}
                    />
                  </div>
                </Tilt>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
})

ClaimRewardDialog.displayName = 'ClaimRewardDialog'

export default ClaimRewardDialog
