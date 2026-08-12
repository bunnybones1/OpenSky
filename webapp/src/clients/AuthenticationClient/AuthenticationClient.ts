/* eslint-disable no-console */
import { ChainId } from '@0xsequence/network'
import { analytics } from '@opensky/analytics'
import { i18n, LOCALE_LOCAL_STORAGE_KEY } from '@opensky/language-manager'
import { Account } from '@opensky/proto'
import {
  BURNER_WALLET_PK_KEY,
  deleteAccountMessage,
  SEQUENCE_JWT_KEY,
  SKYWEAVER_JWT_KEY
} from '@opensky/shared/constants'
import { isNativeOpenSkyMobileApp } from '@opensky/shared/native'
import { getOrCreateSubkey } from '@opensky/shared/subkey'
import { sequence } from '0xsequence'
import { ethers } from 'ethers'

import { identityClient } from '~/clients/IdentityClient/IdentityClient'
import env from '~/env'
import { APIClient, MobileClient } from '~/shared/clients'
import { TAG_ART } from '~/shared/constants/tag-art'
import { getDeviceProperties, trackSessionEnd } from '~/shared/helpers/analytics-old'
import { parseError } from '~/shared/helpers/parse-error'
import { captureError } from '~/shared/helpers/sentry'
import { getAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import {
  authenticationState,
  updateAuthenticationState
} from '~/shared/state/authentication-state'
import { addToast, clearAllToasts } from '~/shared/state/toast-state'

import { addTrackers } from './helpers/add-trackers'
import { createBurnerWallet } from './helpers/create-burner-wallet'
import { getAuthHeaders } from './helpers/get-auth-header'
import { getMobileWalletMessenger } from './helpers/get-mobile-wallet-messenger'
import { getOpenSkyAuthFromBurner } from './helpers/get-opensky-auth-from-burner'
import { getOpenSkyAuthFromSequence } from './helpers/get-opensky-auth-from-sequence'
import { getJWTs, setJWTs } from './helpers/get-set-jwts'
import { handleAuthError } from './helpers/handle-auth-error'
import { handleCookies } from './helpers/handle-cookies'
import { identifyUserInAnalytics } from './helpers/identify-user-in-analytics'
import { initSentry } from './helpers/init-sentry'
import { isJWTExpired } from './helpers/is-jwt-expired'
import { sequenceOverriddenNetworks } from './helpers/sequenceOverriddenNetworks'
import { setAuthenticatedUser } from './helpers/set-authenticated-user'
import { EthersProvider } from './shared/constants'
import { Wallet } from './Wallet/Wallet'

export class _AuthenticationClient_DONT_USE_DIRECTLY {
  private isUserIdentifiedInAnalytics: boolean = false
  private mobileMessageChannel = getMobileWalletMessenger()
  wallet?: Wallet

  constructor() {
    // In the client contructor we:
    // 1. Set up Sentry.
    // 2. Check if there are any JWTs stored in local storage.
    //  2a. If there are JWTs, we use them to try and log the user in.
    //  2b. If there are no JWTs, we hide the loading screen and show the create account page.

    // Set up sentry.
    initSentry((sentryId) => {
      updateAuthenticationState('sentryId', sentryId)
    })

    // Check for JWTs
    const { jwt, sequenceJwt } = getJWTs()

    if (!!sequenceJwt && sequenceJwt !== '') {
      APIClient.sequence.jwtAuth = sequenceJwt
    }

    // Check if the opensky JWT is valid, and if so use it to
    // try and log the user in.
    if (!!jwt && jwt !== '' && !isJWTExpired(jwt)) {
      this.initializeWithJWT(jwt)
    } else {
      // If there is no valid JWT, hide the loading screen.
      updateAuthenticationState('isInitializing', false)
    }
  }

  private setSequenceAccountChangeHandler = (
    sequenceWallet: sequence.provider.SequenceProvider
  ) => {
    sequenceWallet.on('accountsChanged', () => {
      console.log('Sequence account changed! Logging out.')
      if (
        !!this.wallet &&
        !!this.wallet.isConnected() &&
        !!authenticationState.userAddress
      ) {
        trackSessionEnd('logout')
        this.logout()
      }
    })
  }

  public logout = () => {
    // Logging out of opensky is pretty simple. We just
    // remove any of the JWTs and private keys stored
    // in localstorage, and reload the page at its base URL.
    window.localStorage.removeItem(SEQUENCE_JWT_KEY)
    window.localStorage.removeItem(SKYWEAVER_JWT_KEY)
    window.localStorage.removeItem(BURNER_WALLET_PK_KEY)
    window.location.href = window.location.origin
  }

  private getSequenceWallet = () => {
    // getSequenceWallet is used to...get a sequence wallet 😊
    // that can then be connected to and used to sign in.
    return sequence.initWallet(env.SEQUENCE_API_KEY, {
      transports: !!this.mobileMessageChannel?.app
        ? {
            walletAppURL: env.WEB_WALLET_HOST,
            windowTransport: { enabled: false },
            proxyTransport: {
              enabled: true,
              appPort: this.mobileMessageChannel.app
            }
          }
        : {
            walletAppURL: env.WEB_WALLET_HOST,
            windowTransport: { enabled: true }
          },
      defaultNetwork: ChainId.POLYGON,
      networks: sequenceOverriddenNetworks
    })
  }

  private finalizeAuthedUser = async (account: Account) => {
    // This funciton is called after we've authenticated the user, and is
    // used to set the users info in state.

    if (account.locale) {
      localStorage.setItem(LOCALE_LOCAL_STORAGE_KEY, i18n.language)
      i18n.changeLanguage(account.locale)
    }

    // Set the users cookie state.
    await handleCookies(account)

    // Set the user in react-query, valtio, and sentry.
    setAuthenticatedUser(account)

    // Initialize the analytics if the user is not on the mobile app.
    // If the user is on the mobile app, identifyUserInAnalytics will be called later
    // in response to a message from the native app.
    if (!isNativeOpenSkyMobileApp()) {
      this.identifyUserInAnalytics(account.name, account.address)
    }

    // Hide the loading screen.
    updateAuthenticationState('isInitializing', false)
  }

  private initializeWithJWT = async (jwt: string) => {
    // This funciton is called if we grabbed a valid JWT for the user from
    // localstorage, and will attempt to use it to log them in.
    try {
      console.group('Valid JWT found! Logging user in.')

      // Use the JWT to grab a session from the opensky API.
      const session = await APIClient.opensky.getSession(getAuthHeaders(jwt))

      if (!!session?.account && session.account.address === session.address) {
        APIClient.opensky.authToken = jwt

        // If the account fetched as part of the session is using a burner wallet, we have
        // to handle authenticating it differently than a sequence wallet.
        if (session.account.isBurnerWallet) {
          console.log('Burner session found! Proceeding log in.')

          const privateKey = window.localStorage.getItem(BURNER_WALLET_PK_KEY)

          if (privateKey) {
            console.log('Private key found, initializing burner wallet.')

            // Use the stored private key to initialize a new burner wallet.
            const walletEOA = new ethers.Wallet(privateKey, EthersProvider)
            const wallet = await createBurnerWallet(walletEOA)

            console.log('Burner wallet initialized! Finishing log in.')

            this.wallet = new Wallet({ burnerWallet: wallet, logout: this.logout })

            await this.finalizeAuthedUser(session.account)
            console.log('Log in successful.')
          } else {
            // If not private key is stored, we treat the user as though their account
            // doesnt exist, since we cant restore their wallet. Such is the burner wallet
            // life.
            console.log(
              'No private key for burner wallet found. Proceeding to create account page.'
            )

            updateAuthenticationState('isInitializing', false)
          }
        } else {
          console.log('Sequence session found! Proceeding log in.')

          // If the account we fetched isnt a burner wallet, then we initialize the user
          // with their sequence wallet.
          const sequenceWallet = this.getSequenceWallet()

          const sequenceAddress = sequenceWallet.getAddress()

          if (sequenceAddress.toLowerCase() !== session.address.toLowerCase()) {
            throw new Error('address mismatch')
          }

          // If the user opens sequence and switches their account, this should trigger and
          // log them out of OpenSky.
          this.setSequenceAccountChangeHandler(sequenceWallet)

          this.wallet = new Wallet({ sequenceWallet, logout: this.logout })

          addTrackers()

          console.log('Sequence wallet initialized! Finishing log in.')

          await this.finalizeAuthedUser(session.account)

          console.log('Log in successful.')
        }
      } else {
        // If no session is found for the JWT, we take the user to the account creation page.
        console.log(
          'Unable to find session for user. Proceeding to create account page.'
        )

        updateAuthenticationState('isInitializing', false)
      }
    } catch (error) {
      console.log('Encountered an error while logging in:', error)
      handleAuthError(error)
      updateAuthenticationState('isInitializing', false)
    } finally {
      console.groupEnd()
    }
  }

  public identifyUserInAnalytics = async (
    name: string,
    address: string,
    mobilePushUserId?: string
  ) => {
    if (this.isUserIdentifiedInAnalytics) return

    const isIdentified = await identifyUserInAnalytics({
      mobilePushUserId,
      name,
      address
    })

    this.isUserIdentifiedInAnalytics = !!isIdentified
  }

  private createAccount = async (
    address: string,
    openskyJWT: string,
    sequenceJWT: string,
    isBurnerWallet: boolean
  ) => {
    // This function takes an address, and both JWTs and uses them to create a OpenSky account.

    setJWTs({ sequenceJWT, openskyJWT })

    const backgrounds = Array.from(TAG_ART.values()).filter(
      (tagArt) => tagArt.type === 'bg'
    )

    // Grab a random background image to use as the new accounts profile banner.
    const randomTagArtID =
      backgrounds[Math.floor(Math.random() * backgrounds.length)].id

    // Check the URL to see if this user was invited to make an account by
    // another player.
    const searchParams = new URLSearchParams(window.location.search)
    const invitedBy = searchParams.get('invitedBy')

    const {
      countryCode,
      deviceID,
      environmentDevice,
      environmentOS,
      environmentProduct
    } = getDeviceProperties()

    localStorage.setItem(LOCALE_LOCAL_STORAGE_KEY, i18n.language)

    return await APIClient.opensky.registerAccount({
      accountRegistration: {
        address,
        tagArtID: randomTagArtID,
        invitedBy: invitedBy || undefined,
        isBurnerWallet,
        locale: i18n.language,
        deviceProperties: {
          countryCode,
          deviceID,
          environmentDevice,
          environmentOS,
          environmentProduct
        },
        registrationEvent: MobileClient.isGalaxyStoreBuild ? 'samsung' : ''
      },
      captcha: ''
    })
  }

  private pushToTutorial = () => {
    // This function is called normally after createAccount, and is used to
    // take the user to the tutorial.
    getOrCreateSubkey()

    setTimeout(() => {
      window.location.href = `${env.GAME_URL}?mode=TUTORIAL&tutorialLevel=1`
    }, 1)
  }

  public createBurnerAccount = async () => {
    try {
      analytics.track({ event: 'CLIENT_ATTEMPTING_NEW_ACCOUNT' })

      console.group('Creating account with burner wallet.')

      const walletEOA = ethers.Wallet.createRandom()
      const privateKey = walletEOA.privateKey

      const wallet = await createBurnerWallet(walletEOA)

      console.log('Burner wallet creation successful. Proceeding to authorization.')

      this.wallet = new Wallet({ burnerWallet: wallet, logout: this.logout })

      const address = wallet.address

      console.log('Authorizing new wallet with OpenSky.')
      const { JWT, sequenceJWT } = await getOpenSkyAuthFromBurner(address, wallet)

      console.log('OpenSky authentication succeeded! Proceeding to account creation.')
      const res = await this.createAccount(address, JWT, sequenceJWT, true)

      if (res.status) {
        await this.identifyUserInAnalytics(res.account.name, address)

        console.log('Analytics identify done. Pushing to tutorial.')
        window.localStorage.setItem(BURNER_WALLET_PK_KEY, privateKey)

        await analytics.flush()

        //about to navigate away
        this.pushToTutorial()
      }
    } catch (error) {
      console.log('Burner account creation error: ', error)

      clearAllToasts()

      addToast({
        text: error.message,
        icon: 'close-circled',
        iconColor: 'warm9'
      })
    } finally {
      console.groupEnd()
    }
  }

  public login = async () => {
    try {
      console.group('Logging in with Sequence.')

      const sequenceWallet = this.getSequenceWallet()

      this.wallet = new Wallet({ sequenceWallet, logout: this.logout })

      this.setSequenceAccountChangeHandler(sequenceWallet)

      console.log('Authorizing Sequence wallet with OpenSky.')

      const { JWT, sequenceJWT, address } =
        await getOpenSkyAuthFromSequence(sequenceWallet)

      console.log('Sequence auth succeeded. Finding account for wallet.')

      const session = await APIClient.opensky.getSession(getAuthHeaders(JWT))
      let account = session.account

      if (!account && env.AUTO_REGISTER_WALLET) {
        console.log('Creating a Cloudflare account for this wallet.')
        const registration = await this.createAccount(
          address,
          JWT,
          sequenceJWT,
          false
        )
        if (registration.status) account = registration.account
      }

      if (account) {
        console.log('Found OpenSky account for wallet! Finishing log in.')

        setJWTs({ openskyJWT: JWT, sequenceJWT })

        addTrackers()

        await this.finalizeAuthedUser(account)
      } else {
        throw new Error('No OpenSky account found for this wallet. Create one first.')
      }
    } catch (err) {
      if (err.message !== 'connect first' && err.message !== 'get address error') {
        captureError(err, 'Error logging in', false, false)
      }
      if (err.message.includes('No OpenSky account found')) {
        addToast({
          text: i18n.t('notification.error'),
          secondaryText: i18n.t('support.noAccountFound'),
          icon: 'error',
          iconColor: 'warm9',
          isEvergreen: true
        })
      }
      console.log('Sequence log in error: ', err)
    } finally {
      console.groupEnd()
    }
  }

  public convertBurnerToSequence = async () => {
    // This function converts the active burner wallet user to a sequence wallet user.
    try {
      const account = getAuthedAccount()

      if (!account || !this.wallet) {
        throw new Error('Unable to convert un-authed user to sequence.')
      }

      if (!account.isBurnerWallet) {
        throw new Error('Tried to convert sequence wallet to sequence wallet.')
      }

      console.group('Converting burner wallet user to sequence user.')

      const sequenceWallet = this.getSequenceWallet()

      console.log('Authorizing sequence wallet with OpenSky.')

      const {
        JWT: newJWT,
        sequenceJWT: newSequenceJWT,
        proofString,
        address
      } = await getOpenSkyAuthFromSequence(sequenceWallet)

      console.log('Authorization succeeded! Proceeding to conversion.')

      const { jwt: oldJwt } = getJWTs()

      if (!oldJwt) {
        throw new Error('Unable to convert burner user; no active jwt')
      }

      if (!address) {
        throw new Error('Unable to get address for new Sequence wallet.')
      }

      // Calling this changes the users address, and other wallet related info in the
      // opensky backend.
      const migrated = await APIClient.opensky.migrateFromBurner(
        { ethAuthProofString: proofString },
        getAuthHeaders(oldJwt)
      )

      if (migrated && !!migrated.status) {
        console.log('Migration succeeded! Proceeding to initialize new user info.')

        setJWTs({ openskyJWT: newJWT, sequenceJWT: newSequenceJWT })

        // If the migration was successful, we call this endpoint to see if there are
        // any tradable items in the old wallet that need to be sent to the new one.
        const transactions =
          await APIClient.opensky.prepareTransferAssetsFromBurnerTransaction()

        if (
          !!transactions &&
          !!transactions.transactions &&
          !!transactions.transactions.length
        ) {
          console.log('Found conversion transfers. Sending items to new wallet.')
          await this.wallet.sendTransaction(transactions.transactions)
          console.log('Transfers succeeded! Proceeding to initialize new user info.')
        }

        this.wallet = new Wallet({ sequenceWallet, logout: this.logout })

        this.setSequenceAccountChangeHandler(sequenceWallet)

        updateAuthenticationState('userAddress', address)

        window.localStorage.removeItem(BURNER_WALLET_PK_KEY)

        return address
      }
      return
    } catch (error) {
      const err = parseError(error)

      if (err.message.includes('user closed the wallet')) return

      if (err.message.includes('account is registered already')) {
        captureError(
          error,
          'A OpenSky account already exists for this Sequence account.',
          true,
          false
        )
      } else {
        captureError(error, 'Sequence conversion error.', true, true)
      }
      return
    } finally {
      console.groupEnd()
    }
  }

  public deleteAccount = async (onDelete?: () => void) => {
    try {
      if (env.AUTH_MODE === 'google') {
        const account = getAuthedAccount()
        if (!account) throw new Error('Unable to find the signed-in account.')
        await identityClient.startAccountDeletion(
          account.name,
          `${window.location.pathname}${window.location.search}${window.location.hash}`
        )
        return
      }
      if (!this.wallet) return

      if (this.wallet.isBurnerWallet) {
        localStorage.removeItem(BURNER_WALLET_PK_KEY)
        this.logout()
      } else {
        const authedAddress = this.wallet.address

        if (!authedAddress) throw new Error('Unable to delete un-authed account.')

        const signature = await this.wallet.signMessage(deleteAccountMessage)

        if (!!signature) {
          await APIClient.opensky.requestAccountDeletion({
            proof: {
              address: authedAddress,
              signature,
              message: deleteAccountMessage
            }
          })
          if (!!onDelete) onDelete()
        } else {
          throw new Error('Unable to get signature')
        }
      }
    } catch (error) {
      captureError(error, 'Unable to delete account.')
    }
  }
}
