use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let dead_water_units: Vec<_> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| {
            c.base().instance().cost >= 1 && c.base().instance().element == Element::Water
          })
          .map_into()
          .collect();
        game.move_to_zone_many(dead_water_units, Zone::Deck).await;
        for _ in 0..8 {
          game.draw(owner, |c, _| c.element == Element::Water).await;
        }
        game.dust(my_id).await;
      })
    }
  }
});
