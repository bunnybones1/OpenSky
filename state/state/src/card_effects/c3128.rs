use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let top_most_expensive_dead_unit = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .map(|c| (c.id(), c.base().instance().cost))
          .rev() // so last is top
          .max_by_key(|(_, cost)| *cost)
          .map(|(_, cost)| cost);

        if let Some(cost) = top_most_expensive_dead_unit {
          let drawn_unit = game.draw_into_play(owner, move |c, _| c.cost == cost).await;
          if let Some(drawn_unit) = drawn_unit {
            game
              .modify_card_single(drawn_unit, Modifier::GrantTrait(Trait::Guard))
              .await;
            game.give_spell(drawn_unit, BaseCard::C20019).await;
          }
        }
      })
    },
  }
});
