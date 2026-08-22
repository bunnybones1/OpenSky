const POLYGON_CHAIN_ID = 137

const messageHex = (message: string): string =>
  `0x${[...new TextEncoder().encode(message)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`

export interface WalletConnectProof {
  address: string
  chainId: 137
  signMessage: (message: string) => Promise<string>
  disconnect: () => Promise<void>
}

export const connectWallet = async (
  projectId: string
): Promise<WalletConnectProof> => {
  if (!/^[0-9a-f]{32}$/i.test(projectId)) {
    throw new Error('WalletConnect is not configured.')
  }
  const [{ UniversalConnector }, { polygon }] = await Promise.all([
    import('@reown/appkit-universal-connector'),
    import('@reown/appkit/networks')
  ])
  const polygonNetwork = {
    ...polygon,
    chainNamespace: 'eip155' as const,
    caipNetworkId: `eip155:${POLYGON_CHAIN_ID}` as const
  }
  const connector = await UniversalConnector.init({
    projectId,
    metadata: {
      name: 'Cloud Weasel',
      description: 'Optional read-only ownership connection for Cloud Weasel.',
      url: window.location.origin,
      icons: [
        new URL('/images/skyweaver-square-192x192.png', window.location.origin).href
      ]
    },
    networks: [
      {
        namespace: 'eip155',
        chains: [polygonNetwork],
        methods: ['personal_sign'],
        events: ['accountsChanged', 'chainChanged', 'disconnect']
      }
    ],
    modalConfig: {
      themeMode: 'dark',
      enableReconnect: false,
      enableBaseAccount: false,
      enableWalletGuide: false,
      features: {
        swaps: false,
        onramp: false,
        receive: false,
        send: false,
        email: false,
        socials: false,
        history: false,
        analytics: false,
        smartSessions: false,
        pay: false,
        reownAuthentication: false
      }
    }
  })
  let connected = false
  try {
    const { session } = await connector.connect()
    connected = true
    const account = session.namespaces.eip155?.accounts.find((value) =>
      value.toLowerCase().startsWith(`eip155:${POLYGON_CHAIN_ID}:0x`)
    )
    const address = account?.split(':')[2]
    if (!address || !/^0x[0-9a-f]{40}$/i.test(address)) {
      throw new Error('The wallet did not provide a valid Polygon account.')
    }
    return {
      address,
      chainId: POLYGON_CHAIN_ID,
      signMessage: async (message) => {
        const signature = await connector.request(
          {
            method: 'personal_sign',
            params: [messageHex(message), address]
          },
          `eip155:${POLYGON_CHAIN_ID}`
        )
        if (typeof signature !== 'string' || !/^0x[0-9a-f]+$/i.test(signature)) {
          throw new Error('The wallet returned an invalid signature.')
        }
        return signature
      },
      disconnect: async () => {
        if (connected) {
          connected = false
          await connector.disconnect()
        }
      }
    }
  } catch (error) {
    if (connected) await connector.disconnect().catch(() => undefined)
    throw error
  }
}
