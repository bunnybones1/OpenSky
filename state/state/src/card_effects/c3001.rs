use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let cards: Vec<Card> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit() && c.base().instance().cost == 1)
          .map(|c| c.id().into())
          .collect();

        // Move graveyard cards back to deck
        game.move_to_zone_many(cards, Zone::Deck).await;

        // Draw 2 {1c} units
        for _ in 0..2 {
          game.draw(owner, |c, _| c.cost == 1 && c.is_unit()).await;
        }
      })
    },
  }
});
