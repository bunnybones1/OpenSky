import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type ExternalWalletContents,
  identityClient,
  type WalletConnection,
  type WalletContentsProjection
} from '~/clients/IdentityClient/IdentityClient'
import env from '~/env'
import { useIdentitySession } from '~/IdentitySession/IdentitySessionContext'
import { connectWallet } from '~/IdentitySession/walletconnect'
import { FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  WalletAddress,
  WalletConnectionsPanel,
  WalletError,
  WalletMessage,
  WalletRow,
  WalletTotal,
  WalletTotals
} from './WalletConnectionsSettings.css'

const ITEM_LABELS: Record<string, string> = {
  SW_BASE_CARDS: 'Base cards',
  SW_SILVER_CARDS: 'Silver cards',
  SW_GOLD_CARDS: 'Gold cards',
  SW_HERO_SKINS: 'Hero skins',
  SW_CRYSTALS: 'Crystals',
  SW_STICKERS: 'Stickers',
  SW_CARD_BACKS: 'Card backs',
  SW_CONQUEST_TICKET: 'Conquest tickets'
}

const shortAddress = (address: string) =>
  `${address.slice(0, 8)}…${address.slice(-6)}`

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message
  return 'Unable to update linked wallets.'
}

export const WalletConnectionsSettings = memo(() => {
  const { t } = useTranslation()
  const { session } = useIdentitySession()
  const [wallets, setWallets] = useState<WalletConnection[]>(session.wallets)
  const [contents, setContents] = useState<WalletContentsProjection>()
  const [contentsError, setContentsError] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const [busyAddress, setBusyAddress] = useState<string>()
  const [isConnecting, setIsConnecting] = useState(false)

  const isWalletConnectConfigured = useMemo(
    () => /^[0-9a-f]{32}$/i.test(env.WALLETCONNECT_PROJECT_ID),
    []
  )

  const loadContents = useCallback(async () => {
    setContentsError(undefined)
    try {
      setContents(await identityClient.getWalletContents())
    } catch (error) {
      setContentsError(errorMessage(error))
    }
  }, [])

  useEffect(() => {
    if (wallets.length) loadContents()
    else setContents(undefined)
  }, [loadContents, wallets.length])

  const linkWallet = useCallback(async () => {
    setActionError(undefined)
    setIsConnecting(true)
    let connection: Awaited<ReturnType<typeof connectWallet>> | undefined
    try {
      connection = await connectWallet(env.WALLETCONNECT_PROJECT_ID)
      const challenge = await identityClient.createWalletChallenge({
        address: connection.address,
        chainId: connection.chainId
      })
      const signature = await connection.signMessage(challenge.message)
      setWallets(
        await identityClient.verifyWalletChallenge({
          challengeId: challenge.challengeId,
          signature,
          label: 'WalletConnect'
        })
      )
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      await connection?.disconnect().catch(() => undefined)
      setIsConnecting(false)
    }
  }, [])

  const unlinkWallet = useCallback(
    async (wallet: WalletConnection) => {
      if (!window.confirm(t('profile.walletUnlinkConfirm'))) return
      setActionError(undefined)
      setBusyAddress(wallet.address)
      try {
        setWallets(await identityClient.unlinkWallet(wallet.address))
      } catch (error) {
        setActionError(errorMessage(error))
      } finally {
        setBusyAddress(undefined)
      }
    },
    [t]
  )

  const contentsByAddress = useMemo<Map<string, ExternalWalletContents>>(
    () =>
      contents?.status === 'available'
        ? new Map(
            contents.wallets.map((wallet) => [wallet.address.toLowerCase(), wallet])
          )
        : new Map<string, ExternalWalletContents>(),
    [contents]
  )

  return (
    <section className={WalletConnectionsPanel}>
      <Text color="purple9" fontSize={18} fontWeight="bold" textAlign="center">
        {t('profile.walletConnections')}
      </Text>
      <div className={WalletMessage}>{t('profile.walletConnectionsDescription')}</div>

      {wallets.map((wallet) => {
        const walletContents = contentsByAddress.get(wallet.address.toLowerCase())
        return (
          <div className={WalletRow} key={wallet.address}>
            <FlexBox
              width="100%"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="nowrap"
            >
              <div className={WalletAddress} title={wallet.address}>
                {wallet.label || shortAddress(wallet.address)}
                {wallet.label ? ` · ${shortAddress(wallet.address)}` : ''}
              </div>
              <Button
                height="28px"
                frameType="default"
                colorType="default"
                disabled={busyAddress === wallet.address}
                onClick={() => unlinkWallet(wallet)}
                text={t('profile.walletUnlink')}
                className={Sprinkles({ marginLeft: '8px' })}
              />
            </FlexBox>
            {walletContents && Object.keys(walletContents.totals).length > 0 ? (
              <div className={WalletTotals}>
                {Object.entries(walletContents.totals).map(([itemType, balance]) => (
                  <div className={WalletTotal} key={itemType}>
                    {ITEM_LABELS[itemType] || itemType}: {balance}
                  </div>
                ))}
              </div>
            ) : contents?.status === 'available' ? (
              <div className={WalletMessage}>{t('profile.walletContentsEmpty')}</div>
            ) : null}
            {walletContents?.truncated && (
              <div className={WalletMessage}>
                {t('profile.walletContentsTruncated')}
              </div>
            )}
          </div>
        )
      })}

      {wallets.length === 0 && (
        <div className={WalletMessage}>{t('profile.walletConnectionsEmpty')}</div>
      )}
      {wallets.length > 0 && contents?.status === 'not_configured' && (
        <div className={WalletMessage}>{t('profile.walletContentsInactive')}</div>
      )}
      {contentsError && <div className={WalletError}>{contentsError}</div>}
      {actionError && <div className={WalletError}>{actionError}</div>}

      <FlexBox width="100%" type="centered-row" mt="16px">
        <Button
          frameType="default"
          colorType="blue"
          disabled={!isWalletConnectConfigured || isConnecting}
          onClick={linkWallet}
          text={
            isConnecting ? t('profile.walletConnecting') : t('profile.walletConnect')
          }
        />
        {wallets.length > 0 && contents?.status === 'available' && (
          <Button
            frameType="default"
            colorType="default"
            onClick={loadContents}
            text={t('profile.walletRefreshContents')}
            className={Sprinkles({ marginLeft: '8px' })}
          />
        )}
      </FlexBox>
      {!isWalletConnectConfigured && (
        <div className={WalletMessage}>{t('profile.walletConnectInactive')}</div>
      )}
    </section>
  )
})

WalletConnectionsSettings.displayName = 'WalletConnectionsSettings'
