# Hero Abilities

A Hero Ability is a special spell that the player has available to use in addition to their [Hand](../../activities/matches/zones/hand.md).

There are many kinds of Hero Abilities.

It can be passive like an [aura](./properties/card-effects/auras.md).

If it has [charges](#charges) and a [mana cost](../../item-types/cards/properties/mana-cost.md), it can be cast like a [spell](./basic-spells.md).

It can have a [Counter](#counter), which can be referenced in the card effect. i.e. `Sunset, increase the counter by one. If the counter is 5, your hero gains 1 max mana and the counter is reset to 0`

It can have a [trigger](../cards/properties/card-effects/triggers.md).


## Charges

Charges signify that a Hero Ability can be cast. Each time the Hero Ability is cast, the charges decrease, unless they're infinite. A hero ability with 0 charges cannot be cast again.

## Counter

A counter has a capacity, an increment trigger, and an effect when it reaches the capacity (as well as resetting to zero)