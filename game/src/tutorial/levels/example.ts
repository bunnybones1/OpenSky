import { Target, TutorialConfig } from '@opensky/shared/tutorialConfig'

import {
  action,
  all_of,
  any_of,
  attack,
  cardIsInGrave,
  characterIsCondition,
  linkedConditions,
  nonTranslatedMessage,
  not,
  playCard,
  turnsPassed,
  unitIsExhausted,
  unitIsInPlay
} from '../helpers'

// XXX Testing empty state

const tutorial: TutorialConfig = {
  title: 'Tutorial 0: Tests',
  description: 'Empty tutorial to use for test scenerios',
  allowTryAgainBeforeRewards: true,
  setup: {
    skipFirstTurnStart: true,
    skipMulligan: true,
    rigDeckOrder: true,
    player: {
      mulliganChoiceSize: 4,
      heroModifiers: [{ SetHealth: 20 }],
      prisms: ['str'],
      deck: [
        {
          base: '30000',
          attachment: undefined,
          modifiers: [
            {
              ModifyHealth: [100, undefined]
            }
          ]
        }, // Claw Bear
        '30008', // Shelly
        '30009', // The Beast
        '30010', // Colossoid
        '30011', // Honor Guard
        '30012', // Nomad
        '30013', // Stink Eye
        '30014', // El Monstruo
        '30015', // Sidekick
        '30016', // Geod
        '30017', // Polar Bear
        '30018', // Ember Wolf
        '30019', // Mad Ronin
        '30020', // Olifant
        '30021' // Wicked Twister
      ],
      field: [
        {
          base: '2028',
          attachment: {
            override: [
              '20022',
              [
                {
                  ModifyCost: 5
                }
              ]
            ]
          },
          // unit modifiers
          modifiers: [
            {
              ModifyHealth: [10, undefined]
            },
            {
              ModifyPower: [99, undefined]
            }
          ]
        },
        {
          base: '2073',
          attachment: 'remove',
          modifiers: [
            {
              SetAttackState: 'Ready'
            }
          ]
        }
      ]
    },
    enemy: {
      mulliganChoiceSize: 4,
      heroModifiers: [{ SetHealth: 15 }],
      prisms: ['str'],
      deck: [
        '1053', // Cube jr
        '30006', // Uncastable
        '30006', // Uncastable
        '30021', // Wicked Twister
        '30006', // Uncastable
        '30020', // Olifant
        '30006', // Uncastable
        '30018', // Ember Wolf
        '30012', // Nomad
        '30011', // Honor Guard
        '30009', // The Beast
        '30019', // Mad Ronin
        '30013', // Stink Eye
        '30000', // Claw Bear
        '30017' // Polar Bear
      ],
      field: [
        {
          base: '20013',
          attachment: undefined,
          modifiers: []
        },
        {
          base: '20013',
          attachment: undefined,
          modifiers: []
        },
        {
          base: '20013',
          attachment: undefined,
          modifiers: []
        },
        {
          base: '20013',
          attachment: undefined,
          modifiers: []
        }
      ]
    }
  },
  turns: [
    {
      player: [
        // force the player to attack.
        action(attack(Target.PlayerHero, Target.EnemyHero), {
          successMessage: {
            type: 'message',
            text: 'appears second when player attacks'
          }
        }),
        nonTranslatedMessage(undefined, 'test message', {
          position: Target.Home,
          duration: 5000
        }),
        nonTranslatedMessage(
          undefined,
          'test message targeted\non non-existant unit',
          {
            position: Target.PlayerUnit('90'),
            duration: 5000
          }
        )
      ],
      enemy: []
    }
  ],
  gameEndConditions: {
    description:
      'Play Claw Bear and attack with your hero to win.\nAttack with Fuji, let Fuji die, lose hero HP, or end your turn to lose.',
    winCondition: all_of(
      unitIsInPlay(Target.PlayerUnit('30000')),
      unitIsExhausted(Target.PlayerHero)
    ),
    loseCondition: any_of(
      unitIsExhausted(Target.PlayerUnit('2073')),
      cardIsInGrave(Target.PlayerGraveCard('2073')),
      characterIsCondition(Target.PlayerHero, c => c.state.view.health < 20),
      turnsPassed(0),
      not(() => true)
    )
  },
  conditions: [
    // playCard(Target.PlayerCard('30030'), undefined, {
    //   successMessage: [
    //     message('03-06-01', 'That Sword symbol is a Glory Effect!'),
    //     message('03-06-02', 'It will activate when this unit attacks a hero,'),
    //     message('03-06-03', 'and successfully damages them.')
    //   ]
    // }),
    ...linkedConditions(
      [
        attack(Target.PlayerHero, Target.EnemyHero),
        attack(Target.EnemyHero, Target.PlayerHero)
      ],
      [
        nonTranslatedMessage(
          '03-14-01',
          'activated success, this should only appear once.'
        )
      ]
    ),
    playCard(Target.EnemyHandCard('1053'), undefined, {
      successMessage: [
        nonTranslatedMessage(
          '04-13-01',
          'This character has the Barrier enchant!',
          {
            showPopup: {
              target: Target.EnemyAttachedCard('20053'),
              direction: 'left'
            },
            beforeDelay: 2000,
            position: Target.EnemyUnit('30060')
          }
        ),
        nonTranslatedMessage(
          '04-13-02',
          'It will prevent the first noncombat damage...',
          {
            showPopup: {
              target: Target.EnemyAttachedCard('20053'),
              direction: 'right'
            },
            position: Target.EnemyUnit('30060')
          }
        ),
        nonTranslatedMessage(
          '04-13-03',
          'the character takes from a spell or unit effect,',
          {
            showPopup: {
              target: Target.EnemyAttachedCard('20053'),
              direction: 'left'
            },
            position: Target.EnemyUnit('30060')
          }
        ),
        nonTranslatedMessage(
          '04-13-04',
          'and then the Barrier will be dusted.',
          {
            showPopup: {
              target: Target.EnemyAttachedCard('20053'),
              direction: 'right'
            },
            position: Target.EnemyUnit('30060')
          }
        )
      ]
    })
  ]
}

export default tutorial
