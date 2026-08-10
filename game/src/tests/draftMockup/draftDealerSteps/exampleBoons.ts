import { DraftStateBoon } from '../DraftState'

let boonsLibrary: DraftStateBoon[] | undefined
export function getExampleBoons(reset = false) {
  if (reset) {
    boonsLibrary = undefined
  }
  if (!boonsLibrary) {
    boonsLibrary = [
      new DraftStateBoon('Bargain Master', 'All your cards cost 1 less.'),
      new DraftStateBoon(
        'A Bad Cough',
        'Your hero has wither, but banner has no effect.'
      ),
      new DraftStateBoon(
        'Glass Cannon',
        'If your hero would take damage, take 1 more. If your hero would deal damage, deal 2 more.'
      ),
      new DraftStateBoon(
        'Fromager',
        'If your hero would eat cheese, eat one more.'
      ),
      new DraftStateBoon('All Seeing', 'Your hero can attack stealthed Units.'),
      new DraftStateBoon(
        'Cup of Coffee',
        'Your Hero starts the game with +1 Health'
      ),
      new DraftStateBoon(
        'Big Panini',
        'Your Hero starts the game with +5 Health, but cannot attack on the first turn'
      ),
      new DraftStateBoon(
        'Magic Monicle',
        `Sunrise: reveal one card in your opponent's hand.`
      ),
      new DraftStateBoon(`Beekeeper's Uniform`, 'Sunset: summon a Yellowjack.'),
      new DraftStateBoon(`3D Printer`, 'Sunset: summon a Micron Drone.'),
      new DraftStateBoon(
        'Drink your mana',
        'Sunset: spend your mana to gain that much health.'
      ),
      new DraftStateBoon(
        'Glitchy',
        'Sunset: swap the health and power of a random ally.'
      ),
      new DraftStateBoon(
        'A coupon',
        'At the start of your first turn, give cards in your hand -1 cost.'
      ),
      new DraftStateBoon('Big hands', 'Increase your max hand size by one.'),
      new DraftStateBoon(
        'Greedy',
        'During card selection, you can keep one additional card.'
      ),
      new DraftStateBoon(
        'Magic Goggles',
        'Your hero can attack stealthed units.'
      ),
      new DraftStateBoon(
        'Boon boon boon boon',
        'Sunset: if you have no allies, steal a random enemy unit.'
      ),
      new DraftStateBoon('Barrista', 'All your summoned units get Dash.'),
      new DraftStateBoon(
        'Nec-romance',
        'If you play a unit with a death effect, trigger their death effect.'
      ),
      new DraftStateBoon(
        'Spicey',
        'All your units have +2 power, but get Flames upon summon.'
      ),
      new DraftStateBoon(
        'Berserker',
        'Your Hero has +2 power. Sunrise: Your hero attacks a random opponent.'
      ),
      new DraftStateBoon(
        'Holy Fire',
        'Sunrise: attach Flames to all dark units.'
      ),
      new DraftStateBoon(
        'Sausagefest',
        'At the start of your first turn, fill your hand with Glizzies.'
      ),
      new DraftStateBoon(
        `Mootichi's touch`,
        `{trigger:Inspire Spell:} {Draw} and summon your highest cost unit of that spell's cost or less.`
      ),
      new DraftStateBoon(
        'Death denied',
        'When another non-zomboid ally dies, summon a zomboid.'
      ),
      new DraftStateBoon(
        'Armis bodyguard',
        'At the start of your first turn, summon Armis Guard.'
      ),
      new DraftStateBoon(
        'Tree Trunk Legs',
        'Summoned allies get +3 health and Roots'
      ),
      new DraftStateBoon(
        'Poison Apple',
        'Hero loses 3 health and gets wither.'
      ),
      new DraftStateBoon(
        'Heavy Metal',
        'When an ally is summoned, attach Lead to it.'
      ),
      new DraftStateBoon(
        'Fungivore',
        'When a shroom ally dies, your Hero gains health equal to their cost.'
      )
    ]
  }
  return boonsLibrary
}
