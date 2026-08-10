use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      let revealed_cards: Vec<_> = game
        .player_cards(enemy(owner))
        .hand()
        .clone()
        .into_iter()
        .flatten()
        .collect();
      for spell in revealed_cards {
        game
          .add_aura_modifier(spell, my_id, Modifier::ModifyCost(1), 0)
          .await;
      }
    }),
    AuraLayer::IncreaseCost
  )
  .into()],
  on_play: None
});
