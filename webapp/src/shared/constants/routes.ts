export const DECK_VIEWER_PARAM = 'deckToView'
export const DECK_ID_TO_VIEW_PARAM = 'deckIdToView'
export const STARTER_HERO_TO_VIEW_PARAM = 'starterHero'

// These params can be on the URL on any page, as they cause
// global components to render.
export const GLOBAL_PARAMS = [DECK_VIEWER_PARAM, DECK_ID_TO_VIEW_PARAM]

export const ROUTES_CONFIG = {
  path: '/*',
  directPath: '/',
  routes: {
    HOME: {
      path: 'home',
      directPath: '/home'
    },
    PLAYGROUND: {
      path: 'playground',
      directPath: '/playground'
    },
    PLAY: {
      path: 'play/*',
      directPath: '/play/*',
      routes: {
        TUTORIAL: {
          path: 'tutorial',
          directPath: '/play/tutorial'
        },
        CONQUEST: {
          path: 'conquest',
          directPath: '/play/conquest'
        },
        RANKED: {
          path: 'ranked',
          directPath: '/play/ranked'
        },
        PRACTICE: {
          path: 'practice/*',
          directPath: '/play/practice/*',
          routes: {
            PLAYER: {
              path: 'player',
              directPath: '/play/practice/player'
            },
            BOT: {
              path: 'bot',
              directPath: '/play/practice/bot'
            }
          }
        }
      }
    },
    SKY_PASS: {
      path: 'skypass',
      directPath: '/skypass'
    },
    SKY_PASS_PURCHASE: {
      path: 'skypass-purchase',
      directPath: '/skypass-purchase'
    },
    PURCHASE_CONQUEST: {
      path: 'purchase-conquest',
      directPath: '/purchase-conquest'
    },
    PENDING_GOLDS: {
      path: 'pending-golds',
      directPath: '/pending-golds'
    },
    SELECT_SILVERS: {
      path: 'select-silvers/*',
      directPath: '/select-silvers/*',
      routes: {
        CARDS: {
          path: 'cards',
          directPath: '/select-silvers/cards'
        },
        CARD_DETAILS: {
          path: 'card/:id',
          directPath: '/select-silvers/card/:id'
        }
      }
    },
    SELECT_GOLDS: {
      path: 'select-golds/*',
      directPath: '/select-golds/*',
      routes: {
        CARDS: {
          path: 'cards',
          directPath: '/select-golds/cards'
        },
        CARD_DETAILS: {
          path: 'card/:id',
          directPath: '/select-golds/card/:id'
        }
      }
    },
    CACHE_INFO: {
      path: 'cache-info',
      directPath: '/cache-info'
    },
    SECRET_DEBUG: {
      path: 'secret-debug',
      directPath: '/secret-debug'
    },
    NEWS: {
      path: 'news/:articleId',
      directPath: '/news/:articleId'
    },
    LEADERBOARD: {
      path: 'leaderboard/*',
      directPath: '/leaderboard/*',
      routes: {
        DECK_LEADERBOARD: {
          path: 'decks',
          directPath: '/leaderboard/decks'
        },
        PLAYER_LEADERBOARD: {
          path: 'players',
          directPath: '/leaderboard/players'
        }
      }
    },
    MARKET: {
      path: 'market/*',
      routes: {
        CARDS: {
          path: 'cards',
          directPath: '/market/cards'
        },
        CARD: {
          path: 'card/:id',
          directPath: '/market/card/:id'
        },
        STICKERS: {
          path: 'stickers',
          directPath: '/market/stickers'
        },
        STICKER: {
          path: 'sticker/:id',
          directPath: '/market/sticker/:id'
        },
        CARDBACKS: {
          path: 'cardbacks',
          directPath: '/market/cardbacks'
        },
        CARDBACK: {
          path: 'cardback/:id',
          directPath: '/market/cardback/:id'
        },
        HEROES: {
          path: 'heroes',
          directPath: '/market/heroes'
        },
        DECKS: {
          path: 'decks',
          directPath: '/market/decks'
        }
      }
    },
    ITEMS: {
      path: 'items/*',
      routes: {
        CARDS: {
          path: 'cards',
          directPath: '/items/cards'
        },
        CARD: {
          path: 'card/:id',
          directPath: '/items/card/:id'
        },
        DECKS: {
          path: 'decks',
          directPath: '/items/decks'
        },
        HEROES: {
          path: 'heroes',
          directPath: '/items/heroes'
        },
        STICKERS: {
          path: 'stickers',
          directPath: '/items/stickers'
        },
        STICKER: {
          path: 'sticker/:id',
          directPath: '/items/sticker/:id'
        },
        CARDBACKS: {
          path: 'cardbacks',
          directPath: '/items/cardbacks'
        },
        CARDBACK: {
          path: 'cardback/:id',
          directPath: '/items/cardback/:id'
        }
      }
    },
    SHOP: {
      path: 'shop',
      directPath: '/shop'
    },
    DECK_BUILDER: {
      path: 'deck-builder/:prism',
      directPath: '/deck-builder/:prism'
    },
    CREATE_DECK: {
      path: 'create-deck',
      directPath: '/create-deck'
    },
    INVITE_FRIENDS: {
      path: 'invite-friends/*',
      directPath: '/invite-friends/*',
      routes: {
        REWARDS: {
          path: 'rewards',
          directPath: '/invite-friends/rewards'
        },
        INVITED: {
          path: 'invited',
          directPath: '/invite-friends/invited'
        }
      }
    },
    ACCOUNT: {
      path: 'account/:address',
      directPath: '/account/:address'
    },
    CREATE_ACCOUNT: {
      path: 'create-account',
      directPath: '/create-account'
    },
    ADMIN: {
      path: 'admin/*',
      routes: {
        COMMUNITY: {
          path: 'community/*',
          routes: {
            BANNERS: {
              path: 'banners',
              directPath: '/admin/community/banners'
            },
            STREAMERS: {
              path: 'streamers',
              directPath: '/admin/community/streamers'
            },
            QUEUES: {
              path: 'queues',
              directPath: '/admin/community/queues'
            },
            NOTIFICATIONS: {
              path: 'notifications',
              directPath: '/admin/community/notifications'
            }
          }
        },
        USERS: {
          path: 'users',
          directPath: '/admin/users'
        },
        USER: {
          path: 'user/:id',
          directPath: '/admin/user/:id'
        },
        MATCHES: {
          path: 'matches',
          directPath: '/admin/matches'
        },
        SIGNALS: {
          path: 'signals',
          directPath: '/admin/signals'
        },
        PENDING_GOLDS: {
          path: 'pending-golds',
          directPath: '/admin/pending-golds'
        }
      }
    },
    SANCTIONS_LIST: {
      path: 'sanctions-list',
      directPath: '/sanctions-list'
    },
    DELETED_ACCOUNT: {
      path: 'deleted-account',
      directPath: '/deleted-account'
    },
    HERO_FEATURE: {
      path: 'hero/:id',
      directPath: '/hero/:id'
    },
    CARDBACK_FEATURE: {
      path: 'cardback/:id',
      directPath: '/cardback/:id'
    },
    QUESTS: {
      path: 'quests/*',
      directPath: '/quests/*',
      routes: {
        DAILY: {
          path: 'daily',
          directPath: '/quests/daily'
        },
        WEEKLY: {
          path: 'weekly',
          directPath: '/quests/weekly'
        },
        SEASONAL: {
          path: 'seasonal',
          directPath: '/quests/seasonal'
        }
      }
    }
  }
}
