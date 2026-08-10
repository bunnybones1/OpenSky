use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        // NOTE: @Jon: > I'd prefer the copies as base with +2/+2.
        // > Maybe I need to go back to using that language in the card text.

        let ally_unit_bases: Vec<_> = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .map(|unit| *unit.base())
          .collect();
        for base in ally_unit_bases {
          let id = game.create_card(owner, base).await;
          game.berf(id, 2, 2).await;
          game.give_spell(id, enchant::LEAD).await;
          game.move_to_zone(id, Zone::Deck).await;
        }
        game.draw(owner, |c, _| c.is_unit()).await;
      })
    },
  }
});
