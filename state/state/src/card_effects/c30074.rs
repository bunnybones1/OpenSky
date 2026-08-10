use super::effect_helpers::*;
use rand::distributions::{Distribution, WeightedIndex};

// Wrapped Gift:
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let mut rng = game.context.random().await;
        let hero = game.hero_id(owner);
        let player_has_light_festival = game
          .reveal_from_card(hero, |c| {
            c.attachment.map_or(false, |a| *a.base() == LIGHT_FESTIVAL)
          })
          .await;
        let (mut gift_is_light_festival, mut gift) = pick_gift(&mut rng);
        // Don't give the player light festival if they already have it!
        while player_has_light_festival && gift_is_light_festival {
          let g = pick_gift(&mut rng);
          gift_is_light_festival = g.0;
          gift = g.1;
        }
        gift(game, owner).await;
        game.dust(my_id).await;
      })
    },
  }
});

// not secrecy-safe, but who cares, it's a joke gamemode.
macro_rules! put_spell_in_hand {
  ($spell:expr) => {
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, $spell).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    }
  };
}

const LIGHT_FESTIVAL: BaseCard = BaseCard::C30073;
type Gift = for<'a> fn(game: &'a mut LiveGame, owner: Player) -> Promisify<'a, ()>;
// (is_light_festival, Gift, chance to get)
const LOOT_TABLE: [(bool, Gift, u8); 30] = [
  (false, put_spell_in_hand!(BaseCard::C30066), 50),
  (false, put_spell_in_hand!(BaseCard::C30068), 3),
  (false, put_spell_in_hand!(BaseCard::C30069), 4),
  (false, put_spell_in_hand!(BaseCard::C30070), 4),
  (false, put_spell_in_hand!(BaseCard::C30071), 3),
  (false, put_spell_in_hand!(BaseCard::C30072), 4),
  (true, put_spell_in_hand!(LIGHT_FESTIVAL), 4),
  (false, put_spell_in_hand!(BaseCard::C30075), 4),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let c = game.create_card(owner, BaseCard::C20038).await;
          game.move_to_zone(c, Zone::Hand { public: false }).await;
        }
      })
    },
    4,
  ),
  (false, put_spell_in_hand!(BaseCard::C30067), 1),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let c = game.create_card(owner, BaseCard::C30074).await;
          set_to_random_element(game, c).await;
          game.move_to_zone(c, Zone::Hand { public: false }).await;
        }
      })
    },
    1,
  ),
  (false, put_spell_in_hand!(BaseCard::C20029), 1),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        for base in &[BaseCard::C3010, BaseCard::C4015] {
          let c = game.create_card(owner, *base).await;
          game.berf(c, 4, 4).await;
          game.move_to_zone(c, Zone::Hand { public: false }).await;
        }
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        for base in &[BaseCard::C1070, BaseCard::C1054] {
          let c = game.create_card(owner, *base).await;
          game.berf(c, 4, 4).await;
          game.move_to_zone(c, Zone::Hand { public: false }).await;
        }
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C22).await;
        game.give_spell(c, BaseCard::C99).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        for base in &[BaseCard::C20003, BaseCard::C20000] {
          let c = game.create_card(owner, *base).await;
          game.move_to_zone(c, Zone::Hand { public: false }).await;
        }
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C2011).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;

        let c = game.create_card(owner, BaseCard::C3148).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C2034).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C20018).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let c = game.create_card(owner, BaseCard::C4049).await;
          game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
          game.move_to_zone(c, Zone::Hand { public: false }).await;
        }
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C3063).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C3045).await;
        game.modify_card(c, vec![Modifier::SetCost(3.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C4018).await;
        game.modify_card(c, vec![Modifier::SetCost(4.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
        let c = game.create_card(owner, BaseCard::C2097).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C4099).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C59).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C1096).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;

        let c = game.create_card(owner, BaseCard::C20011).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (false, put_spell_in_hand!(BaseCard::C1001), 1),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C4070).await;
        game.modify_card(c, vec![Modifier::SetCost(1.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C4042).await;
        game.berf(c, 4, 4).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
  (
    false,
    |game, owner| {
      Box::pin(async move {
        let c = game.create_card(owner, BaseCard::C77).await;
        game.modify_card(c, vec![Modifier::SetCost(3.into())]).await;
        game.move_to_zone(c, Zone::Hand { public: false }).await;
      })
    },
    1,
  ),
];

fn pick_gift(rng: &mut dyn rand::RngCore) -> (bool, Gift) {
  let distribution = WeightedIndex::new(LOOT_TABLE.iter().map(|item| item.2)).unwrap();
  let item = LOOT_TABLE[distribution.sample(rng)];
  (item.0, item.1)
}

const ELEMENTS: [Element; 8] = {
  use Element::*;
  [Light, Mind, Fire, Air, Water, Earth, Metal, Dark]
};

pub fn set_to_random_element<'a>(game: &'a mut LiveGame, card: InstanceID) -> Promisify<'a, ()> {
  Box::pin(async move {
    let mut rng = game.context.random().await;
    let element = ELEMENTS.choose(&mut rng).unwrap();
    game
      .modify_card(card, vec![Modifier::SetElement(*element)])
      .await;
  })
}
