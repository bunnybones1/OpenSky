import {
  ReadyFieldTarget,
  Target,
  TutorialConfig
} from '@opensky/shared/tutorialConfig'

import {
  action,
  attack,
  attackWithAllCharacters,
  attackWithAllCharactersExceptIfHeroWouldHitAUnit,
  endTurn,
  message,
  playCard
} from '../helpers'

const MANA_CRYSTAL = '20017'
const manaCrystal = Target.PlayerHandCard(MANA_CRYSTAL)
const SCAREDY_SENTINEL = '30110'
const ZOMBOID_GOON = '30111'
const STOMP = '30127'
const BOUNCER = '30112'
const TREEFOLK_BONDER = '30113'
const GOON_RUNNER = '30114'
const ARMIS_CANNON = '30115'
const GOON_CALL = '30116'
const STONEBARK_TREEFOLK = '30117'
const REAPERBOID = '30118'
const TREEFOLK_CHAMPION = '30126'

const EXTRA_UNCASTABLE = '164'

const STONE_FIST = '30088'

const COLOSSOID = '30119'
const ARMIS_DROPSHIP = '30120'
const GAGGLE_O_GOONS = '30121'
const EARTH_CALL = '30122'
const BARK_ARMOR = '30123'
const CLEAVE = '30124'
const PUMMMEL = '30125'
const HEXED_BEAST = '30129'
const ROOTBORN_ALLIES = '161'

const tutorial: TutorialConfig = {
  title: { translate: 'tutorial:new.title' },
  description: { translate: 'tutorial:new.description' },
  allowTryAgainBeforeRewards: false,
  botArt: '3122',
  botName: 'Gerry the Goon',
  setup: {
    skipMulligan: true,
    rigDeckOrder: true,
    player: {
      heroAbility: '25000',
      startingMana: 1,
      mulliganChoiceSize: 0,
      heroModifiers: [{ SetHealth: 32 }],
      cardsAddedToHandAfterMulligan: [[MANA_CRYSTAL, []]],
      prisms: ['str'],
      deck: [
        SCAREDY_SENTINEL,
        STOMP,
        TREEFOLK_BONDER,
        ARMIS_CANNON,
        STONEBARK_TREEFOLK,
        TREEFOLK_CHAMPION,
        PUMMMEL,
        ARMIS_DROPSHIP,
        EARTH_CALL,
        BARK_ARMOR,
        CLEAVE,
        EXTRA_UNCASTABLE,
        ROOTBORN_ALLIES
      ]
    },
    enemy: {
      heroAbility: '25005',
      mulliganChoiceSize: 0,
      heroModifiers: [{ SetHealth: 32 }],
      prisms: ['hrt'],
      deck: [
        ZOMBOID_GOON,
        BOUNCER,
        GOON_RUNNER,
        GOON_CALL,
        REAPERBOID,
        COLOSSOID,
        GAGGLE_O_GOONS,
        HEXED_BEAST
      ]
    },
    cardWhitelist: []
  },
  introduction: [
    message('', 'tutorial:new.1', {
      source: Target.EnemyHero,
      beforeDelay: 1_000
    }),
    message('', 'tutorial:new.2', {
      position: Target.PlayerHero
    }),
    message('', 'tutorial:new.3', {
      position: Target.PlayerManaVial
    }),
    message('', 'tutorial:new.4', {
      position: Target.PlayerHeroAbility
    })
  ],
  conditions: [],
  turns: [
    // Turn 1
    {
      player: [
        message('', 'tutorial:new.5', {
          position: manaCrystal,
          beforeDelay: 1000
        }),
        action(playCard(manaCrystal)),
        message('', 'tutorial:new.6', {
          position: Target.PlayerHandCard(SCAREDY_SENTINEL)
        }),
        action(playCard(Target.PlayerHandCard(SCAREDY_SENTINEL))),
        message('', 'tutorial:new.7'),
        message('', 'tutorial:new.8'),
        action(attack(Target.PlayerHero, Target.EnemyHero)),
        message('', 'tutorial:new.oi', {
          source: Target.EnemyHero
        }),
        message('', 'tutorial:new.9'),
        action(endTurn())
      ],
      enemy: [
        action(playCard(Target.EnemyHandCard(ZOMBOID_GOON)), {
          successMessage: message('', 'tutorial:new.10', {
            source: Target.EnemyHero
          })
        }),
        action(attack(Target.EnemyHero, Target.PlayerHero)),
        action(endTurn())
      ]
    },
    // turn 2
    {
      player: [
        message('', 'tutorial:new.11', {
          position: Target.PlayerHandCard(STOMP)
        }),
        action(playCard(Target.PlayerHandCard(STOMP), Target.AnyEnemyUnit)),
        action(attackWithAllCharacters()),
        action(endTurn())
      ],
      enemy: [
        action(playCard(Target.EnemyHandCard(BOUNCER)), {
          successMessage: message('', 'tutorial:new.12', {
            source: Target.EnemyHero
          })
        }),
        message('', 'tutorial:new.12-5', {
          source: Target.EnemyHero
        }),
        message('', 'tutorial:new.13', {
          position: Target.EnemyUnit(BOUNCER)
        }),
        action(attack(Target.EnemyHero, Target.PlayerHero)),
        action(endTurn())
      ]
    },
    // turn 3
    {
      player: [
        action(playCard(Target.PlayerHandCard(TREEFOLK_BONDER))),
        message('', 'tutorial:new.14', {
          beforeDelay: 1000,
          position: Target.PlayerUnit(TREEFOLK_BONDER)
        }),
        action(attackWithAllCharacters()),
        action(endTurn())
      ],
      enemy: [
        action(playCard(Target.EnemyHandCard(GOON_RUNNER)), {
          successMessage: message('', 'tutorial:new.15', {
            source: Target.EnemyHero
          })
        }),
        message('', 'tutorial:new.16', {
          beforeDelay: 1200,
          position: Target.EnemyUnit(GOON_RUNNER)
        }),
        action({
          ...attack(
            new ReadyFieldTarget(1, '*'),
            Target.PlayerUnit(SCAREDY_SENTINEL)
          ),
          multi: true
        }),
        action({
          ...attack(new ReadyFieldTarget(1, '*'), Target.PlayerHero),
          multi: true
        }),
        action(endTurn())
      ]
    },
    // turn 4
    {
      player: [
        action(
          playCard(Target.PlayerHandCard(ARMIS_CANNON), Target.AnyEnemyUnit)
        ),
        message('', 'tutorial:new.17'),
        action(attackWithAllCharacters()),
        action(endTurn())
      ],
      enemy: [
        action(playCard(Target.EnemyHandCard(GOON_CALL))),
        action(attackWithAllCharactersExceptIfHeroWouldHitAUnit()),
        action(endTurn())
      ]
    },
    // turn 5
    {
      player: [
        action(playCard(Target.PlayerHandCard(STONEBARK_TREEFOLK))),
        message('', 'tutorial:new.18'),
        action(
          playCard(Target.PlayerAttachedCard(STONE_FIST), Target.AnyPlayerUnit)
        ),
        action(attackWithAllCharacters()),
        action(endTurn())
      ],
      enemy: [
        action(
          playCard(
            Target.EnemyHandCard(REAPERBOID),
            Target.PlayerUnit(STONEBARK_TREEFOLK)
          ),
          {
            successMessage: message('', 'tutorial:new.19', {
              source: Target.EnemyHero
            })
          }
        ),
        action(endTurn())
      ]
    },
    // turn 6
    {
      player: [
        action(playCard(Target.PlayerHandCard(TREEFOLK_CHAMPION))),
        action(
          playCard(Target.PlayerHandCard(PUMMMEL), Target.EnemyUnit(REAPERBOID))
        ),
        action(attackWithAllCharacters()),
        action(endTurn())
      ],
      enemy: [
        action(playCard(Target.EnemyHandCard(COLOSSOID)), {
          successMessage: message('', 'tutorial:new.20', {
            source: Target.EnemyHero
          })
        }),
        action(attackWithAllCharactersExceptIfHeroWouldHitAUnit(), {
          optional: true
        }),
        action(endTurn())
      ]
    },
    // turn 7
    {
      player: [
        action(playCard(Target.PlayerHandCard(ARMIS_DROPSHIP))),
        action(attackWithAllCharacters()),
        action(endTurn())
      ],
      enemy: [
        action(playCard(Target.EnemyHandCard(GAGGLE_O_GOONS)), {
          successMessage: message('', 'tutorial:new.21', {
            source: Target.EnemyHero
          })
        }),
        action(endTurn())
      ]
    },
    // turn 8
    {
      player: [
        action(playCard(Target.PlayerHandCard(EARTH_CALL))),
        action(playCard(Target.PlayerHandCard(CLEAVE))),
        action({
          filter: (_, __, ___, actions) => {
            const nonEndTurnActions = actions.filter(a => a.type !== 'EndTurn')
            return nonEndTurnActions.length === 0
              ? actions.filter(a => a.type === 'EndTurn')
              : nonEndTurnActions
          },
          multi: true
        })
      ],
      enemy: [
        action(playCard(Target.EnemyHandCard(HEXED_BEAST))),
        message('', 'tutorial:new.old_bones', {
          source: Target.EnemyHero
        }),
        action(endTurn())
      ]
    },
    // turn 9
    {
      player: [
        action({
          filter: (_, __, ___, actions) => {
            const nonEndTurnActions = actions.filter(a => a.type !== 'EndTurn')
            return nonEndTurnActions.length === 0
              ? actions.filter(a => a.type === 'EndTurn')
              : nonEndTurnActions
          },
          multi: true
        })
      ],
      // should never get here
      enemy: [action(endTurn())]
    }
  ],
  victory: [
    message('', 'tutorial:new.23', { source: Target.EnemyHero }),
    message('', 'tutorial:new.24')
  ]
}

export default tutorial
